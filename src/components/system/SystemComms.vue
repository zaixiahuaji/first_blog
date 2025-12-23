<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getPosts } from '@/api/generated/posts/posts'
import { getCategories } from '@/api/generated/categories/categories'
import type { PaginatedPostsDto, PostDto } from '@/api/generated/model'
import { useCategoriesStore } from '@/stores/categories'
import {
  classifyFailureType,
  TELEMETRY_LABELS,
  type FailureType,
  useTelemetryStore,
} from '@/stores/telemetry'

const QUERY_MAX_LENGTH = 32
const TOP_N = 5
const ACTION_COOLDOWN_MS = 5000
const REQUEST_TIMEOUT_MS = 8000
const CLOCK_TICK_MS = 200

type StepState = 'idle' | 'loading' | 'ok' | 'error'

type PingStep = {
  key: 'PING_TOTAL' | 'PING_CATEGORIES'
  state: StepState
  durationMs?: number
  failureType?: FailureType
}

type SearchLaneState = {
  state: StepState
  durationMs?: number
  failureType?: FailureType
  items: PostDto[]
}

const categoriesStore = useCategoriesStore()
const { activeCategories } = storeToRefs(categoriesStore)

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

const laneTitle = (lane: 'keyword' | 'semantic') => (lane === 'keyword' ? '关键词' : '语义')

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

