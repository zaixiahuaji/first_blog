<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { formatTelemetryEntry, useTelemetryStore } from '@/stores/telemetry'
import { useCategoriesStore } from '@/stores/categories'
import { usePostsStore } from '@/stores/posts'

type ExportState = 'idle' | 'done' | 'error'

const telemetryStore = useTelemetryStore()
const { entries } = storeToRefs(telemetryStore)

const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()
const { activeCategories } = storeToRefs(categoriesStore)

const exportingKey = ref<string | null>(null)
const exportStates = ref<Record<string, ExportState>>({})

const nowIso = () => new Date().toISOString()

const timestampForFilename = (date = new Date()) => {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const pad3 = (n: number) => String(n).padStart(3, '0')
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(
    date.getMinutes(),
  )}${pad2(date.getSeconds())}${pad3(date.getMilliseconds())}`
}

const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })

const kindLabel = (kind: 'ui' | 'network' | 'error') => {
  if (kind === 'network') return '网络'
  if (kind === 'ui') return '交互'
  return '错误'
}

const getLogStats = () => {
  const all = entries.value
  const startedAt = all[0]?.ts ?? Date.now()
  const endedAt = all[all.length - 1]?.ts ?? startedAt

  const networkEntries = all.filter((e) => e.kind === 'network') as Array<{ ok: boolean }>
  const okCount = networkEntries.filter((e) => e.ok).length
  const failCount = networkEntries.filter((e) => !e.ok).length
  const errorCount = all.filter((e) => e.kind === 'error').length

  const language = typeof navigator !== 'undefined' ? navigator.language : 'unknown'
  const timeZone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown'
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'

  return { startedAt, endedAt, okCount, failCount, errorCount, language, timeZone, userAgent }
}

const buildSessionLogsMd = (mode: 'full' | 'summary') => {
  const stats = getLogStats()
  const all = entries.value
  const listed = mode === 'summary' ? all.slice(-30) : all

  const lines: string[] = []
  lines.push(mode === 'summary' ? '# 本次会话日志摘要' : '# 本次会话完整日志')
  lines.push('')

  if (mode !== 'summary') {
    lines.push(`- 导出时间: ${nowIso()}`)
  }

  lines.push(
    `- 时间范围: ${new Date(stats.startedAt).toISOString()} 至 ${new Date(stats.endedAt).toISOString()}`,
  )
  lines.push(`- 网络: 成功 ${stats.okCount} / 失败 ${stats.failCount}`)
  lines.push(`- 错误: ${stats.errorCount}`)
  lines.push(`- 语言: ${stats.language}`)
  lines.push(`- 时区: ${stats.timeZone}`)
  lines.push(`- UA: ${stats.userAgent}`)
  lines.push('')
  lines.push(mode === 'summary' ? '## 最近记录' : '## 全量记录')

  if (listed.length === 0) {
    lines.push('- （空）')
    lines.push('')
    return lines.join('\n')
  }

  for (const entry of listed) {
    lines.push(
      mode === 'summary'
        ? `- [${formatTime(entry.ts)}] ${formatTelemetryEntry(entry)}`
        : `- [${formatTime(entry.ts)}] [${kindLabel(entry.kind)}] ${formatTelemetryEntry(entry)}`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

const postsIndexJson = computed(() => {
  const exportedPosts = postsStore.posts.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    date: p.date,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }))

  return {
    generatedAt: nowIso(),
    scope: {
      source: 'client-session',
      loadedCount: exportedPosts.length,
      reportedTotal: postsStore.total,
      filter: postsStore.filter,
      searchMode: postsStore.searchMode,
      searchQueryLength: postsStore.searchQuery.length,
    },
    categories: activeCategories.value.map((c) => ({
      slug: c.slug,
      name: c.name,
      color: c.color,
      sortOrder: c.sortOrder,
    })),
    items: exportedPosts,
  }
})

const categoriesJson = computed(() => ({
  generatedAt: nowIso(),
  scope: { source: 'client-session', loadedCount: activeCategories.value.length },
  items: activeCategories.value.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    color: c.color,
    sortOrder: c.sortOrder,
  })),
}))

type ExportItem = {
  key: string
  label: string
  description: string
  typeLabel: string
  filename: () => string
  build: () => Blob
}

const exportItems = computed<ExportItem[]>(() => [
  {
    key: 'session-logs-full',
    label: '本次会话日志（完整）',
    description: `包含全部日志（最多 ${entries.value.length}/200 条），仅 md。`,
    typeLabel: 'MD',
    filename: () => `huaji-session-logs-${timestampForFilename()}.md`,
    build: () => new Blob([buildSessionLogsMd('full')], { type: 'text/markdown;charset=utf-8' }),
  },
  {
    key: 'session-logs-summary',
    label: '本次会话日志（摘要）',
    description: '与「复制摘要」一致：摘要头部 + 最近 30 条日志。',
    typeLabel: 'MD',
    filename: () => `huaji-session-summary-${timestampForFilename()}.md`,
    build: () => new Blob([buildSessionLogsMd('summary')], { type: 'text/markdown;charset=utf-8' }),
  },
  {
    key: 'posts-index',
    label: '文章索引（当前已加载）',
    description: `仅导出目录字段（不含正文/username/excerpt），共 ${postsStore.posts.length} 条。`,
    typeLabel: 'JSON',
    filename: () => `huaji-posts-index-${timestampForFilename()}.json`,
    build: () =>
      new Blob([JSON.stringify(postsIndexJson.value, null, 2)], { type: 'application/json;charset=utf-8' }),
  },
  {
    key: 'categories',
    label: '类别目录（当前已加载）',
    description: `导出启用类别列表，共 ${activeCategories.value.length} 条。`,
    typeLabel: 'JSON',
    filename: () => `huaji-categories-${timestampForFilename()}.json`,
    build: () =>
      new Blob([JSON.stringify(categoriesJson.value, null, 2)], { type: 'application/json;charset=utf-8' }),
  },
])

const exportFile = (item: ExportItem) => {
  if (exportingKey.value) return
  exportingKey.value = item.key
  exportStates.value[item.key] = 'idle'

  try {
    const filename = item.filename()
    const blob = item.build()
    downloadBlob(filename, blob)
    exportStates.value[item.key] = 'done'
    telemetryStore.logUi('DOWNLOAD_EXPORT', `${filename} | bytes=${blob.size}`)
  } catch {
    exportStates.value[item.key] = 'error'
    telemetryStore.logUi('DOWNLOAD_EXPORT', `${item.key} | FAILED`)
  } finally {
    exportingKey.value = null
  }
}
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30]">导出中心</h2>

    <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-4 md:p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="text-xs font-bold uppercase tracking-widest text-[#999]">EXPORT</div>
          <p class="mt-2 font-vt323 text-[#666] leading-6">
            所有导出仅基于“本次会话”已加载的数据（刷新页面会清空日志与导出上下文）。
          </p>
        </div>
        <div class="text-xs font-bold text-[#2d2d30] border-2 border-[#2d2d30] px-3 py-2 bg-white">
          LOG: {{ entries.length }}/200 · POSTS: {{ postsStore.posts.length }}/{{ postsStore.total }} · CAT:
          {{ activeCategories.length }}
        </div>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-4">
      <div
        v-for="item in exportItems"
        :key="item.key"
        class="flex items-center justify-between border-2 border-[#ccc] p-4 hover:border-[#ff8800] bg-[#f9f9fa] group transition-colors"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 bg-[#2d2d30] text-white flex items-center justify-center font-bold text-xs"
          >
            {{ item.typeLabel }}
          </div>
          <div>
            <div class="font-bold text-[#2d2d30] group-hover:text-[#ff8800]">{{ item.label }}</div>
            <div class="text-xs font-vt323 text-[#666]">{{ item.description }}</div>
            <div
              v-if="exportStates[item.key] === 'done'"
              class="text-[10px] font-bold text-[#00cc7a] mt-1"
            >
              已导出（请检查浏览器下载）
            </div>
            <div
              v-else-if="exportStates[item.key] === 'error'"
              class="text-[10px] font-bold text-[#e62e2e] mt-1"
            >
              导出失败
            </div>
          </div>
        </div>
        <button
          type="button"
          class="px-4 py-2 border-2 border-[#2d2d30] text-xs font-bold uppercase hover:bg-[#2d2d30] hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#2d2d30]"
          :disabled="exportingKey !== null"
          @click="exportFile(item)"
        >
          {{ exportingKey === item.key ? '生成中...' : '下载' }}
        </button>
      </div>
    </div>

    <div class="mt-6 border-2 border-[#2d2d30] bg-[#2d2d30] p-4 text-[#00ff00] font-vt323">
      <div class="flex items-center justify-between text-xs text-white/70 font-bold uppercase">
        <span>EXPORT_STATUS</span>
        <span class="text-[#00ff00]">{{ exportingKey ? 'BUSY' : 'READY' }}</span>
      </div>
      <div class="mt-3 text-xs text-white/70 font-sharetech">
        FILE_NAME: <span class="text-[#00ff00]">huaji-*</span> · FORMAT:
        <span class="text-[#00ff00]">md/json</span> · SCOPE:
        <span class="text-[#00ff00]">client-session</span>
      </div>
    </div>
  </section>
</template>
