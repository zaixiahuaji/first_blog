<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  (e: 'done'): void
}>()

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1))

const totalMs = randInt(2000, 3000)
const holdMs = randInt(150, 250)
const fadeMs = 420
const runMs = Math.max(0, totalMs - holdMs - fadeMs)

const progress = ref(0)
const elapsedMs = ref(0)
const typedLog = ref('')
const isFading = ref(false)

const logLines = [
  'BOOT: INIT TTY/ADMIN-01',
  'CHECK: CRT SYNC OK',
  'LINK: HANDSHAKE -> AUTH-GATE',
  'VERIFY: INVITE RULES LOADED',
  'MOUNT: SESSION BUFFER READY',
  'SCAN: INPUT BUS READY',
  'AUTH: ROLE TABLE OK',
  'STATUS: INPUT LOCKED',
  'SYNC: TERMINAL CLOCK OK',
  'READY: WAITING INPUT',
]

const fullLog = logLines.join('\n')
const totalChars = fullLog.length

const percent = computed(() => clamp(Math.round(progress.value), 0, 100))
const timeCode = computed(() => {
  const deciSeconds = clamp(Math.floor(elapsedMs.value / 100), 0, 99)
  return `00:${deciSeconds.toString().padStart(2, '0')}`
})

const barText = computed(() => {
  const units = 16
  const filled = clamp(Math.round((percent.value / 100) * units), 0, units)
  return `[${'█'.repeat(filled)}${'░'.repeat(units - filled)}]`
})

const statusText = computed(() => {
  const value = percent.value
  if (value >= 100) return '就绪，等待输入…'
  if (value < 28) return '链路校验中…'
  if (value < 58) return '权限握手中…'
  if (value < 86) return '终端同步中…'
  return '启动完成中…'
})

const showCursor = computed(() => !isFading.value && percent.value < 100)

let rafId: number | null = null
let startAt = 0
let readyAt = 0
let fadeAt = 0
let emitted = false
let typedCount = 0

const startFade = () => {
  if (isFading.value) return
  isFading.value = true
  fadeAt = performance.now()
}

const tick = (now: number) => {
  if (!startAt) startAt = now
  const elapsed = now - startAt
  elapsedMs.value = elapsed

  if (!isFading.value) {
    const t = clamp(elapsed / runMs, 0, 1)
    const split = 0.86
    let value = 0
    if (t < split) {
      value = easeOutCubic(t / split) * 0.9
    } else {
      value = 0.9 + easeOutCubic((t - split) / (1 - split)) * 0.1
    }
    progress.value = Math.max(progress.value, clamp(value * 100, 0, 100))

    const logDuration = runMs * 0.78
    const logProgress = clamp(elapsed / logDuration, 0, 1)
    const charCount = Math.floor(totalChars * logProgress)
    if (charCount !== typedCount) {
      typedCount = charCount
      typedLog.value = fullLog.slice(0, charCount)
    }

    if (!readyAt && elapsed >= runMs) {
      progress.value = 100
      typedLog.value = fullLog
      readyAt = now
    }

    if (readyAt && elapsed >= runMs + holdMs) {
      startFade()
    }
  } else {
    const fadeElapsed = now - fadeAt
    if (fadeElapsed >= fadeMs && !emitted) {
      emitted = true
      emit('done')
      return
    }
  }

  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    class="admin-intro fixed inset-0 z-30 flex items-center justify-center px-4 font-vt323 text-[#00ff00] transition-[opacity,transform] duration-[420ms] ease-out"
    :class="isFading ? 'opacity-0 scale-[1.01]' : 'opacity-100 scale-100'"
  >
    <div class="admin-intro-panel w-[min(760px,92vw)] border-2 border-[#00ff00] px-6 py-6 md:px-8 md:py-8">
      <div class="flex items-start justify-between gap-6 border-b border-[#00ff00] pb-4">
        <div>
          <div class="text-3xl tracking-[0.3em] uppercase">系统入口</div>
          <div class="text-xs opacity-70 mt-1">终端握手 / ADMIN GATEWAY</div>
        </div>
        <div class="text-right text-sm opacity-80">
          <div>TIME {{ timeCode }}</div>
          <div class="text-xs mt-1">LINK: SECURE</div>
        </div>
      </div>

      <div class="mt-5 grid gap-4">
        <div class="admin-intro-log border border-[#00ff00] px-4 py-3 text-sm">
          <pre class="whitespace-pre-wrap">{{ typedLog }}</pre>
          <span v-if="showCursor" class="admin-intro-cursor"></span>
        </div>

        <div class="flex items-center justify-between text-sm">
          <div class="tracking-[0.2em] uppercase">{{ barText }}</div>
          <div class="text-lg">{{ percent.toString().padStart(3, '0') }}%</div>
        </div>

        <div class="text-sm opacity-80">{{ statusText }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-intro {
  background: rgba(6, 6, 6, 0.96);
  pointer-events: auto;
}

.admin-intro-panel {
  box-shadow: 0 0 24px rgba(0, 255, 0, 0.25);
  background: rgba(0, 0, 0, 0.65);
}

.admin-intro-log {
  min-height: 180px;
  line-height: 1.3;
  background: rgba(0, 0, 0, 0.6);
  box-shadow: inset 0 0 12px rgba(0, 255, 0, 0.12);
}

.admin-intro-cursor {
  display: inline-block;
  width: 10px;
  height: 18px;
  margin-top: 4px;
  background: #00ff00;
  animation: admin-intro-blink 0.8s steps(2) infinite;
}

@keyframes admin-intro-blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
