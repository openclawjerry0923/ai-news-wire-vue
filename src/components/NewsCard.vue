<script setup>
defineProps({ item: Object })

const fmtDate = (d) => {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '未知時間'
  return date.toLocaleString('zh-TW', { hour12: false })
}

const short = (txt = '') => {
  const t = String(txt).replace(/\s+/g, ' ').trim()
  return t.length > 140 ? `${t.slice(0, 140)}...` : t || '（暫無摘要）'
}
</script>

<template>
  <article class="card">
    <div class="row">
      <span class="tag">{{ item.tag }}</span>
      <time>{{ fmtDate(item.publishedAt) }}</time>
    </div>
    <h3>{{ item.title }}</h3>
    <p class="summary">{{ short(item.summary) }}</p>
    <div class="row end">
      <span class="source">{{ item.source }}</span>
      <a :href="item.link" target="_blank" rel="noopener">閱讀原文</a>
    </div>
  </article>
</template>
