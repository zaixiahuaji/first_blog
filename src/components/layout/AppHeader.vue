<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePostsStore } from '@/stores/posts'

const router = useRouter()
const postsStore = usePostsStore()
const searchInput = ref('')
const isSearchFocused = ref(false)
const isSemanticSearch = ref(false)

const SEARCH_COOLDOWN_SEC = 3
const isSearchCooldownActive = ref(false)
const cooldownRemainingSec = ref(0)
let cooldownTimer: number | undefined

const startSearchCooldown = () => {
  if (cooldownTimer) window.clearInterval(cooldownTimer)
  isSearchCooldownActive.value = true
  cooldownRemainingSec.value = SEARCH_COOLDOWN_SEC

  cooldownTimer = window.setInterval(() => {
    cooldownRemainingSec.value -= 1
    if (cooldownRemainingSec.value <= 0) {
      isSearchCooldownActive.value = false
      cooldownRemainingSec.value = 0
      if (cooldownTimer) window.clearInterval(cooldownTimer)
      cooldownTimer = undefined
    }
  }, 1000)
}

const toggleSemanticSearch = () => {
  isSemanticSearch.value = !isSemanticSearch.value
}

const runSearch = () => {
  const query = searchInput.value.trim()

  if (!query) {
    postsStore.setSearchQuery('')
    return
  }

  if (isSearchCooldownActive.value) return

  postsStore.setSearchQuery(query, isSemanticSearch.value ? 'semantic' : 'keyword')
  startSearchCooldown()
}

const clearSearch = () => {
  searchInput.value = ''
  postsStore.setSearchQuery('')
}

const clock = ref('')
const titleRef = ref<HTMLElement | null>(null)

let clockTimer: number | undefined
let glitchTimer: number | undefined

const updateClock = () => {
  const now = new Date()
  clock.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onMounted(() => {
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  glitchTimer = window.setInterval(() => {
    if (Math.random() > 0.98 && titleRef.value) {
      const offset = Math.random() * 2 - 1
      titleRef.value.style.transform = `translate(${offset}px, 0)`
      window.setTimeout(() => {
        if (titleRef.value) {
          titleRef.value.style.transform = 'none'
        }
      }, 50)
    }
  }, 2000)
})

onUnmounted(() => {
  if (clockTimer) window.clearInterval(clockTimer)
  if (glitchTimer) window.clearInterval(glitchTimer)
  if (cooldownTimer) window.clearInterval(cooldownTimer)
})
</script>

<template>
  <header class="h-20 border-b-2 border-[#2d2d30] bg-white flex items-center justify-between px-6 z-10 shrink-0">
    <div class="flex items-center gap-4">
      <div
        class="w-10 h-10 border-2 border-[#2d2d30] flex items-center justify-center bg-[#ff8800] text-white font-bold text-xl rounded-sm shadow-[2px_2px_0px_#2d2d30]">
        H
      </div>
      <div class="hidden md:block">
        <h1 ref="titleRef" class="text-3xl tracking-[0.2em] font-bold text-[#2d2d30] uppercase">
          档案馆_84
        </h1>
        <p class="text-xs text-[#666] tracking-widest uppercase">磁性 // 记忆 // 光</p>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="flex-1 max-w-md mx-4 relative group flex gap-2 h-10">
      <!-- Semantic Toggle Button -->
      <button
        type="button"
        :disabled="isSearchCooldownActive"
        @click="toggleSemanticSearch"
        class="h-full w-24 border-2 flex items-center justify-center font-bold text-xs transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        :class="
          isSearchCooldownActive
            ? 'bg-[#e5e7eb] border-[#9ca3af] text-[#6b7280]'
            : isSemanticSearch
              ? 'bg-[#ff8800] border-[#ff8800] text-black shadow-[0_0_8px_#ff8800]'
              : 'bg-white border-[#2d2d30] text-[#2d2d30] hover:bg-[#2d2d30] hover:text-white'
        "
        title="切换搜索模式"
      >
        {{ isSearchCooldownActive ? `冷却 ${cooldownRemainingSec}s` : isSemanticSearch ? '语义搜索' : '精确搜索' }}
      </button>

      <div
        class="flex-1 flex items-center border-2 border-[#2d2d30] bg-[#f4f4f6] focus-within:bg-white transition-colors h-full"
        :class="{ 'shadow-[4px_4px_0px_#00a3cc] border-[#00a3cc]': isSearchFocused }">
        <!-- <span class="pl-3 text-[#2d2d30] font-bold">></span> -->
        <span class="pl-3 text-[#ff8800] font-bold blink">></span>
        <input v-model="searchInput" @keydown.enter.prevent="runSearch" @focus="isSearchFocused = true"
          @blur="isSearchFocused = false" type="text" :placeholder="isSemanticSearch ? '输入自然语言搜索...' : '搜索_数据...'"
          class="w-full bg-transparent border-none outline-none px-2 py-1.5 font-sharetech text-[#2d2d30] placeholder:text-[#999] uppercase" />
        <button v-if="searchInput" @click="clearSearch" class="px-2 text-[#2d2d30] hover:text-[#e62e2e] font-bold">
          X
        </button>
      </div>
    </div>

    <div class="hidden md:flex gap-6 items-center">
      <div @click="router.push('/admin/login')"
        class="text-xs border border-[#e62e2e] text-[#e62e2e] px-2 py-1 uppercase bg-[#e62e2e]/5 cursor-pointer hover:bg-[#e62e2e]/20 transition-colors"
        title="神秘按钮">
        REC ●
      </div>
      <div class="flex gap-1">
        <div class="w-3 h-8 bg-[#2d2d30] opacity-20"></div>
        <div class="w-3 h-8 bg-[#2d2d30] opacity-40"></div>
        <div class="w-3 h-8 bg-[#2d2d30] opacity-60"></div>
        <div class="w-3 h-8 bg-[#2d2d30] opacity-80"></div>
        <div class="w-3 h-8 bg-[#e62e2e]"></div>
      </div>
      <div class="text-xl font-vt323 text-[#00a3cc]">{{ clock }}</div>
    </div>
  </header>
</template>