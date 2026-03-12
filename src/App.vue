<script setup>
import { computed, ref } from 'vue'
import NewsCard from './components/NewsCard.vue'
import news from './data/news.json'

const filter = ref('all')
const query = ref('')

const fmtDate = (d) => {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '未知時間'
  return date.toLocaleString('zh-TW', { hour12: false })
}

const chips = computed(() => {
  const tags = Array.from(new Set((news.items || []).map((x) => x.tag).filter(Boolean)))
  return ['all', ...tags]
})

const items = computed(() => {
  const base = filter.value === 'all'
    ? news.items
    : news.items.filter((x) => x.tag === filter.value)

  const q = query.value.trim().toLowerCase()
  if (!q) return base

  return base.filter((x) => [x.titleZh, x.title, x.summaryZh, x.summary, x.source, x.tag]
    .join(' ')
    .toLowerCase()
    .includes(q))
})

const stats = computed(() => {
  const total = news.items.length
  const openclaw = news.items.filter((x) => x.tag === 'OpenClaw').length
  return { total, openclaw }
})
</script>

<template>
  <header class="top">
    <h1>AI News Wire</h1>
    <p>最新 AI 與 OpenClaw 動態整合站（Vue 版）</p>
    <div id="meta">資料筆數：{{ news.items.length }}｜更新時間：{{ fmtDate(news.generatedAt) }}</div>
  </header>

  <main>
    <section class="topActions">
      <a class="videoBtn" href="./videos.html">🎬 影片專區</a>
    </section>

    <section class="statusPanel">
      <div><strong>總新聞：</strong>{{ stats.total }} 則</div>
      <div><strong>OpenClaw：</strong>{{ stats.openclaw }} 則</div>
      <div><strong>目前顯示：</strong>{{ items.length }} 則</div>
    </section>

    <section class="toolbar">
      <input v-model="query" class="search" placeholder="搜尋標題、摘要、來源..." />
      <button
        v-for="c in chips"
        :key="c"
        class="chip"
        :class="{ active: filter === c }"
        @click="filter = c"
      >
        {{ c === 'all' ? '全部' : c }}
      </button>
    </section>

    <section class="grid">
      <NewsCard v-for="n in items" :key="n.id + n.link" :item="n" />
    </section>
  </main>
</template>
