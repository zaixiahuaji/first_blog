import { defineStore } from 'pinia'
import { getPosts } from '@/api/generated/posts/posts'

export type PostCategory = 'tech' | 'music' | 'visuals'
export type PostFilter = PostCategory | 'all'

export interface PostItem {
  id: number | string
  title: string
  category: PostCategory
  date: string
  excerpt: string
  content: string
}

export const categoryLabelMap: Record<PostCategory, string> = {
  tech: '技术',
  music: '音乐',
  visuals: '视觉',
}

export const categoryAccentMap: Record<PostCategory, string> = {
  tech: '#ff8800',
  music: '#e62e2e',
  visuals: '#00a3cc',
}

export const usePostsStore = defineStore('posts', {
  state: () => ({
    filter: 'all' as PostFilter,
    activePostId: null as number | string | null,
    searchQuery: '',
    loading: false,
    error: null as string | null,
    posts: [] as PostItem[],
  }),
  getters: {
    filteredPosts: (state) =>
      state.filter === 'all'
        ? state.posts
        : state.posts.filter((post) => post.category === state.filter),
    activePost: (state) => state.posts.find((p) => p.id === state.activePostId),
  },
  actions: {
    setFilter(filter: PostFilter) {
      this.filter = filter
    },
    openPost(id: number | string) {
      this.activePostId = id
    },
    closePost() {
      this.activePostId = null
    },
    setSearchQuery(query: string) {
      this.searchQuery = query
      this.fetchPosts()
    },
    async fetchPosts() {
      this.loading = true
      this.error = null
      try {
        const { postsControllerFindAll } = getPosts()
        // Orval generated type is void, so we cast to any first
        const response = await postsControllerFindAll({ q: this.searchQuery })
        
        console.log('Raw API Response (Orval):', response)

        const rawData = response as any
        // Handle array wrapped in { items: ... } (NestJS pagination) or { data: ... } or direct array
        const items = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.items)
            ? rawData.items
            : Array.isArray(rawData?.data)
              ? rawData.data
              : []

        // Map backend data to frontend model
        this.posts = items.map((item: any) => ({
          id: item.id ?? item._id ?? Math.random(),
          title: item.title ?? '无标题',
          category: item.category ?? 'tech',
          date: item.date ?? item.createdAt ?? item.created_at ?? new Date().toISOString(),
          excerpt: item.excerpt ?? item.description ?? '暂无摘要',
          content: item.content ?? item.body ?? '',
        }))
      } catch (e) {
        this.error = '无法加载数据'
        console.error('Fetch posts failed:', e)
      } finally {
        this.loading = false
      }
    },
  },
})
