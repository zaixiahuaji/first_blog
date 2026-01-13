<script setup lang="ts">
import { usePostsStore } from '@/stores/posts'

const postsStore = usePostsStore()
</script>

<template>
  <div class="flex justify-center pb-12">
    <button
      @click="postsStore.loadMore()"
      class="bg-white border-2 border-[#00a3cc] text-[#00a3cc] px-8 py-3 uppercase tracking-widest hover:bg-[#00a3cc] hover:text-white transition-all duration-300 shadow-[4px_4px_0px_rgba(0,163,204,0.3)] hover:shadow-[6px_6px_0px_rgba(0,163,204,0.5)] bevel-box font-bold"
    >
      加载_下一扇区
    </button>
  </div>
</template>

