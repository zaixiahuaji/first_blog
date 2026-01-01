<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getPosts } from '@/api/generated/posts/posts'
import { getCategories } from '@/api/generated/categories/categories'
import type { PaginatedPostsDto } from '@/api/generated/model'
import { useCategoriesStore } from '@/stores/categories'
import { useUiStore, type SimFailureMode } from '@/stores/ui'
import {
  classifyFailureType,
  TELEMETRY_LABELS,
  type FailureType,
  useTelemetryStore,
} from '@/stores/telemetry'
import type { PingStep, SearchLaneState } from '@/components/system/comms/comms.types'
import CommsSelfCheckPanel from '@/components/system/comms/CommsSelfCheckPanel.vue'
import CommsSearchDemo from '@/components/system/comms/CommsSearchDemo.vue'
import CommsChannelStatus from '@/components/system/comms/CommsChannelStatus.vue'
import CommsLinkTopology from '@/components/system/comms/CommsLinkTopology.vue'

const QUERY_MAX_LENGTH = 32
const TOP_N = 5
const ACTION_COOLDOWN_MS = 5000
const REQUEST_TIMEOUT_MS = 8000
const CLOCK_TICK_MS = 200
const SIMULATED_DELAY_MIN_MS = 150
const SIMULATED_DELAY_MAX_MS = 600

const FAILURE_MODES: Array<{ value: SimFailureMode; label: string }> = [
  { value: 'SERVER_ERROR', label: '服务器错误(SERVER_ERROR)' },
  { value: 'TIMEOUT', label: '超时(TIMEOUT)' },
  { value: 'NETWORK', label: '网络(NETWORK)' },
  { value: 'RANDOM', label: '随机(RANDOM)' },
]

const RANDOM_FAILURE_POOL: FailureType[] = ['SERVER_ERROR', 'TIMEOUT', 'NETWORK']

const categoriesStore = useCategoriesStore()
const { activeCategories } = storeToRefs(categoriesStore)

const uiStore = useUiStore()
const { simulateFailureEnabled, simulateFailureMode } = storeToRefs(uiStore)

const telemetryStore = useTelemetryStore()

const nowMs = ref(Date.now())
let clockTimer: number | undefined

onMounted(() => {
  clockTimer = window.setInterval(() => {
    nowMs.value = Date.now()
  }, CLOCK_TICK_MS)
})

onBeforeUnmount(() => {
  if (clockTimer) window.clearInterval(clockTimer)
})

const cooldownUntil = ref(0)
const cooldownRemainingSec = computed(() =>
  Math.max(0, Math.ceil((cooldownUntil.value - nowMs.value) / 1000)),
)
const isCooldownActive = computed(() => cooldownRemainingSec.value > 0)

const startCooldown = () => {
  cooldownUntil.value = Date.now() + ACTION_COOLDOWN_MS
}

const query = ref('')
const queryTrimmed = computed(() => query.value.trim())
const queryLen = computed(() => queryTrimmed.value.length)
const isQueryValid = computed(() => queryLen.value > 0 && queryLen.value <= QUERY_MAX_LENGTH)

const selfCheckRunning = ref(false)
const lastSelfCheckSuccessAt = ref<number | null>(null)

const pingTotal = ref<PingStep>({ key: 'PING_TOTAL', state: 'idle' })
const pingCategories = ref<PingStep>({ key: 'PING_CATEGORIES', state: 'idle' })

const overallOnline = computed(
  () => pingTotal.value.state === 'ok' && pingCategories.value.state === 'ok',
)

const searchRunning = ref(false)
const keywordLane = ref<SearchLaneState>({ state: 'idle', items: [] })
const semanticLane = ref<SearchLaneState>({ state: 'idle', items: [] })

const labelForCategory = (slug: string) => categoriesStore.getLabel(slug)
const colorForCategory = (slug: string) => categoriesStore.getColor(slug)

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
const formatDuration = (durationMs?: number) =>
  durationMs == null ? '--' : `${Math.round(durationMs)}ms`

