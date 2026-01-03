<script setup lang="ts">
import { computed } from 'vue'
import { type PostItem, usePostsStore } from '@/stores/posts'
import { useCategoriesStore } from '@/stores/categories'

const props = defineProps<{
  post: PostItem
}>()

const postsStore = usePostsStore()
const categoriesStore = useCategoriesStore()

const accentColor = computed(() => categoriesStore.getColor(props.post.category))
const accentShadow = computed(() => `4px 4px 0px ${accentColor.value}80`)
const accentShadowHover = computed(() => `6px 6px 0px ${accentColor.value}`)
const categoryLabel = computed(() => categoriesStore.getLabel(props.post.category))

const openModal = () => {
  postsStore.openPost(props.post.id)
}
</script>

<template>
  <article
    class="bg-white flex flex-col h-full relative border-2 p-4 transition-transform hover:-translate-y-1 group card"
    :style="{
      borderColor: accentColor,
      '--accent': accentColor,
      '--accent-shadow': accentShadow,
      '--accent-shadow-hover': accentShadowHover,
    }"
  >
    <div class="flex justify-between items-start mb-2 border-b pb-2" :style="{ borderColor: '#eee' }">
      <span class="text-xs uppercase px-1 border-2 font-bold" :style="{ color: accentColor, borderColor: accentColor }">
        {{ categoryLabel }}
      </span>
      <span class="text-xs font-vt323 text-gray-500">{{ post.date }}</span>
    </div>
    <h3 class="text-xl font-bold mb-3 uppercase leading-tight text-[#2d2d30] transition-colors card-title">
      {{ post.title }}
    </h3>
    <div class="h-1 w-full mb-4 opacity-50" :style="{ backgroundColor: accentColor }"></div>
    <p class="text-sm text-gray-600 mb-6 flex-1 font-sans leading-relaxed">{{ post.excerpt }}</p>
    <div class="mt-auto flex justify-end">
      <button
        @click="openModal"
        class="px-4 py-1 text-sm font-bold uppercase transition-all duration-200 text-white btn-accent"
      >
        阅读_更多_>
      </button>
    </div>

    <div
      class="absolute bottom-0 left-0 w-0 h-0 border-b-[20px] border-l-[20px] border-l-transparent opacity-20"
      :style="{ borderBottomColor: accentColor }"
    ></div>
  </article>
</template>

<style scoped>
.card:hover .card-title {
  color: var(--accent);
}

.btn-accent {
  background-color: var(--accent);
  color: #fff;
  box-shadow: var(--accent-shadow);
  transition: all 0.2s ease;
}
.btn-accent:hover {
  background-color: #2d2d30;
  color: #fff;
  box-shadow: var(--accent-shadow-hover);
}
</style>
