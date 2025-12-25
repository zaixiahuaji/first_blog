<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type BootVariant = 'hardcore' | 'clean'

const props = withDefaults(
  defineProps<{
    variant?: BootVariant
    minShowMs?: number
    durationMs?: number
  }>(),
  {
    variant: 'hardcore',
    minShowMs: 800,
    durationMs: undefined,
  },
)

const emit = defineEmits<{
  (e: 'done'): void
}>()

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

const holdMs = 180
const fadeMs = 420
const totalMs = props.durationMs ?? 3000
const runMs = Math.max(0, totalMs - holdMs - fadeMs)

const isFading = ref(false)
const elapsedMs = ref(0)
const progress = ref(0)

const percent = computed(() => clamp(Math.round(progress.value), 0, 100))
const timeCode = computed(() => {
  const deciSeconds = clamp(Math.floor(elapsedMs.value / 100), 0, 99)
  return `00:${deciSeconds.toString().padStart(2, '0')}`
})

const stageText = computed(() => {
  const value = percent.value
  if (value >= 100) return '系统就绪'
  if (value < 22) return '插入磁带…'
  if (value < 48) return '校准卷轴…'
  if (value < 78) return '走带同步…'
  return '压带收尾…'
})

const scanOpacity = computed(() => (props.variant === 'hardcore' ? 0.18 : 0.09))

const SFX_ENABLED_KEY = 'huaji_intro_sfx_enabled'
const SFX_VOLUME_KEY = 'huaji_intro_sfx_volume'

const readStoredBoolean = (key: string, fallback: boolean) => {
  try {
    const value = localStorage.getItem(key)
    if (value === null) return fallback
    return value === '1' || value === 'true'
  } catch {
    return fallback
  }
}

const readStoredNumber = (key: string, fallback: number) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const sfxEnabled = ref(readStoredBoolean(SFX_ENABLED_KEY, true))
const sfxVolume = ref(clamp(readStoredNumber(SFX_VOLUME_KEY, 0.1), 0, 1))

watch(sfxEnabled, (value) => {
  try {
    localStorage.setItem(SFX_ENABLED_KEY, value ? '1' : '0')
  } catch { }
})

watch(sfxVolume, (value) => {
  try {
    localStorage.setItem(SFX_VOLUME_KEY, String(value))
  } catch { }
  if (audio?.masterGain) {
    audio.masterGain.gain.value = value
  }
})

type AudioRuntime = {
  ctx: AudioContext
  masterGain: GainNode
  noiseSource?: AudioBufferSourceNode
  noiseGain?: GainNode
  noiseFilter?: BiquadFilterNode
  noiseBuffer?: AudioBuffer
}

let audio: AudioRuntime | null = null
const audioHint = ref<string | null>(null)

const ensureAudio = () => {
  if (audio) return audio
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
  const ctx = new AudioContextCtor()
  const masterGain = ctx.createGain()
  masterGain.gain.value = sfxVolume.value
  masterGain.connect(ctx.destination)
  audio = { ctx, masterGain }
  return audio
}

const createNoiseBuffer = (ctx: AudioContext) => {
  const seconds = 1
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.18
  }
  return buffer
}

const playClick = () => {
  if (!audio) return
  const now = audio.ctx.currentTime
  const osc = audio.ctx.createOscillator()
  const gain = audio.ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(120, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.14, now + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
  osc.connect(gain)
  gain.connect(audio.masterGain)
  osc.start(now)
  osc.stop(now + 0.07)
}

const playBeep = (frequency: number, durationSeconds: number) => {
  if (!audio) return
  const now = audio.ctx.currentTime
  const osc = audio.ctx.createOscillator()
  const gain = audio.ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds)
  osc.connect(gain)
  gain.connect(audio.masterGain)
  osc.start(now)
  osc.stop(now + durationSeconds + 0.02)
}

