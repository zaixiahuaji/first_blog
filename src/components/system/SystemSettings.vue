<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

const crtEnabled = computed({
  get: () => uiStore.crtEnabled,
  set: (value: boolean) => uiStore.setCrtEnabled(value),
})

const uaExpanded = ref(false)

const nowMs = ref(Date.now())
const uptimeSeconds = ref(0)

type ViewportInfo = { width: number; height: number; dpr: number }
const viewport = ref<ViewportInfo>({ width: 0, height: 0, dpr: 1 })

type MemoryInfo = { usedBytes: number; totalBytes: number; limitBytes: number }
const memory = ref<MemoryInfo | null>(null)

type ConnectionInfo = {
  effectiveType: string
  downlinkMbps: number | null
  rttMs: number | null
  saveData: boolean | null
}

const connection = ref<ConnectionInfo>({
  effectiveType: 'unknown',
  downlinkMbps: null,
  rttMs: null,
  saveData: null,
})

const language = typeof navigator !== 'undefined' ? navigator.language : 'unknown'
const timeZone =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown'
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'

const formatClock = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
}

const shortUserAgent = computed(() => {
  const ua = userAgent || 'unknown'
  if (uaExpanded.value) return ua
  if (ua.length <= 60) return ua
  return `${ua.slice(0, 60)}...`
})

const updateViewport = () => {
  if (typeof window === 'undefined') return
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  }
}

const updateMemory = () => {
  if (typeof performance === 'undefined') {
    memory.value = null
    return
  }

  const anyPerformance = performance as any
  const mem = anyPerformance?.memory as
    | { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number }
    | undefined

  if (
    !mem ||
    mem.usedJSHeapSize == null ||
    mem.totalJSHeapSize == null ||
    mem.jsHeapSizeLimit == null
  ) {
    memory.value = null
    return
  }

  memory.value = {
    usedBytes: mem.usedJSHeapSize,
    totalBytes: mem.totalJSHeapSize,
    limitBytes: mem.jsHeapSizeLimit,
  }
}

const updateConnection = () => {
  const anyNavigator = typeof navigator !== 'undefined' ? (navigator as any) : null
  const conn = anyNavigator?.connection
  if (!conn) {
    connection.value = { effectiveType: 'unknown', downlinkMbps: null, rttMs: null, saveData: null }
    return
  }

  connection.value = {
    effectiveType: typeof conn.effectiveType === 'string' ? conn.effectiveType : 'unknown',
    downlinkMbps: typeof conn.downlink === 'number' ? conn.downlink : null,
    rttMs: typeof conn.rtt === 'number' ? conn.rtt : null,
    saveData: typeof conn.saveData === 'boolean' ? conn.saveData : null,
  }
}

let timer: number | undefined
let conn: any

onMounted(() => {
  uiStore.applyToBody()
  updateViewport()
  updateMemory()
  updateConnection()

  if (typeof window !== 'undefined') window.addEventListener('resize', updateViewport)

  const anyNavigator = typeof navigator !== 'undefined' ? (navigator as any) : null
  conn = anyNavigator?.connection
  if (conn && typeof conn.addEventListener === 'function') {
    conn.addEventListener('change', updateConnection)
  }

  timer = window.setInterval(() => {
    nowMs.value = Date.now()
    uptimeSeconds.value += 1
    updateMemory()
  }, 1000)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('resize', updateViewport)
  if (conn && typeof conn.removeEventListener === 'function') conn.removeEventListener('change', updateConnection)
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-12 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30]">
      控制面板
    </h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- 视觉设置 -->
      <div class="border-2 border-[#ccc] p-6 bg-[#f9f9fa]">
        <h3 class="text-xl font-bold text-[#ff8800] mb-4 flex items-center gap-2">
          <span class="w-2 h-2 bg-[#ff8800]"></span>
          视觉设置
        </h3>
        <div class="space-y-4">
          <label class="flex items-center justify-between cursor-pointer group">
            <span class="font-bold text-[#555]">CRT 扫描线</span>
            <div class="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
              <input
                v-model="crtEnabled"
                type="checkbox"
                class="absolute block w-6 h-6 rounded-full bg-white border-4 border-[#ccc] appearance-none cursor-pointer checked:right-0 checked:border-[#00a3cc] right-6 transition-all"
              />
              <span class="block overflow-hidden h-6 rounded-full bg-[#e6e6ea] cursor-pointer border-2 border-[#ccc]"></span>
            </div>
          </label>

          <div class="text-sm font-vt323 text-[#666] leading-6">
            <p>本页设置仅影响视觉效果，不会改变文章内容。</p>
            <p>配置仅在本次会话内生效。</p>
          </div>
        </div>
      </div>

      <!-- 系统信息 -->
      <div class="border-2 border-[#2d2d30] p-6 bg-[#2d2d30] text-white font-vt323">
        <h3 class="text-xl font-bold text-[#00a3cc] mb-4">系统信息</h3>
        <div class="space-y-2 text-lg">
          <p>
            >>> 本地时间:
            <span class="text-[#00ff00]">{{ formatClock(nowMs) }}</span>
          </p>
          <p>
            >>> 时区:
            <span class="text-[#00ff00]">{{ timeZone }}</span>
          </p>
          <p>
            >>> 运行时长:
            <span class="text-[#00ff00]">{{ uptimeSeconds }}</span>s
          </p>
          <p>
            >>> 视口:
            <span class="text-[#00ff00]">{{ viewport.width }}x{{ viewport.height }}</span>
            <span class="text-white/60"> / DPR {{ viewport.dpr.toFixed(2) }}</span>
          </p>
          <p>
            >>> 语言:
            <span class="text-[#00ff00]">{{ language }}</span>
          </p>

          <div class="pt-2 border-t border-white/20">
            <div class="flex items-center justify-between gap-3">
              <span class="text-white/80">>>> UA:</span>
              <button
                type="button"
                class="text-[#00a3cc] font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                @click="uaExpanded = !uaExpanded"
              >
                {{ uaExpanded ? '收起' : '展开' }}
              </button>
            </div>
            <p class="mt-2 text-sm text-white/80 break-all">{{ shortUserAgent }}</p>
          </div>

          <div class="pt-2 border-t border-white/20 text-white/80">
            <p>
              >>> 网络:
              <span class="text-[#00ff00]">{{ connection.effectiveType }}</span>
              <span v-if="connection.downlinkMbps != null" class="text-white/60">
                / {{ connection.downlinkMbps.toFixed(1) }}Mbps
              </span>
              <span v-if="connection.rttMs != null" class="text-white/60">
                / {{ Math.round(connection.rttMs) }}ms
              </span>
              <span v-if="connection.saveData != null" class="text-white/60">
                / 省流={{ connection.saveData ? 'ON' : 'OFF' }}
              </span>
            </p>
          </div>

          <div class="pt-2 border-t border-white/20 text-white/80">
            <p v-if="!memory">>>> 内存: <span class="text-white/60">unknown</span></p>
            <div v-else>
              <p>
                >>> 内存:
                <span class="text-[#00ff00]">{{ formatBytes(memory.usedBytes) }}</span>
                <span class="text-white/60">
                  / {{ formatBytes(memory.totalBytes) }} (limit {{ formatBytes(memory.limitBytes) }})
                </span>
              </p>
              <div class="mt-2 w-full bg-white/10 h-2 border border-white/20">
                <div
                  class="h-full bg-[#ff8800]"
                  :style="{ width: `${Math.min(100, (memory.usedBytes / memory.limitBytes) * 100)}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
