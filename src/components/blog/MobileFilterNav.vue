<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePostsStore, type PostFilter } from '@/stores/posts'

const postsStore = usePostsStore()
const { filter } = storeToRefs(postsStore)

const setFilter = (value: PostFilter) => postsStore.setFilter(value)
const isActive = (value: PostFilter) => filter.value === value
</script>

<template>
  <div class="overflow-x-auto pb-2 scrollbar-hide">
    <nav class="flex gap-3 min-w-max">
      <button
        class="px-4 py-2 border-2 border-[#2d2d30] text-[#2d2d30] bg-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-colors"
        :class="isActive('all') ? 'bg-[#2d2d30] text-white' : ''"
        @click="setFilter('all')"
      >
        :: 全部数据
      </button>
      <button
        class="px-4 py-2 border-2 border-[#999] text-[#555] bg-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-colors"
        :class="isActive('tech') ? 'bg-[#555] text-white' : ''"
        @click="setFilter('tech')"
      >
        :: 技术日志
      </button>
      <button
        class="px-4 py-2 border-2 border-[#e62e2e] text-[#e62e2e] bg-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-colors"
        :class="isActive('music') ? 'bg-[#e62e2e] text-white' : ''"
        @click="setFilter('music')"
      >
        :: 合成波
      </button>
      <button
        class="px-4 py-2 border-2 border-[#00a3cc] text-[#00a3cc] bg-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-colors"
        :class="isActive('visuals') ? 'bg-[#00a3cc] text-white' : ''"
        @click="setFilter('visuals')"
      >
        :: 视觉影像
      </button>
    </nav>
  </div>
</template>

