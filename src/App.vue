<script setup>
import { computed, ref } from 'vue'
import NewsCard from './components/NewsCard.vue'
import news from './data/news.json'

const filter = ref('all')
const chips = ['all', 'OpenClaw', 'OpenAI', 'Anthropic', 'Google']

const fmtDate = (d) => {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '未知時間'
  return date.toLocaleString('zh-TW', { hour12: false })
}

const items = computed(() =>
  filter.value === 'all' ? news.items : news.items.filter((x) => x.tag === filter.value)
)
</script>

<template>
  <header class="top">
    <h1>AI News Wire</h1>
    <p>最新 AI 與 OpenClaw 動態整合站（Vue 版 V1）</p>
    <div id="meta">資料筆數：{{ news.items.length }}｜更新時間：{{ fmtDate(news.generatedAt) }}</div>
  </header>

  <main>
    <section class="topActions">
      <a class="videoBtn" href="./videos.html">🎬 影片專區</a>
    </section>

    <section class="toolbar">
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