const runTimed = async <T>(
  key: 'PING_TOTAL' | 'PING_CATEGORIES' | 'SEARCH_KEYWORD' | 'SEARCH_SEMANTIC',
  task: () => Promise<T>,
): Promise<{ ok: true; durationMs: number; result: T } | { ok: false; durationMs: number; failureType: FailureType }> => {
  const start = performance.now()
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
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30]">
      链路通讯
    </h2>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Left / Main -->
      <div class="lg:col-span-2 space-y-8">
        <!-- Self Check -->
        <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-sm font-bold uppercase text-[#2d2d30]">链路自检</h3>
                <p class="font-vt323 text-[#666] mt-2">
                  点击按钮依次探测公开接口（文章总量 → 类别列表），不展示原始 JSON。
                </p>
              </div>
            <button
              type="button"
              class="bg-[#2d2d30] text-white px-5 py-2 uppercase tracking-widest hover:bg-[#ff8800] transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.2)] font-bold disabled:opacity-50 disabled:hover:bg-[#2d2d30]"
              :disabled="selfCheckRunning || isCooldownActive"
              @click="runSelfCheck"
            >
              {{
                isCooldownActive
                  ? `冷却 ${cooldownRemainingSec}s`
                  : selfCheckRunning
                    ? '自检中...'
                    : '开始自检'
              }}
            </button>
          </div>

          <div class="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border-2 border-[#2d2d30] bg-white p-4">
              <div class="text-[10px] font-bold uppercase tracking-widest text-[#999]">
                {{ humanLabel('PING_TOTAL') }}
              </div>
              <div class="mt-2 font-vt323 text-lg text-[#2d2d30]">
                {{ stepStatus(pingTotal) }}
              </div>
            </div>

            <div class="border-2 border-[#2d2d30] bg-white p-4">
              <div class="text-[10px] font-bold uppercase tracking-widest text-[#999]">
                {{ humanLabel('PING_CATEGORIES') }}
              </div>
              <div class="mt-2 font-vt323 text-lg text-[#2d2d30]">
                {{ stepStatus(pingCategories) }}
              </div>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between text-xs font-bold">
            <div class="flex items-center gap-2">
              <span class="uppercase text-[#999]">状态</span>
              <span
                class="px-2 py-1 border-2"
                :class="
                  overallOnline
                    ? 'border-[#00cc7a] text-[#00cc7a]'
                    : 'border-[#ff8800] text-[#ff8800]'
                "
              >
                {{ overallOnline ? '在线' : '离线' }}
              </span>
            </div>
            <div class="font-vt323 text-[#666]">
              上次成功:
              <span class="text-[#2d2d30]">
                {{ lastSelfCheckSuccessAt ? formatTime(lastSelfCheckSuccessAt) : '--:--:--' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Search Demo -->
        <div class="border-2 border-[#2d2d30] bg-white p-6">
          <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div class="flex-1">
              <h3 class="text-sm font-bold uppercase text-[#2d2d30]">搜索演示</h3>
              <p class="font-vt323 text-[#666] mt-2">
                对比关键词 / 语义搜索，仅显示 Top5 的标题与类别。
              </p>
              <div class="mt-4 flex flex-col md:flex-row gap-3">
                <div class="flex-1">
                  <input
                    v-model="query"
                    type="text"
                    :maxlength="QUERY_MAX_LENGTH"
                    class="w-full bg-[#f4f4f6] border-b-2 border-[#ccc] p-3 outline-none focus:border-[#00a3cc] focus:bg-white transition-colors font-sharetech"
                    placeholder="输入查询..."
                  />
                  <div class="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#999]">
                    长度 {{ queryLen }}/{{ QUERY_MAX_LENGTH }}
                    <span v-if="activeCategories.length > 0"> | 分类 {{ activeCategories.length }}</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="bg-[#2d2d30] text-white px-6 py-3 uppercase tracking-widest hover:bg-[#00a3cc] transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.2)] font-bold disabled:opacity-50 disabled:hover:bg-[#2d2d30]"
                  :disabled="searchRunning || isCooldownActive || !isQueryValid"
                  @click="runSearchDemo"
                >
                  {{
                    isCooldownActive
                      ? `冷却 ${cooldownRemainingSec}s`
                      : searchRunning
                        ? '搜索中...'
                        : '搜索'
                  }}
                </button>
              </div>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-4">
              <div class="flex items-center justify-between">
                <div class="text-xs font-bold uppercase text-[#2d2d30]">
                  {{ laneTitle('keyword') }}
                </div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                  {{ laneStatus(keywordLane) }}
                </div>
              </div>

              <div v-if="keywordLane.items.length === 0" class="mt-4 font-vt323 text-[#666]">
                {{ keywordLane.state === 'ok' ? '无结果' : '---' }}
              </div>
              <div v-else class="mt-4 space-y-2">
                <div
                  v-for="item in keywordLane.items"
                  :key="item.id"
                  class="flex items-center justify-between gap-3 border-2 border-[#2d2d30] bg-white px-3 py-2"
                >
                  <div class="min-w-0">
                    <div class="font-bold text-[#2d2d30] truncate">{{ item.title }}</div>
                    <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                      {{ labelForCategory(item.category) }}
                    </div>
                  </div>
                  <div class="w-3 h-3 border-2 border-[#2d2d30]" :style="{ backgroundColor: colorForCategory(item.category) }"></div>
                </div>
              </div>
            </div>

            <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-4">
              <div class="flex items-center justify-between">
                <div class="text-xs font-bold uppercase text-[#2d2d30]">
                  {{ laneTitle('semantic') }}
                </div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                  {{ laneStatus(semanticLane) }}
                </div>
              </div>

              <div v-if="semanticLane.items.length === 0" class="mt-4 font-vt323 text-[#666]">
                {{ semanticLane.state === 'ok' ? '无结果' : '---' }}
              </div>
              <div v-else class="mt-4 space-y-2">
                <div
                  v-for="item in semanticLane.items"
                  :key="item.id"
                  class="flex items-center justify-between gap-3 border-2 border-[#2d2d30] bg-white px-3 py-2"
                >
                  <div class="min-w-0">
                    <div class="font-bold text-[#2d2d30] truncate">{{ item.title }}</div>
                    <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                      {{ labelForCategory(item.category) }}
                    </div>
                  </div>
                  <div class="w-3 h-3 border-2 border-[#2d2d30]" :style="{ backgroundColor: colorForCategory(item.category) }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right / Visual -->
      <div class="space-y-8">
        <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-6">
          <h3 class="text-sm font-bold uppercase text-[#2d2d30] border-b border-[#ccc] pb-2">
            通道状态
          </h3>

          <div class="mt-4 space-y-2 font-vt323 text-[#666]">
            <p>>> 握手... <span class="text-[#00a3cc]">正常</span></p>
            <p>>> 密钥交换... <span class="text-[#00a3cc]">正常</span></p>
            <p>
              >>> 通道稳定度...
              <span class="text-[#ff8800]">{{ signalStrength }}%</span>
            </p>
          </div>

          <div class="mt-5">
            <div class="text-[10px] font-bold uppercase tracking-widest text-[#999] mb-1">
              信号
            </div>
            <div class="w-full bg-[#ccc] h-2 border-2 border-[#2d2d30]">
              <div class="h-full bg-[#00a3cc]" :style="{ width: `${signalStrength}%` }"></div>
            </div>
          </div>
        </div>

        <div class="border-2 border-[#2d2d30] bg-[#2d2d30] p-4 text-[#00ff00] font-vt323">
          <div class="flex items-center justify-between text-xs text-white/70 font-bold uppercase">
            <span>链路拓扑</span>
            <span :style="{ color: linkActiveColor }">{{ linkStatusText }}</span>
          </div>

          <div class="mt-3 h-44 border-2 border-white/10 bg-black/20 p-3 overflow-hidden relative">
            <div
              class="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#00ff00_3px)]"
            ></div>
            <div
              class="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(90deg,transparent,transparent_12px,#00ff00_13px)]"
            ></div>

            <div class="relative w-full h-full">
              <div class="link-track absolute left-4 right-4 top-1/2 -translate-y-1/2">
                <div class="link-line" :style="{ backgroundColor: linkBaseColor }"></div>
                <div
                  v-for="i in 3"
                  :key="i"
                  class="link-dot"
                  :style="linkDotStyle(i - 1)"
                ></div>
              </div>

              <div class="relative z-10 h-full flex items-center justify-between gap-3 px-1 font-sharetech">
                <div
                  class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 bg-black/40 text-white/80 min-w-0 text-center"
                  :style="{ borderColor: linkActiveColor }"
                >
                  Browser
                </div>
                <div
                  class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 bg-black/40 text-white/80 min-w-0 text-center"
                  :style="{ borderColor: linkActiveColor }"
                >
                  API
                </div>
                <div
                  class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 bg-black/40 text-white/80 min-w-0 text-center"
                  :style="{ borderColor: linkActiveColor }"
                >
                  DB
                </div>
                <div
                  class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-2 bg-black/40 text-white/80 min-w-0 text-center"
                  :style="{ borderColor: linkActiveColor }"
                >
                  Vector
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 text-[10px] text-white/60 font-sharetech">
            Browser → API → DB → Vector | 冷却: {{ isCooldownActive ? `${cooldownRemainingSec}s` : '就绪' }} | 最大长度:
            {{ QUERY_MAX_LENGTH }} | 超时: {{ REQUEST_TIMEOUT_MS / 1000 }}s
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.link-track {
  height: 24px;
}

.link-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 2px;
  opacity: 0.55;
}

.link-dot {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  animation-name: linkDot;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  opacity: 0.9;
}

@keyframes linkDot {
  0% {
    left: 0;
    opacity: 0.55;
  }
  10% {
    opacity: 0.95;
  }
  100% {
    left: calc(100% - 8px);
    opacity: 0.55;
  }
}
</style>
