<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PostItem } from '@/stores/posts'

const props = defineProps<{
  isOpen: boolean
  post: PostItem | null
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', post: Partial<PostItem>): void
}>()

const formData = ref<Partial<PostItem>>({
  title: '',
  category: 'tech',
  date: '',
  excerpt: '',
  content: '',
})

// Date parts
const dateYear = ref('')
const dateMonth = ref('')
const dateDay = ref('')

// Update formData.date whenever parts change
const updateDate = () => {
  if (dateYear.value && dateMonth.value && dateDay.value) {
    formData.value.date = `${dateYear.value}-${dateMonth.value.padStart(2, '0')}-${dateDay.value.padStart(2, '0')}`
  } else {
    formData.value.date = ''
  }
}

watch(
  () => props.post,
  (newPost) => {
    if (newPost) {
      formData.value = { ...newPost }
      // Split existing date
      const date = new Date(newPost.date)
      if (!isNaN(date.getTime())) {
        dateYear.value = date.getFullYear().toString()
        dateMonth.value = (date.getMonth() + 1).toString().padStart(2, '0')
        dateDay.value = date.getDate().toString().padStart(2, '0')
      }
    } else {
      // Defaults for new post
      const today = new Date()
      dateYear.value = today.getFullYear().toString()
      dateMonth.value = (today.getMonth() + 1).toString().padStart(2, '0')
      dateDay.value = today.getDate().toString().padStart(2, '0')
      
      formData.value = {
        title: '',
        category: 'tech',
        excerpt: '',
        content: '',
      }
      updateDate() // Set initial date
    }
  },
  { immediate: true },
)

const handleSubmit = () => {
  updateDate() // Ensure date is synced
  emit('save', formData.value)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')"></div>

    <!-- Modal -->
    <div
      class="relative w-full max-w-5xl bg-[#0a0a0a] border-2 border-[#00ff00] shadow-[0_0_20px_rgba(0,255,0,0.2)] flex flex-col max-h-[90vh]"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-[#00ff00] bg-[#00ff00]/10">
        <h2 class="text-xl font-bold uppercase text-[#00ff00]">
          {{ post ? '> 编辑_扇区数据' : '> 写入_新数据' }}
        </h2>
        <button
          @click="emit('close')"
          class="w-8 h-8 flex items-center justify-center border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors font-bold"
        >
          X
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto custom-scrollbar">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div class="md:col-span-5 space-y-2">
              <label class="block text-[#00ff00] uppercase text-sm font-bold">标题</label>
              <input
                v-model="formData.title"
                type="text"
                required
                class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
              />
            </div>

            <div class="md:col-span-3 space-y-2">
              <label class="block text-[#00ff00] uppercase text-sm font-bold">分类</label>
              <select
                v-model="formData.category"
                class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
              >
                <option value="tech">技术_日志 (TECH)</option>
                <option value="music">合成_波 (MUSIC)</option>
                <option value="visuals">视觉_影像 (VISUALS)</option>
              </select>
            </div>

            <div class="md:col-span-4 space-y-2">
              <label class="block text-[#00ff00] uppercase text-sm font-bold">日期 (YYYY-MM-DD)</label>
              <div class="flex gap-2 items-center">
                <input
                  v-model="dateYear"
                  @input="updateDate"
                  type="text"
                  placeholder="YYYY"
                  maxlength="4"
                  class="flex-1 min-w-[4rem] bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech text-center"
                />
                <span class="text-[#00ff00] shrink-0">-</span>
                <input
                  v-model="dateMonth"
                  @input="updateDate"
                  type="text"
                  placeholder="MM"
                  maxlength="2"
                  class="w-14 shrink-0 bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech text-center"
                />
                <span class="text-[#00ff00] shrink-0">-</span>
                <input
                  v-model="dateDay"
                  @input="updateDate"
                  type="text"
                  placeholder="DD"
                  maxlength="2"
                  class="w-14 shrink-0 bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech text-center"
                />
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-[#00ff00] uppercase text-sm font-bold">摘要</label>
            <textarea
              v-model="formData.excerpt"
              rows="3"
              required
              class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
            ></textarea>
          </div>

          <div class="space-y-2">
            <label class="block text-[#00ff00] uppercase text-sm font-bold">正文内容 (支持 Markdown)</label>
            <textarea
              v-model="formData.content"
              rows="15"
              required
              class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-mono text-sm leading-relaxed"
            ></textarea>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-[#00ff00] bg-[#00ff00]/5 flex justify-end gap-4">
        <button
          type="button"
          @click="emit('close')"
          class="px-6 py-2 border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10 transition-colors uppercase"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="isLoading"
          class="px-6 py-2 bg-[#00ff00] text-black font-bold hover:bg-[#00cc00] transition-colors uppercase disabled:opacity-50"
        >
          {{ isLoading ? '写入中...' : '保存_数据' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0a0a0a;
  border-left: 1px solid #00ff00;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #00ff00;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #00cc00;
}
</style>
