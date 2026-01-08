<script setup lang="ts">
defineProps<{
  signalStrength: number
}>()
</script>

<template>
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
</template>
