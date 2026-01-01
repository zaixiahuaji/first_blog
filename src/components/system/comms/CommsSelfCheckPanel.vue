<script setup lang="ts">
import type { PingStep } from './comms.types'

defineProps<{
  selfCheckRunning: boolean
  isCooldownActive: boolean
  cooldownRemainingSec: number
  pingTotal: PingStep
  pingCategories: PingStep
  overallOnline: boolean
  lastSelfCheckSuccessAt: number | null
  formatTime: (ts: number) => string
  stepStatus: (step: PingStep) => string
  humanLabel: (key: 'PING_TOTAL' | 'PING_CATEGORIES') => string
}>()

defineEmits<{
  (event: 'run'): void
}>()
</script>

<template>
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
        @click="$emit('run')"
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
            overallOnline ? 'border-[#00cc7a] text-[#00cc7a]' : 'border-[#ff8800] text-[#ff8800]'
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
</template>
