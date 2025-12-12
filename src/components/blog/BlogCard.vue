<script setup lang="ts">
import { computed } from 'vue'
import { categoryAccentMap, categoryLabelMap, type PostItem, usePostsStore } from '@/stores/posts'

const props = defineProps<{
  post: PostItem
}>()

const postsStore = usePostsStore()

const accentColor = computed(() => categoryAccentMap[props.post.category])
const accentShadow = computed(() => `4px 4px 0px ${accentColor.value}`)
const categoryLabel = computed(() => categoryLabelMap[props.post.category])

const openModal = () => {
  postsStore.openPost(props.post.id)
}
</script>

<template>
  <article
    class="bg-white flex flex-col h-full relative border-2 p-4 transition-transform hover:-translate-y-1 hover:shadow-lg"
    :style="{ borderColor: accentColor, '--accent': accentColor, '--accent-shadow': accentShadow }"
  >
    <div class="flex justify-between items-start mb-2 border-b border-gray-200 pb-2">
      <span
        class="text-xs uppercase px-1 font-bold"
        :style="{ color: accentColor, borderColor: accentColor, borderWidth: '1px', borderStyle: 'solid' }"
      >
        {{ categoryLabel }}
      </span>
      <span class="text-xs font-vt323 text-gray-500">{{ post.date }}</span>
    </div>
    <h3 class="text-xl font-bold mb-3 uppercase leading-tight text-[#2d2d30]">{{ post.title }}</h3>
    <div class="h-1 w-full mb-4 opacity-50" :style="{ backgroundColor: accentColor }"></div>
    <p class="text-sm text-gray-600 mb-6 flex-1 font-sans leading-relaxed">{{ post.excerpt }}</p>
    <div class="mt-auto flex justify-end">
      <button
        @click="openModal"
        class="px-4 py-1 text-sm font-bold uppercase transition-colors btn-accent"
      >
        阅读_更多_>
      </button>
    </div>

    <div
      class="absolute bottom-0 left-0 w-0 h-0 opacity-20"
      :style="{
        borderBottomWidth: '20px',
        borderLeftWidth: '20px',
        borderBottomColor: accentColor,
        borderLeftColor: 'transparent',
        borderStyle: 'solid',
      }"
    ></div>
  </article>
</template>

<style scoped>
.btn-accent {
  background-color: var(--accent);
  color: #fff;
  box-shadow: var(--accent-shadow);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.btn-accent:hover {
  background-color: #333;
  color: #fff;
}
</style>