const startNoise = () => {
  if (!audio) return
  if (audio.noiseSource) return

  audio.noiseBuffer = audio.noiseBuffer ?? createNoiseBuffer(audio.ctx)
  const src = audio.ctx.createBufferSource()
  src.buffer = audio.noiseBuffer
  src.loop = true

  const filter = audio.ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1400

  const gain = audio.ctx.createGain()
  gain.gain.value = props.variant === 'hardcore' ? 0.06 : 0.04

  src.connect(filter)
  filter.connect(gain)
  gain.connect(audio.masterGain)

  src.start()

  audio.noiseSource = src
  audio.noiseFilter = filter
  audio.noiseGain = gain
}

const stopNoise = () => {
  if (!audio?.noiseSource) return
  try {
    audio.noiseSource.stop()
  } catch { }
  try {
    audio.noiseSource.disconnect()
  } catch { }
  audio.noiseSource = undefined
  audio.noiseGain = undefined
  audio.noiseFilter = undefined
}

const stopSfx = () => {
  audioHint.value = null
  stopNoise()
}

const tryStartSfx = async (reason: 'toggle' | 'unlock') => {
  if (!sfxEnabled.value) return
  const runtime = ensureAudio()
  try {
    if (runtime.ctx.state !== 'running') {
      await runtime.ctx.resume()
    }
  } catch {
    audioHint.value = '音效被浏览器拦截'
    return
  }

  if (runtime.ctx.state !== 'running') {
    audioHint.value = '点击任意位置启用音效'
    return
  }

  audioHint.value = null

  if (reason === 'toggle') {
    playClick()
  }
  startNoise()
}

const onToggleSfx = async () => {
  sfxEnabled.value = !sfxEnabled.value
  if (!sfxEnabled.value) {
    stopSfx()
    return
  }
  await tryStartSfx('toggle')
}

const onPointerDown = async () => {
  if (!sfxEnabled.value) return
  await tryStartSfx('unlock')
}

let rafId: number | null = null
let startAt = 0
let readyAt = 0
let fadeAt = 0
let emitted = false

const startFade = () => {
  if (isFading.value) return
  isFading.value = true
  fadeAt = performance.now()
  if (sfxEnabled.value) {
    playBeep(880, 0.08)
  }
  stopSfx()
}

