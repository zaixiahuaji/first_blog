<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { usePostsStore } from '@/stores/posts'
import AppHeader from '@/components/layout/AppHeader.vue'
import SidebarNav from '@/components/layout/SidebarNav.vue'
import MobileFilterNav from '@/components/blog/MobileFilterNav.vue'
import HeroBanner from '@/components/layout/HeroBanner.vue'
import BlogGrid from '@/components/blog/BlogGrid.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PostModal from '@/components/blog/PostModal.vue'

const postsStore = usePostsStore()
const { loading, error } = storeToRefs(postsStore)

onMounted(() => {
  postsStore.fetchPosts()
})
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col relative bg-grid selection:bg-[#ff8800] selection:text-white text-[#2d2d30]"
  >
    <div class="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
    <div class="fixed inset-0 z-40 scan-line"></div>

    <PostModal />

    <AppHeader />

    <div class="flex flex-1 overflow-hidden z-10">
      <SidebarNav />

      <main
        class="flex-1 overflow-y-auto p-4 md:p-8 bg-[#e6e6ea] relative scroll-smooth flex flex-col gap-12"
      >
        <MobileFilterNav class="md:hidden" />
        <HeroBanner />

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-20">
          <div class="font-vt323 text-2xl text-[#2d2d30] animate-pulse">正在从数据库加载记忆扇区...</div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="flex justify-center items-center py-20">
          <div class="font-sharetech text-red-600 border border-red-600 p-4 bg-red-50">
            错误: {{ error }}
          </div>
        </div>

        <BlogGrid v-else />

        <div class="flex justify-center">
          <button
            class="bg-white border-2 border-[#00a3cc] text-[#00a3cc] px-8 py-3 uppercase tracking-widest hover:bg-[#00a3cc] hover:text-white transition-all duration-300 shadow-[4px_4px_0px_rgba(0,163,204,0.3)] hover:shadow-[6px_6px_0px_rgba(0,163,204,0.5)] bevel-box font-bold"
          >
            加载_下一扇区
          </button>
        </div>
      </main>
    </div>

    <AppFooter />
  </div>
</template>
