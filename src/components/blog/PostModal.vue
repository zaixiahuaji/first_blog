<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { marked } from 'marked'
import { usePostsStore, categoryAccentMap, categoryLabelMap } from '@/stores/posts'

const postsStore = usePostsStore()
const { activePost } = storeToRefs(postsStore)

const closeModal = () => {
  postsStore.closePost()
}

const onEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeModal()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onEscape)
  document.body.style.overflow = 'hidden' // Lock body scroll
})

onUnmounted(() => {
  document.removeEventListener('keydown', onEscape)
  document.body.style.overflow = ''
})

const accentColor = computed(() =>
  activePost.value ? categoryAccentMap[activePost.value.category] : '#2d2d30',
)
const accentShadow = computed(() => `6px 6px 0px ${accentColor.value}`)
const categoryLabel = computed(() =>
  activePost.value ? categoryLabelMap[activePost.value.category] : '',
)

const parsedContent = computed(() => {
  if (!activePost.value?.content) return ''
  return marked.parse(activePost.value.content)
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="activePost" class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" role="dialog"
      aria-modal="true">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-[#2d2d30]/80 backdrop-blur-sm crt-overlay" @click="closeModal"></div>

      <!-- Modal Content -->
      <div
        class="relative bg-white border-2 border-[#2d2d30] flex flex-col shadow-[6px_6px_0px_#2d2d30] w-[90%] md:w-[75%] h-[75vh]"
        :style="{ '--accent': accentColor, boxShadow: accentShadow, borderColor: accentColor }" @click.stop>
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b-2 border-inherit bg-[#f4f4f6]">
          <div class="flex items-center gap-3">
            <span class="text-xs uppercase px-1 font-bold border border-current" :style="{ color: accentColor }">
              {{ categoryLabel }}
            </span>
            <span class="text-xs font-vt323 text-gray-500">
              ID: {{ activePost.id.toString().padStart(4, '0') }}
            </span>
          </div>
          <button @click="closeModal"
            class="w-8 h-8 flex items-center justify-center border-2 border-[#2d2d30] hover:bg-[#2d2d30] hover:text-white transition-colors font-bold font-sharetech"
            aria-label="Close">
            X
          </button>
        </div>

        <!-- Scrollable Body -->
        <div class="overflow-y-auto p-6 md:p-8 relative flex-1">
          <h2 class="text-3xl md:text-4xl font-bold mb-2 text-[#2d2d30] uppercase leading-tight -ml-1">
            {{ activePost.title }}
          </h2>

          <div class="text-sm font-vt323 text-[#666] mb-6 flex items-center gap-2">
            <span class="text-[#00a3cc] uppercase tracking-wider">作者：{{ activePost.username || 'UNKNOWN_USER' }}</span>
          </div>

          <div class="font-vt323 text-gray-500 mb-6 flex items-center gap-2">
            <span>发布日期: {{ activePost.date }}</span>
            <span class="w-full h-[1px] bg-gray-300 block flex-1"></span>
          </div>

          <div 
            class="prose prose-slate max-w-none font-sharetech text-lg leading-relaxed text-[#444] markdown-content"
            v-html="parsedContent"
          >
          </div>
        </div>

        <!-- Footer -->
        <div
          class="p-4 border-t-2 border-inherit bg-[#f4f4f6] flex justify-between items-center text-xs text-gray-500 font-vt323">
          <span>终端连接中...</span>
          <span class="uppercase animate-pulse" :style="{ color: accentColor }">读取完毕</span>
        </div>

        <!-- Decorative Corners -->
        <div class="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4" :style="{ borderColor: accentColor }"></div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4" :style="{ borderColor: accentColor }">
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* Markdown Styles */
:deep(.markdown-content h1),
:deep(.markdown-content h2),
:deep(.markdown-content h3) {
  color: #2d2d30;
  font-weight: bold;
  text-transform: uppercase;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.2;
}

:deep(.markdown-content h1) { font-size: 1.5em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
:deep(.markdown-content h2) { font-size: 1.25em; }
:deep(.markdown-content h3) { font-size: 1.1em; }

:deep(.markdown-content p) {
  margin-bottom: 1em;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  margin-left: 1.5em;
  margin-bottom: 1em;
}

:deep(.markdown-content ul) { list-style-type: square; }
:deep(.markdown-content ol) { list-style-type: decimal; }

:deep(.markdown-content blockquote) {
  border-left: 4px solid var(--accent);
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  color: #666;
  background: #f4f4f6;
  padding: 0.5em 1em;
}

:deep(.markdown-content code) {
  font-family: 'Share Tech Mono', monospace;
  background-color: #f4f4f6;
  padding: 0.2em 0.4em;
  border-radius: 2px;
  font-size: 0.9em;
  color: #e62e2e;
}

:deep(.markdown-content pre) {
  background-color: #2d2d30;
  color: #f4f4f6;
  padding: 1em;
  overflow-x: auto;
  margin-bottom: 1em;
  border-radius: 4px;
}

:deep(.markdown-content pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
  font-size: 0.9em;
}

:deep(.markdown-content a) {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