const tick = (now: number) => {
  if (!startAt) startAt = now
  const elapsed = now - startAt
  elapsedMs.value = elapsed

  if (!isFading.value) {
    const t = clamp(elapsed / runMs, 0, 1)
    const split = 0.84
    let value = 0
    if (t < split) {
      value = easeOutCubic(t / split) * 0.9
    } else {
      value = 0.9 + easeOutCubic((t - split) / (1 - split)) * 0.1
    }

    if (props.variant === 'hardcore' && value > 0.86 && value < 0.99) {
      value += Math.sin(elapsed / 33) * 0.003
    }

    progress.value = Math.max(progress.value, clamp(value * 100, 0, 100))

    if (!readyAt && elapsed >= runMs) {
      progress.value = 100
      readyAt = now
    }

    if (readyAt && elapsed >= props.minShowMs && now - readyAt >= holdMs) {
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
  if (sfxEnabled.value) {
    audioHint.value = '点击任意位置启用音效'
  }
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  stopSfx()
  if (audio?.ctx) {
    try {
      audio.ctx.close()
    } catch { }
  }
  audio = null
})
</script>

<template>
  <div
    class="intro-root bg-grid fixed inset-0 flex items-center justify-center transition-[opacity,transform] duration-[420ms] ease-out"
    :class="[
      isFading ? 'opacity-0 scale-[1.015]' : 'opacity-100 scale-100',
      props.variant === 'hardcore' ? 'intro-hardcore' : 'intro-clean',
    ]" :style="{ '--scan-opacity': scanOpacity }" @pointerdown="onPointerDown">
    <div class="intro-bg absolute inset-0"></div>
    <div class="intro-scanlines absolute inset-0"></div>
    <div v-if="props.variant === 'hardcore'" class="intro-noise absolute inset-0"></div>

    <div class="relative w-[min(720px,92vw)] px-3">
      <div class="retro-border bg-[#f9f9fa]/95 text-[#2d2d30] p-6 md:p-8 shadow-[10px_10px_0_rgba(45,45,48,0.18)]"
        :class="props.variant === 'hardcore' ? 'intro-panel-jitter' : ''">
        <div class="flex items-start justify-between gap-6">
          <div class="flex flex-col gap-1">
            <div class="font-vt323 text-3xl md:text-4xl leading-none tracking-wide text-shadow">
              引导 {{ timeCode }}
            </div>
            <div class="text-xs text-[#666] tracking-[0.2em]">磁带系统加载</div>
          </div>

          <div class="flex flex-col items-end gap-2">
            <div class="font-vt323 text-3xl md:text-4xl leading-none text-[#ff8800] text-shadow">
              {{ percent.toString().padStart(3, '0') }}%
            </div>
            <button type="button" class="retro-border px-3 py-1 text-xs bg-white/80 hover:bg-white transition-colors"
              :class="sfxEnabled ? 'intro-sfx-on' : 'intro-sfx-off'" @click.stop="onToggleSfx">
              音效：{{ sfxEnabled ? '开' : '关' }}
            </button>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-center">
          <div class="flex items-center gap-5 md:gap-7">
            <div class="intro-reel"></div>
            <div class="intro-tape-window">
              <div class="intro-tape-belt"></div>
            </div>
            <div class="intro-reel intro-reel-right"></div>
          </div>
        </div>

        <div class="mt-6">
          <div class="intro-progress-shell">
            <div class="intro-progress-fill" :style="{ width: `${percent}%` }">
              <div v-if="props.variant === 'hardcore'" class="intro-progress-texture"></div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 text-xs text-[#666]">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-2 w-2 rounded-full bg-[#ff8800]"
              :class="percent < 100 ? 'animate-pulse' : ''"></span>
            <span :class="props.variant === 'hardcore' ? 'intro-flicker' : ''">{{ stageText }}</span>
          </div>
          <div v-if="audioHint" class="text-[#666]">{{ audioHint }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.intro-root {
  color: var(--text-main);
  background-color: var(--bg-color);
}

.intro-bg {
  background:
    radial-gradient(820px 420px at 50% 28%, rgba(255, 136, 0, 0.18), rgba(255, 136, 0, 0) 62%),
    radial-gradient(760px 520px at 18% 115%, rgba(0, 163, 204, 0.16), rgba(0, 163, 204, 0) 60%),
    radial-gradient(760px 520px at 82% 115%, rgba(255, 136, 0, 0.10), rgba(255, 136, 0, 0) 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(230, 230, 234, 0.35));
}

.intro-scanlines {
  pointer-events: none;
  opacity: var(--scan-opacity);
  background: repeating-linear-gradient(to bottom,
      rgba(45, 45, 48, 0.10),
      rgba(45, 45, 48, 0.10) 1px,
      rgba(0, 0, 0, 0) 4px,
      rgba(0, 0, 0, 0) 9px);
  animation: intro-scan 7s linear infinite;
  mix-blend-mode: multiply;
}

@keyframes intro-scan {
  0% {
    transform: translateY(-10%);
  }

  100% {
    transform: translateY(10%);
  }
}

.intro-noise {
  pointer-events: none;
  opacity: 0.08;
  background-image:
    repeating-radial-gradient(circle at 30% 40%, rgba(45, 45, 48, 0.08), rgba(45, 45, 48, 0.08) 1px, rgba(0, 0, 0, 0) 2px),
    repeating-radial-gradient(circle at 70% 60%, rgba(45, 45, 48, 0.06), rgba(45, 45, 48, 0.06) 1px, rgba(0, 0, 0, 0) 3px);
  animation: intro-noise 0.25s steps(2) infinite;
}

@keyframes intro-noise {
  0% {
    transform: translate3d(0, 0, 0);
  }

  50% {
    transform: translate3d(-1px, 1px, 0);
  }

  100% {
    transform: translate3d(1px, -1px, 0);
  }
}

.text-shadow {
  text-shadow: 0 0 12px rgba(255, 136, 0, 0.26);
}

.intro-sfx-on {
  border-color: var(--accent-primary) !important;
  color: var(--text-main) !important;
}

.intro-sfx-off {
  border-color: rgba(45, 45, 48, 0.28) !important;
  color: var(--text-dim) !important;
}

.intro-panel-jitter {
  animation: intro-jitter 3.2s steps(2) infinite;
}

@keyframes intro-jitter {
  0% {
    transform: translate3d(0, 0, 0);
  }

  45% {
    transform: translate3d(0.5px, -0.5px, 0);
  }

  75% {
    transform: translate3d(-0.5px, 0.5px, 0);
  }

  100% {
    transform: translate3d(0, 0, 0);
  }
}

.intro-flicker {
  animation: intro-flicker 0.8s steps(2) infinite;
}

@keyframes intro-flicker {
  0% {
    opacity: 0.95;
  }

  50% {
    opacity: 0.65;
  }

  100% {
    opacity: 0.95;
  }
}

.intro-reel {
  width: 86px;
  height: 86px;
  border-radius: 9999px;
  border: 2px solid rgba(45, 45, 48, 0.95);
  position: relative;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.72), 0 0 18px rgba(255, 136, 0, 0.10);
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 136, 0, 0.14), rgba(255, 136, 0, 0) 58%),
    rgba(45, 45, 48, 0.06);
  overflow: hidden;
}

