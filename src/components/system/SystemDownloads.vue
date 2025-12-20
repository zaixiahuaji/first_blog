<script setup lang="ts">
type DownloadFile = {
  name: string
  size: string
  type: string
}

const files: DownloadFile[] = [
  { name: 'Schema_84.pdf', size: '1.2MB', type: 'DOC' },
  { name: 'Synth_Wave_v2.mp3', size: '4.5MB', type: 'AUD' },
  { name: 'Grid_Layout_Main.css', size: '12KB', type: 'SRC' },
  { name: 'Memory_Dump.bin', size: '256KB', type: 'BIN' },
  { name: 'Avatar_Protocol.png', size: '840KB', type: 'IMG' },
]
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30]">数据_存档</h2>

    <div class="grid grid-cols-1 gap-4">
      <div
        v-for="file in files"
        :key="file.name"
        class="flex items-center justify-between border-2 border-[#ccc] p-4 hover:border-[#ff8800] bg-[#f9f9fa] group transition-colors"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 bg-[#2d2d30] text-white flex items-center justify-center font-bold text-xs"
          >
            {{ file.type }}
          </div>
          <div>
            <div class="font-bold text-[#2d2d30] group-hover:text-[#ff8800]">{{ file.name }}</div>
            <div class="text-xs font-vt323 text-[#666]">{{ file.size }}</div>
          </div>
        </div>
        <button
          class="px-4 py-2 border-2 border-[#2d2d30] text-xs font-bold uppercase hover:bg-[#2d2d30] hover:text-white transition-colors"
        >
          下载_→
        </button>
      </div>
    </div>
  </section>
</template>

