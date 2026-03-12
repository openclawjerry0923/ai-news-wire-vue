import { writeFile } from 'node:fs/promises';
import iconv from 'iconv-lite';

const feeds = [
  { name: 'OpenClaw Releases', url: 'https://github.com/openclaw/openclaw/releases.atom', tag: 'OpenClaw' },
  { name: 'OpenClaw Commits', url: 'https://github.com/openclaw/openclaw/commits/main.atom', tag: 'OpenClaw' },
  { name: 'OpenClaw Docs', url: 'https://docs.openclaw.ai/rss.xml', tag: 'OpenClaw' },
  { name: 'INSIDE', url: 'https://www.inside.com.tw/feed', tag: '繁中' },
  { name: 'TechNews', url: 'https://technews.tw/feed/', tag: '繁中' },
  { name: 'iThome', url: 'https://www.ithome.com.tw/rss', tag: '繁中' },
  { name: '數位時代', url: 'https://www.bnext.com.tw/rss', tag: '繁中' }
];

const decodeText = (buf, contentType = '') => {
  const ct = String(contentType).toLowerCase();
  const m = ct.match(/charset=([^;\s]+)/i);
  const charset = (m?.[1] || 'utf-8').toLowerCase();
  if (charset.includes('utf')) return Buffer.from(buf).toString('utf8');
  try {
    if (iconv.encodingExists(charset)) return iconv.decode(Buffer.from(buf), charset);
  } catch {}
  for (const enc of ['big5', 'cp950']) {
    try { return iconv.decode(Buffer.from(buf), enc); } catch {}
  }
  return Buffer.from(buf).toString('utf8');
};

const clean = (s = '') => s
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const zhMap = [
  [/docs?/gi, '文件'],
  [/release/gi, '版本發布'],
  [/releases/gi, '版本發布'],
  [/commit(s)?/gi, '提交'],
  [/gateway/gi, 'Gateway'],
  [/security/gi, '安全'],
  [/fix(es|ed)?/gi, '修正'],
  [/feat(ure)?/gi, '新功能'],
  [/model(s)?/gi, '模型'],
  [/memory/gi, '記憶'],
  [/cron/gi, '排程'],
  [/telegram/gi, 'Telegram'],
  [/discord/gi, 'Discord'],
  [/openclaw/gi, 'OpenClaw']
];

const toZh = (text = '') => {
  let t = String(text);
  for (const [re, rep] of zhMap) t = t.replace(re, rep);
  return t;
};

const localizeOpenClaw = (item) => {
  if (item.tag !== 'OpenClaw') return item;
  let titleZh = '';
  if (/openclaw\s+\d{4}/i.test(item.title)) {
    titleZh = `OpenClaw 版本更新：${item.title.replace(/openclaw\s*/i, '')}`;
  } else if (/docs?/i.test(item.title)) {
    titleZh = `OpenClaw 文件更新：${toZh(item.title)}`;
  } else if (/commit/i.test(item.source)) {
    titleZh = `OpenClaw 程式碼更新：${toZh(item.title)}`;
  } else {
    titleZh = `OpenClaw 最新動態：${toZh(item.title)}`;
  }

  const summaryZh = item.summary
    ? `重點：${toZh(item.summary).slice(0, 120)}...`
    : '重點：OpenClaw 官方更新，建議點擊原文查看完整變更內容。';

  return { ...item, titleZh, summaryZh };
};

const pick = (block, patterns) => {
  for (const p of patterns) {
    const m = block.match(p);
    if (m?.[1]) return clean(m[1]);
  }
  return '';
};

function parseRss(xml, source, tag) {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].map((m) => m[0]);
  return items.map((item) => ({
    title: pick(item, [/<title>([\s\S]*?)<\/title>/i]),
    link: pick(item, [/<link>([\s\S]*?)<\/link>/i]),
    publishedAt: pick(item, [/<pubDate>([\s\S]*?)<\/pubDate>/i, /<dc:date>([\s\S]*?)<\/dc:date>/i]),
    summary: pick(item, [/<description>([\s\S]*?)<\/description>/i, /<content:encoded>([\s\S]*?)<\/content:encoded>/i]),
    source,
    tag
  }));
}

function parseAtom(xml, source, tag) {
  const entries = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/g)].map((m) => m[0]);
  return entries.map((entry) => {
    const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/i);
    return {
      title: pick(entry, [/<title[^>]*>([\s\S]*?)<\/title>/i]),
      link: clean(linkMatch?.[1] || ''),
      publishedAt: pick(entry, [/<updated>([\s\S]*?)<\/updated>/i, /<published>([\s\S]*?)<\/published>/i]),
      summary: pick(entry, [/<summary[^>]*>([\s\S]*?)<\/summary>/i, /<content[^>]*>([\s\S]*?)<\/content>/i]),
      source,
      tag
    };
  });
}

const all = [];
for (const feed of feeds) {
  try {
    const res = await fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const ab = await res.arrayBuffer();
    if (!res.ok) continue;
    const xml = decodeText(ab, res.headers.get('content-type'));
    const parsed = xml.includes('<rss') ? parseRss(xml, feed.name, feed.tag) : parseAtom(xml, feed.name, feed.tag);
    all.push(...parsed.filter((x) => x.title && x.link));
  } catch {}
}

const seen = new Set();
const unique = all.filter((n) => {
  const key = n.link || n.title;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

unique.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

const openclaw = unique.filter((x) => x.tag === 'OpenClaw').slice(0, 4);
const chinese = unique.filter((x) => x.tag !== 'OpenClaw').slice(0, 6);
const merged = [...openclaw, ...chinese]
  .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
  .slice(0, 10)
  .map((n, i) => ({ id: i + 1, ...localizeOpenClaw(n) }));

await writeFile(new URL('../src/data/news.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), items: merged }, null, 2), 'utf8');
console.log(`Generated ${merged.length} items; OpenClaw=${openclaw.length}`);
