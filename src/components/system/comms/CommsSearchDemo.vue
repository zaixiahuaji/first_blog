<script setup lang="ts">
import { computed } from 'vue'
import type { SearchLaneState } from './comms.types'

const props = defineProps<{
  modelValue: string
  queryLen: number
  queryMaxLength: number
  activeCategoriesCount: number
  searchRunning: boolean
  isCooldownActive: boolean
  cooldownRemainingSec: number
  isQueryValid: boolean
  keywordLane: SearchLaneState
  semanticLane: SearchLaneState
  laneStatus: (lane: SearchLaneState) => string
  labelForCategory: (slug: string) => string
  colorForCategory: (slug: string) => string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'search'): void
}>()

const queryValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const laneTitle = (lane: 'keyword' | 'semantic') => (lane === 'keyword' ? '关键词' : '语义')
</script>

<template>
  <div class="border-2 border-[#2d2d30] bg-white p-6">
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div class="flex-1">
        <h3 class="text-sm font-bold uppercase text-[#2d2d30]">搜索演示</h3>
        <p class="font-vt323 text-[#666] mt-2">
          对比关键词 / 语义搜索，仅显示 Top5 的标题与类别。
        </p>
        <div class="mt-4 flex flex-col md:flex-row gap-3">
          <div class="flex-1">
            <input
              v-model="queryValue"
              type="text"
              :maxlength="queryMaxLength"
              class="w-full bg-[#f4f4f6] border-b-2 border-[#ccc] p-3 outline-none focus:border-[#00a3cc] focus:bg-white transition-colors font-sharetech"
              placeholder="输入查询..."
            />
            <div class="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#999]">
              长度 {{ queryLen }}/{{ queryMaxLength }}
              <span v-if="activeCategoriesCount > 0"> | 分类 {{ activeCategoriesCount }}</span>
            </div>
          </div>
          <button
            type="button"
            class="bg-[#2d2d30] text-white px-6 py-3 uppercase tracking-widest hover:bg-[#00a3cc] transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.2)] font-bold disabled:opacity-50 disabled:hover:bg-[#2d2d30]"
            :disabled="searchRunning || isCooldownActive || !isQueryValid"
            @click="$emit('search')"
          >
            {{
              isCooldownActive
                ? `冷却 ${cooldownRemainingSec}s`
                : searchRunning
                  ? '搜索中...'
                  : '搜索'
            }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-4">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold uppercase text-[#2d2d30]">
            {{ laneTitle('keyword') }}
          </div>
          <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
            {{ laneStatus(keywordLane) }}
          </div>
        </div>

        <div v-if="keywordLane.items.length === 0" class="mt-4 font-vt323 text-[#666]">
          {{ keywordLane.state === 'ok' ? '无结果' : '---' }}
        </div>
        <div v-else class="mt-4 space-y-2">
          <div
            v-for="item in keywordLane.items"
            :key="item.id"
            class="flex items-center justify-between gap-3 border-2 border-[#2d2d30] bg-white px-3 py-2"
          >
            <div class="min-w-0">
              <div class="font-bold text-[#2d2d30] truncate">{{ item.title }}</div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                {{ labelForCategory(item.category) }}
              </div>
            </div>
            <div
              class="w-3 h-3 border-2 border-[#2d2d30]"
              :style="{ backgroundColor: colorForCategory(item.category) }"
            ></div>
          </div>
        </div>
      </div>

      <div class="border-2 border-[#ccc] bg-[#f9f9fa] p-4">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold uppercase text-[#2d2d30]">
            {{ laneTitle('semantic') }}
          </div>
          <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
            {{ laneStatus(semanticLane) }}
          </div>
        </div>

        <div v-if="semanticLane.items.length === 0" class="mt-4 font-vt323 text-[#666]">
          {{ semanticLane.state === 'ok' ? '无结果' : '---' }}
        </div>
        <div v-else class="mt-4 space-y-2">
          <div
            v-for="item in semanticLane.items"
            :key="item.id"
            class="flex items-center justify-between gap-3 border-2 border-[#2d2d30] bg-white px-3 py-2"
          >
            <div class="min-w-0">
              <div class="font-bold text-[#2d2d30] truncate">{{ item.title }}</div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-[#666]">
                {{ labelForCategory(item.category) }}
              </div>
            </div>
            <div
              class="w-3 h-3 border-2 border-[#2d2d30]"
              :style="{ backgroundColor: colorForCategory(item.category) }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
