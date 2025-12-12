<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePostsStore, type PostFilter, categoryAccentMap } from '@/stores/posts'

const postsStore = usePostsStore()
const { filter } = storeToRefs(postsStore)

const navItems: Array<{ label: string; value: PostFilter; accent: string }> = [
  { label: '根目录', value: 'all', accent: categoryAccentMap.tech },
  { label: '技术_日志', value: 'tech', accent: categoryAccentMap.tech },
  { label: '合成_波', value: 'music', accent: categoryAccentMap.music },
  { label: '视觉_影像', value: 'visuals', accent: categoryAccentMap.visuals },
]

const setFilter = (value: PostFilter) => {
  postsStore.setFilter(value)
}

const isActive = (value: PostFilter) => filter.value === value
</script>

<template>
  <aside class="w-64 bg-[#f4f4f6] border-r-2 border-[#2d2d30] hidden md:flex flex-col p-6 gap-6">
    <div class="border-2 border-[#2d2d30] p-1 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
      <div class="bg-[#f0f0f2] p-3">
        <h3 class="text-[#2d2d30] uppercase text-sm mb-4 border-b border-[#ccc] pb-1 font-bold">
          :: 目录
        </h3>
        <nav class="flex flex-col gap-3">
          <button
            v-for="item in navItems"
            :key="item.value"
            class="group text-left text-lg transition-colors flex items-center gap-2 font-bold"
            :style="{ color: isActive(item.value) ? item.accent : '#555' }"
            @click="setFilter(item.value)"
          >
            <span
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              :style="{ color: item.accent, opacity: isActive(item.value) ? 1 : undefined }"
            >
              >
            </span>
            {{ item.label }}
          </button>
        </nav>
      </div>
    </div>

    <div class="mt-auto border-t-2 border-[#ccc] pt-4">
      <h4 class="text-[#555] text-xs uppercase mb-2 font-bold">系统状态</h4>
      <div class="text-xs font-vt323 text-[#666] leading-tight">
        <p>CPU: 8% [正常]</p>
        <p>内存: 64KB [正常]</p>
        <p>磁带: A面 [播放]</p>
        <p class="mt-2 text-[#00a3cc] animate-pulse">连接已建立</p>
      </div>
    </div>
  </aside>
</template>

