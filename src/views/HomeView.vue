<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePostsStore } from '@/stores/posts'
import { useCategoriesStore } from '@/stores/categories'
import { useUiStore } from '@/stores/ui'
import { useMetricsStore } from '@/stores/metrics'
import BootLoader from '@/components/intro/BootLoader.vue'
import CrtEffects from '@/components/layout/CrtEffects.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import HeroBanner from '@/components/layout/HeroBanner.vue'
import BlogGrid from '@/components/blog/BlogGrid.vue'
import LoadMoreButton from '@/components/blog/LoadMoreButton.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PostModal from '@/components/blog/PostModal.vue'
import SystemDashboard from '@/components/system/SystemDashboard.vue'
import SystemComms from '@/components/system/SystemComms.vue'
import SystemDownloads from '@/components/system/SystemDownloads.vue'
import SystemLogs from '@/components/system/SystemLogs.vue'
import SystemSettings from '@/components/system/SystemSettings.vue'
import SystemAbout from '@/components/system/SystemAbout.vue'

const postsStore = usePostsStore()
const { loading, error } = storeToRefs(postsStore)

const categoriesStore = useCategoriesStore()

const uiStore = useUiStore()
const { activeView } = storeToRefs(uiStore)

const metricsStore = useMetricsStore()

const INTRO_COOLDOWN_MS = 60_000
const INTRO_COOLDOWN_KEY = 'huaji_intro_home_last_shown_at'

const readLastIntroShownAt = () => {
  try {
    const raw = localStorage.getItem(INTRO_COOLDOWN_KEY)
    if (!raw) return 0
    const value = Number(raw)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

const shouldShowIntro = () => {
  const lastShownAt = readLastIntroShownAt()
  if (!lastShownAt) return true
  return Date.now() - lastShownAt >= INTRO_COOLDOWN_MS
}

const markIntroShownNow = () => {
  try {
    localStorage.setItem(INTRO_COOLDOWN_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

const showIntro = ref(shouldShowIntro())
const handleIntroDone = () => {
  markIntroShownNow()
  showIntro.value = false
}

onMounted(() => {
  uiStore.applyToBody()
  categoriesStore.fetchActiveCategories()
  postsStore.fetchPosts()
  metricsStore.incrementPageviews()
  metricsStore.fetchMemoryUsage()
})

watch(activeView, (view) => {
  if (view !== 'archive') {
    postsStore.closePost()
  }
})
</script>

<template>
  <BootLoader v-if="showIntro" variant="hardcore" :duration-ms="3000" @done="handleIntroDone" />

  <Transition
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
  >
    <div
      v-if="!showIntro"
      class="h-screen w-screen flex flex-col relative bg-grid selection:bg-[#ff8800] selection:text-white text-[#2d2d30]"
    >
      <CrtEffects />

      <PostModal />

      <AppHeader />

      <div class="flex flex-1 overflow-hidden z-10">
        <SidebarNav />

        <main class="flex-1 overflow-y-auto p-4 md:p-8 bg-[#e6e6ea] relative scroll-smooth" id="main-viewport">
          <!-- 视图 1: 数据库 (默认) -->
          <div v-if="activeView === 'archive'" class="flex flex-col gap-12">
            <HeroBanner />

            <!-- Loading State -->
            <div v-if="loading && postsStore.page === 1" class="flex justify-center items-center py-20">
              <div class="font-vt323 text-2xl text-[#2d2d30] animate-pulse">
                正在从数据库加载记忆扇区...
              </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="flex justify-center items-center py-20">
              <div class="font-sharetech text-red-600 border border-red-600 p-4 bg-red-50">
                错误: {{ error }}
              </div>
            </div>

            <BlogGrid v-else />

            <LoadMoreButton v-if="!loading && !error && postsStore.hasMore" />
            <div
              v-if="!loading && !error && !postsStore.hasMore && postsStore.posts.length > 0"
              class="flex justify-center pb-12 font-vt323 text-gray-400"
            >
              -- 档案检索完毕 --
            </div>
          </div>

          <!-- 视图 2: 数据可视化 -->
          <SystemDashboard v-else-if="activeView === 'dashboard'" />

          <!-- 视图 3: 通讯链路 -->
          <SystemComms v-else-if="activeView === 'comms'" />

          <!-- 视图 4: 资源存档 -->
          <SystemDownloads v-else-if="activeView === 'downloads'" />

          <!-- 视图 5: 系统日志 -->
          <SystemLogs v-else-if="activeView === 'logs'" />

          <!-- 视图 6: 设置 -->
          <SystemSettings v-else-if="activeView === 'settings'" />

          <!-- 视图 7: 关于此站 -->
          <SystemAbout v-else-if="activeView === 'about'" />
        </main>
      </div>

      <AppFooter />
    </div>
  </Transition>
</template>
