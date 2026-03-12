import { writeFile } from 'node:fs/promises';

const feeds = [
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', tag: 'OpenAI' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss.xml', tag: 'Anthropic' },
  { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/', tag: 'Google' },
  { name: 'Microsoft AI', url: 'https://blogs.microsoft.com/blog/tag/ai/feed/', tag: 'Microsoft' },
  { name: 'NVIDIA AI', url: 'https://blogs.nvidia.com/blog/category/artificial-intelligence/feed/', tag: 'NVIDIA' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', tag: 'Hugging Face' },
  { name: 'OpenClaw Releases', url: 'https://github.com/openclaw/openclaw/releases.atom', tag: 'OpenClaw' }
];

const decode = (s = '') => s
  .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const pick = (block, patterns) => {
  for (const p of patterns) {
    const m = block.match(p);
    if (m?.[1]) return decode(m[1]);
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
      link: decode(linkMatch?.[1] || ''),
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
    const xml = await res.text();
    if (!res.ok) continue;
    const parsed = xml.includes('<rss') ? parseRss(xml, feed.name, feed.tag) : parseAtom(xml, feed.name, feed.tag);
    all.push(...parsed.filter((x) => x.title && x.link));
  } catch {}
}

const unique = [];
const seen = new Set();
for (const n of all) {
  const key = n.link || n.title;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(n);
}

unique.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
const top10 = unique.slice(0, 10).map((n, i) => ({ id: i + 1, ...n }));

await writeFile(
  new URL('../src/data/news.json', import.meta.url),
  JSON.stringify({ generatedAt: new Date().toISOString(), items: top10 }, null, 2),
  'utf8'
);

console.log(`Generated ${top10.length} items`);
