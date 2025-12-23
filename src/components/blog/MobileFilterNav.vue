<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useCategoriesStore } from '@/stores/categories'
import { usePostsStore, type PostFilter } from '@/stores/posts'

const postsStore = usePostsStore()
const { filter } = storeToRefs(postsStore)

const categoriesStore = useCategoriesStore()
const { activeCategories } = storeToRefs(categoriesStore)

const filterItems = computed<Array<{ label: string; value: PostFilter; color: string }>>(() => {
  const items: Array<{ label: string; value: PostFilter; color: string }> = [
    { label: '全部数据', value: 'all', color: '#2d2d30' },
  ]

  for (const category of activeCategories.value) {
    items.push({
      label: category.name,
      value: category.slug,
      color: category.color,
    })
  }

  return items
})

const setFilter = (value: PostFilter) => postsStore.setFilter(value)
const isActive = (value: PostFilter) => filter.value === value
</script>

<template>
  <div class="overflow-x-auto pb-2 scrollbar-hide">
    <nav class="flex gap-3 min-w-max">
      <button
        v-for="item in filterItems"
        :key="item.value"
        class="px-4 py-2 border-2 bg-white text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-colors"
        :style="{
          borderColor: item.color,
          color: isActive(item.value) ? '#fff' : item.color,
          backgroundColor: isActive(item.value) ? item.color : '#fff',
        }"
        @click="setFilter(item.value)"
      >
        :: {{ item.label }}
      </button>
    </nav>
  </div>
</template>