const formatFailureType = (failureType?: FailureType) => {
  const code = failureType ?? 'SERVER_ERROR'
  if (code === 'TIMEOUT') return '超时(TIMEOUT)'
  if (code === 'NETWORK') return '网络(NETWORK)'
  return '服务器错误(SERVER_ERROR)'
}

const laneStatus = (lane: SearchLaneState) => {
  if (lane.state === 'idle') return '待机'
  if (lane.state === 'loading') return '搜索中...'
  if (lane.state === 'ok') return `成功 | ${formatDuration(lane.durationMs)}`
  return `${formatFailureType(lane.failureType)} | ${formatDuration(lane.durationMs)}`
}

const stepStatus = (step: PingStep) => {
  if (step.state === 'idle') return '待机'
  if (step.state === 'loading') return '探测中...'
  if (step.state === 'ok') return `成功 | ${formatDuration(step.durationMs)}`
  return `${formatFailureType(step.failureType)} | ${formatDuration(step.durationMs)}`
}

const toggleSimulateFailure = () => {
  uiStore.toggleSimulateFailure()
}

const selectSimulatedFailureType = (): FailureType => {
  if (simulateFailureMode.value === 'RANDOM') {
    const index = Math.floor(Math.random() * RANDOM_FAILURE_POOL.length)
    return RANDOM_FAILURE_POOL[index] ?? 'SERVER_ERROR'
  }
  return simulateFailureMode.value
}

const simulateDelayMs = () =>
  SIMULATED_DELAY_MIN_MS +
  Math.random() * (SIMULATED_DELAY_MAX_MS - SIMULATED_DELAY_MIN_MS)

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const runTimed = async <T>(
  key: 'PING_TOTAL' | 'PING_CATEGORIES' | 'SEARCH_KEYWORD' | 'SEARCH_SEMANTIC',
  task: () => Promise<T>,
): Promise<{ ok: true; durationMs: number; result: T } | { ok: false; durationMs: number; failureType: FailureType }> => {
  const start = performance.now()

  if (simulateFailureEnabled.value) {
    const delayMs = simulateDelayMs()
    await wait(delayMs)
    const durationMs = performance.now() - start
    const failureType = selectSimulatedFailureType()
    telemetryStore.logNetwork(key, { ok: false, durationMs, failureType })
    triggerLinkPulse('error', 14)
    return { ok: false, durationMs, failureType }
  }

  try {
    const result = await task()
    const durationMs = performance.now() - start
    telemetryStore.logNetwork(key, { ok: true, durationMs })
    triggerLinkPulse('ok', 6)
    return { ok: true, durationMs, result }
  } catch (e) {
    const durationMs = performance.now() - start
    const failureType = classifyFailureType(e)
    telemetryStore.logNetwork(key, { ok: false, durationMs, failureType })
    triggerLinkPulse('error', 14)
    return { ok: false, durationMs, failureType }
  }
}

const runSelfCheck = async () => {
  if (selfCheckRunning.value || isCooldownActive.value) return
  startCooldown()
  telemetryStore.logUi('SELF_CHECK')
  triggerLinkPulse('ui', 4)

  selfCheckRunning.value = true
  pingTotal.value = { key: 'PING_TOTAL', state: 'loading' }
  pingCategories.value = { key: 'PING_CATEGORIES', state: 'idle' }

  try {
    const { postsControllerGetTotal } = getPosts()
    const totalRes = await runTimed('PING_TOTAL', () =>
      postsControllerGetTotal({ timeout: REQUEST_TIMEOUT_MS } as any),
    )
    if (totalRes.ok) {
      pingTotal.value = { key: 'PING_TOTAL', state: 'ok', durationMs: totalRes.durationMs }
    } else {
      pingTotal.value = {
        key: 'PING_TOTAL',
        state: 'error',
        durationMs: totalRes.durationMs,
        failureType: totalRes.failureType,
      }
    }

    pingCategories.value = { key: 'PING_CATEGORIES', state: 'loading' }
    const { categoriesControllerFindActive } = getCategories()
    const categoriesRes = await runTimed('PING_CATEGORIES', () =>
      categoriesControllerFindActive({ timeout: REQUEST_TIMEOUT_MS } as any),
    )
    if (categoriesRes.ok) {
      pingCategories.value = { key: 'PING_CATEGORIES', state: 'ok', durationMs: categoriesRes.durationMs }
    } else {
      pingCategories.value = {
        key: 'PING_CATEGORIES',
        state: 'error',
        durationMs: categoriesRes.durationMs,
        failureType: categoriesRes.failureType,
      }
    }

    if (totalRes.ok && categoriesRes.ok) {
      lastSelfCheckSuccessAt.value = Date.now()
    }
  } finally {
    selfCheckRunning.value = false
  }
}

