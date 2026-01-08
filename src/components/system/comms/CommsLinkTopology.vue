<script setup lang="ts">
defineProps<{
  linkStatusText: string
  linkActiveColor: string
  linkBaseColor: string
  linkDotStyle: (index: number) => Record<string, string | number>
  isCooldownActive: boolean
  cooldownRemainingSec: number
  queryMaxLength: number
  requestTimeoutMs: number
}>()
</script>

<template>
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
          <div v-for="i in 3" :key="i" class="link-dot" :style="linkDotStyle(i - 1)"></div>
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
      Browser → API → DB → Vector | 冷却: {{ isCooldownActive ? `${cooldownRemainingSec}s` : '就绪' }} |
      最大长度: {{ queryMaxLength }} | 超时: {{ requestTimeoutMs / 1000 }}s
    </div>
  </div>
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
