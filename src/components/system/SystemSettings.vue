<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

const crtEnabled = computed({
  get: () => uiStore.crtEnabled,
  set: (value: boolean) => uiStore.setCrtEnabled(value),
})

const gridEnabled = computed({
  get: () => uiStore.gridEnabled,
  set: (value: boolean) => uiStore.setGridEnabled(value),
})

const uptimeSeconds = ref(0)
let timer: number | undefined

onMounted(() => {
  uiStore.applyToBody()
  timer = window.setInterval(() => {
    uptimeSeconds.value += 1
  }, 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-12 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30]">控制_面板</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- 视觉设置 -->
      <div class="border-2 border-[#ccc] p-6 bg-[#f9f9fa]">
        <h3 class="text-xl font-bold text-[#ff8800] mb-4 flex items-center gap-2">
          <span class="w-2 h-2 bg-[#ff8800]"></span> 视觉协议
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

          <label class="flex items-center justify-between cursor-pointer group">
            <span class="font-bold text-[#555]">背景网格</span>
            <div class="relative inline-block w-12 h-6 transition duration-200 ease-in-out">
              <input
                v-model="gridEnabled"
                type="checkbox"
                class="absolute block w-6 h-6 rounded-full bg-white border-4 border-[#ccc] appearance-none cursor-pointer checked:right-0 checked:border-[#00a3cc] right-6 transition-all"
              />
              <span class="block overflow-hidden h-6 rounded-full bg-[#e6e6ea] cursor-pointer border-2 border-[#ccc]"></span>
            </div>
          </label>
        </div>
      </div>

      <!-- 系统信息 -->
      <div class="border-2 border-[#2d2d30] p-6 bg-[#2d2d30] text-white font-vt323">
        <h3 class="text-xl font-bold text-[#00a3cc] mb-4">核心转储</h3>
        <div class="space-y-2 text-lg">
          <p>架构: Vue 3</p>
          <p>渲染引擎: Vite + Browser</p>
          <p>
            正常运行时间: <span>{{ uptimeSeconds }}</span
            >s
          </p>
          <div class="mt-4 pt-4 border-t border-[#555] text-[#ccc]">
            <p class="mb-2">内存使用率:</p>
            <div class="w-full bg-[#555] h-4 border border-white">
              <div class="bg-[#e62e2e] h-full w-[34%] animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