const runSearchDemo = async () => {
  if (searchRunning.value || isCooldownActive.value || !isQueryValid.value) return

  startCooldown()
  telemetryStore.logUi('SEARCH_TRIGGER', `长度=${queryLen.value}`)
  triggerLinkPulse('ui', 4)

  searchRunning.value = true
  keywordLane.value = { state: 'loading', items: [] }
  semanticLane.value = { state: 'loading', items: [] }

  const q = queryTrimmed.value
  const { postsControllerFindAll } = getPosts()

  const keywordTask = () =>
    postsControllerFindAll(
      { page: 1, limit: TOP_N, q },
      { timeout: REQUEST_TIMEOUT_MS } as any,
    )

  const semanticTask = () =>
    postsControllerFindAll(
      { page: 1, limit: TOP_N, vectorQ: q },
      { timeout: REQUEST_TIMEOUT_MS } as any,
    )

  try {
    const [keywordRes, semanticRes] = await Promise.all([
      runTimed('SEARCH_KEYWORD', keywordTask),
      runTimed('SEARCH_SEMANTIC', semanticTask),
    ])

    const applyLane = (
      target: typeof keywordLane,
      res:
        | { ok: true; durationMs: number; result: PaginatedPostsDto }
        | { ok: false; durationMs: number; failureType: FailureType },
    ) => {
      if (res.ok) {
        target.value = {
          state: 'ok',
          durationMs: res.durationMs,
          items: res.result.items ?? [],
        }
        return
      }

      target.value = {
        state: 'error',
        durationMs: res.durationMs,
        failureType: res.failureType,
        items: [],
      }
    }

    applyLane(keywordLane, keywordRes as any)
    applyLane(semanticLane, semanticRes as any)
  } finally {
    searchRunning.value = false
  }
}

const signalStrength = computed(() => {
  if (selfCheckRunning.value || searchRunning.value) return 72
  if (overallOnline.value) return 98
  if (pingTotal.value.state === 'error' || pingCategories.value.state === 'error') return 22
  return 40
})

type LinkPulseKind = 'ok' | 'error' | 'ui'

const linkLastPulseAt = ref(0)
const linkLastPulseIntensity = ref(0)
const linkPulseKind = ref<LinkPulseKind>('ui')

const triggerLinkPulse = (kind: LinkPulseKind, intensity = 8) => {
  linkPulseKind.value = kind
  linkLastPulseAt.value = Date.now()
  linkLastPulseIntensity.value = intensity
}

const linkPulseActive = computed(() => {
  const ageMs = nowMs.value - linkLastPulseAt.value
  if (linkPulseKind.value === 'error') return ageMs < 1200
  if (linkPulseKind.value === 'ok') return ageMs < 800
  return ageMs < 500
})

const linkPulseColor = computed(() => {
  const ageMs = nowMs.value - linkLastPulseAt.value
  if (linkPulseKind.value === 'error' && ageMs < 1200) return '#ff8800'
  if (linkPulseKind.value === 'ok' && ageMs < 800) return '#00cc7a'
  if (selfCheckRunning.value || searchRunning.value) return '#00a3cc'
  return '#00ff00'
})

const linkBaseColor = computed(() => {
  if (pingTotal.value.state === 'error' || pingCategories.value.state === 'error') return '#ff8800'
  if (overallOnline.value) return '#00ff00'
  if (selfCheckRunning.value || searchRunning.value) return '#00a3cc'
  return '#7a7a80'
})

