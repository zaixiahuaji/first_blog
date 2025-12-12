<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePostsStore } from '@/stores/posts'
import BlogCard from './BlogCard.vue'

const postsStore = usePostsStore()
const { filteredPosts } = storeToRefs(postsStore)
</script>

<template>
  <div id="blog-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    <BlogCard v-for="post in filteredPosts" :key="post.id" :post="post" />
  </div>
</template>