.intro-reel::before {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 9999px;
  border: 2px solid rgba(45, 45, 48, 0.28);
}

.intro-reel::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 48%, rgba(45, 45, 48, 0.82) 49%, rgba(45, 45, 48, 0.82) 51%, transparent 52%),
    linear-gradient(0deg, transparent 48%, rgba(45, 45, 48, 0.82) 49%, rgba(45, 45, 48, 0.82) 51%, transparent 52%);
  transform-origin: 50% 50%;
  animation: intro-spin 2.35s linear infinite;
  opacity: 0.55;
}

.intro-clean .intro-reel::after {
  animation-duration: 3.2s;
  opacity: 0.42;
}

.intro-reel-right::after {
  animation-direction: reverse;
}

@keyframes intro-spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.intro-tape-window {
  width: 260px;
  height: 26px;
  border: 2px solid rgba(45, 45, 48, 0.95);
  position: relative;
  overflow: hidden;
  background: rgba(45, 45, 48, 0.10);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.70);
}

.intro-tape-belt {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(255, 136, 0, 0.55) 28%, rgba(0, 163, 204, 0.18) 56%, rgba(0, 0, 0, 0) 100%),
    repeating-linear-gradient(90deg,
      rgba(45, 45, 48, 0.16),
      rgba(45, 45, 48, 0.16) 6px,
      rgba(0, 0, 0, 0) 6px,
      rgba(0, 0, 0, 0) 10px);
  opacity: 0.75;
  animation: intro-belt 1.05s linear infinite;
}

.intro-clean .intro-tape-belt {
  opacity: 0.45;
  animation-duration: 1.45s;
}

@keyframes intro-belt {
  0% {
    background-position: 0 0, 0 0;
  }

  100% {
    background-position: 260px 0, 120px 0;
  }
}

.intro-progress-shell {
  height: 18px;
  border: 2px solid rgba(45, 45, 48, 0.95);
  background: rgba(45, 45, 48, 0.08);
  overflow: hidden;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.70);
}

.intro-progress-fill {
  height: 100%;
  background: var(--accent-primary);
  position: relative;
  transition: width 70ms linear;
}

.intro-progress-texture {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(90deg,
      rgba(255, 255, 255, 0.34),
      rgba(255, 255, 255, 0.34) 6px,
      rgba(45, 45, 48, 0.12) 6px,
      rgba(45, 45, 48, 0.12) 10px);
  opacity: 0.28;
  mix-blend-mode: multiply;
  animation: intro-texture 0.7s linear infinite;
}

@keyframes intro-texture {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(30px);
  }
}
</style>