const linkActiveColor = computed(() => (linkPulseActive.value ? linkPulseColor.value : linkBaseColor.value))

const linkDotDuration = computed(() => {
  if (linkPulseActive.value) return '1.2s'
  if (selfCheckRunning.value || searchRunning.value) return '1.8s'
  if (overallOnline.value) return '2.4s'
  return '3.0s'
})

const linkDotStyle = (index: number) => {
  const delay = -index * 0.7
  const color = linkActiveColor.value
  const glow = 10 + (linkPulseActive.value ? linkLastPulseIntensity.value : 0)
  return {
    backgroundColor: color,
    boxShadow: `0 0 ${glow}px ${color}`,
    animationDuration: linkDotDuration.value,
    animationDelay: `${delay}s`,
  }
}

const linkStatusText = computed(() => {
  if (selfCheckRunning.value || searchRunning.value) return '工作中'
  if (pingTotal.value.state === 'error' || pingCategories.value.state === 'error') return '异常'
  return overallOnline.value ? '稳定' : '待机'
})

const humanLabel = (key: keyof typeof TELEMETRY_LABELS) => TELEMETRY_LABELS[key] ?? key
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <div class="mb-8 pb-4 border-b-4 border-[#2d2d30] flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <h2 class="text-3xl font-bold uppercase">链路通讯</h2>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="px-4 py-2 border-2 text-xs uppercase font-bold tracking-widest transition-colors"
          :class="
            simulateFailureEnabled
              ? 'border-[#ff8800] bg-[#ff8800] text-white'
              : 'border-[#2d2d30] bg-white text-[#2d2d30]'
          "
          @click="toggleSimulateFailure"
        >
          模拟异常: {{ simulateFailureEnabled ? '开' : '关' }}
        </button>
        <div class="flex items-center gap-2">
          <span class="text-[10px] uppercase tracking-widest text-[#666]">失败类型</span>
          <select
            v-model="simulateFailureMode"
            class="text-xs border-2 border-[#2d2d30] bg-white px-2 py-1 font-bold tracking-widest"
            :disabled="!simulateFailureEnabled"
          >
            <option v-for="option in FAILURE_MODES" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left / Main -->
      <div class="lg:col-span-2 space-y-8">
        <CommsSelfCheckPanel
          :self-check-running="selfCheckRunning"
          :is-cooldown-active="isCooldownActive"
          :cooldown-remaining-sec="cooldownRemainingSec"
          :ping-total="pingTotal"
          :ping-categories="pingCategories"
          :overall-online="overallOnline"
          :last-self-check-success-at="lastSelfCheckSuccessAt"
          :format-time="formatTime"
          :step-status="stepStatus"
          :human-label="humanLabel"
          @run="runSelfCheck"
        />

        <CommsSearchDemo
          v-model="query"
          :query-len="queryLen"
          :query-max-length="QUERY_MAX_LENGTH"
          :active-categories-count="activeCategories.length"
          :search-running="searchRunning"
          :is-cooldown-active="isCooldownActive"
          :cooldown-remaining-sec="cooldownRemainingSec"
          :is-query-valid="isQueryValid"
          :keyword-lane="keywordLane"
          :semantic-lane="semanticLane"
          :lane-status="laneStatus"
          :label-for-category="labelForCategory"
          :color-for-category="colorForCategory"
          @search="runSearchDemo"
        />
      </div>

      <!-- Right / Visual -->
      <div class="space-y-8">
        <CommsChannelStatus :signal-strength="signalStrength" />

        <CommsLinkTopology
          :link-status-text="linkStatusText"
          :link-active-color="linkActiveColor"
          :link-base-color="linkBaseColor"
          :link-dot-style="linkDotStyle"
          :is-cooldown-active="isCooldownActive"
          :cooldown-remaining-sec="cooldownRemainingSec"
          :query-max-length="QUERY_MAX_LENGTH"
          :request-timeout-ms="REQUEST_TIMEOUT_MS"
        />
      </div>
    </div>
  </section>
</template>
