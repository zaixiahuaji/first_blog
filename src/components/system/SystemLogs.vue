<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { formatTelemetryEntry, useTelemetryStore } from '@/stores/telemetry'

type LogFilter = 'all' | 'network' | 'error'

const telemetryStore = useTelemetryStore()
const { entries } = storeToRefs(telemetryStore)

const filter = ref<LogFilter>('all')
const paused = ref(false)
const copied = ref(false)

const scroller = ref<HTMLElement | null>(null)

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })

const filteredEntries = computed(() => {
  if (filter.value === 'all') return entries.value
  return entries.value.filter((entry) => entry.kind === filter.value)
})

watch(
  () => filteredEntries.value.length,
  async () => {
    if (paused.value) return
    await nextTick()
    const el = scroller.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  },
)

const clearLogs = () => telemetryStore.clear()
const togglePaused = () => {
  paused.value = !paused.value
}

const kindLabel = (kind: 'ui' | 'network' | 'error') => {
  if (kind === 'network') return '网络'
  if (kind === 'ui') return '交互'
  return '错误'
}

const getSummaryStats = () => {
  const all = entries.value
  const startedAt = all[0]?.ts ?? Date.now()
  const endedAt = all[all.length - 1]?.ts ?? startedAt

  const networkEntries = all.filter((e) => e.kind === 'network') as Array<{
    ok: boolean
    durationMs: number
    failureType?: string
    ts: number
  }>

  const okCount = networkEntries.filter((e) => e.ok).length
  const failCount = networkEntries.filter((e) => !e.ok).length
  const errorCount = all.filter((e) => e.kind === 'error').length

  const language = typeof navigator !== 'undefined' ? navigator.language : 'unknown'
  const timeZone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown'
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'

  const recent = all.slice(-30)

  return {
    startedAt,
    endedAt,
    okCount,
    failCount,
    errorCount,
    language,
    timeZone,
    userAgent,
    recent,
  }
}

type SummaryStats = ReturnType<typeof getSummaryStats>

const buildSummary = (stats: SummaryStats) => {
  const lines: string[] = []
  lines.push('# 本次会话日志摘要')
  lines.push('')
  lines.push(
    `- 时间范围: ${new Date(stats.startedAt).toISOString()} 至 ${new Date(stats.endedAt).toISOString()}`,
  )
  lines.push(`- 网络: 成功 ${stats.okCount} / 失败 ${stats.failCount}`)
  lines.push(`- 错误: ${stats.errorCount}`)
  lines.push(`- 语言: ${stats.language}`)
  lines.push(`- 时区: ${stats.timeZone}`)
  lines.push(`- UA: ${stats.userAgent}`)
  lines.push('')
  lines.push('## 最近记录')
  for (const entry of stats.recent) {
    lines.push(`- [${formatTime(entry.ts)}] ${formatTelemetryEntry(entry)}`)
  }
  lines.push('')

  return lines.join('\n')
}

const logSummaryToLogs = (stats: SummaryStats) => {
  telemetryStore.logUi('COPY_SUMMARY', '已复制摘要到剪贴板')
  telemetryStore.logUi(
    'COPY_SUMMARY',
    `时间范围: ${new Date(stats.startedAt).toISOString()} 至 ${new Date(stats.endedAt).toISOString()}`,
  )
  telemetryStore.logUi('COPY_SUMMARY', `网络: 成功 ${stats.okCount} / 失败 ${stats.failCount}`)
  telemetryStore.logUi('COPY_SUMMARY', `错误: ${stats.errorCount}`)
  telemetryStore.logUi('COPY_SUMMARY', `语言: ${stats.language}`)
  telemetryStore.logUi('COPY_SUMMARY', `时区: ${stats.timeZone}`)
  telemetryStore.logUi('COPY_SUMMARY', `UA: ${stats.userAgent}`)
}

let copyTimer: number | undefined
onBeforeUnmount(() => {
  if (copyTimer) window.clearTimeout(copyTimer)
})

const copySummary = async () => {
  const stats = getSummaryStats()
  const text = buildSummary(stats)

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  logSummaryToLogs(stats)
  copied.value = true
  if (copyTimer) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-[#2d2d30] p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto text-green-500 font-vt323"
  >
    <h2 class="text-3xl font-bold uppercase mb-4 text-white border-b-2 border-white/20 pb-4">
      会话日志
    </h2>

    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs font-bold">
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-2 border-2 transition-colors"
          :class="filter === 'all' ? 'border-white text-white bg-white/10' : 'border-white/30 text-white/70 hover:text-white'"
          @click="filter = 'all'"
        >
          全部
        </button>
        <button
          type="button"
          class="px-3 py-2 border-2 transition-colors"
          :class="
            filter === 'network'
              ? 'border-[#00ff00] text-[#00ff00] bg-[#00ff00]/10'
              : 'border-white/30 text-white/70 hover:text-white'
          "
          @click="filter = 'network'"
        >
          网络
        </button>
        <button
          type="button"
          class="px-3 py-2 border-2 transition-colors"
          :class="
            filter === 'error'
              ? 'border-[#ff8800] text-[#ff8800] bg-[#ff8800]/10'
              : 'border-white/30 text-white/70 hover:text-white'
          "
          @click="filter = 'error'"
        >
          错误
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-3 py-2 border-2 border-white/30 text-white/70 hover:text-white transition-colors"
          @click="togglePaused"
        >
          {{ paused ? '继续' : '暂停' }}
        </button>
        <button
          type="button"
          class="px-3 py-2 border-2 border-white/30 text-white/70 hover:text-white transition-colors"
          @click="clearLogs"
        >
          清空
        </button>
        <button
          type="button"
          class="px-3 py-2 border-2 border-white/30 text-white/70 hover:text-white transition-colors"
          @click="copySummary"
        >
          复制摘要
        </button>
      </div>
    </div>

    <div
      ref="scroller"
      class="mt-4 border-2 border-white/20 bg-black/20 p-4 h-[520px] overflow-y-auto"
    >
      <div v-if="filteredEntries.length === 0" class="text-white/50">
        暂无日志 · 请在「链路通讯」中执行自检或搜索演示
      </div>

      <div
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="leading-6 flex gap-2"
      >
        <span class="text-white/50 shrink-0">[{{ formatTime(entry.ts) }}]</span>
        <span
          class="shrink-0 font-bold"
          :class="{
            'text-[#00ff00]': entry.kind === 'network',
            'text-[#00a3cc]': entry.kind === 'ui',
            'text-[#ff8800]': entry.kind === 'error',
          }"
        >
          {{ kindLabel(entry.kind) }}
        </span>
        <span class="break-all">{{ formatTelemetryEntry(entry) }}</span>
      </div>
    </div>

    <div class="mt-3 text-xs text-white/60 font-sharetech flex items-center justify-between">
      <span>会话缓存: {{ entries.length }}/200</span>
      <span v-if="copied" class="text-[#00ff00]">已复制</span>
    </div>
  </section>
</template>
