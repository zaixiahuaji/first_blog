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
  username?: string // Author username
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
    searchMode: 'keyword' as 'keyword' | 'semantic',
    page: 1,
    limit: 12,
    total: 0,
    loading: false,
    error: null as string | null,
    posts: [] as PostItem[],
  }),
  getters: {
    // Filter logic moved to backend, but we keep this just in case, or for pre-fetched data
    // Actually, with server-side filtering, we should rely on state.posts directly
    // But to keep compatibility if filter is not 'all', we might want to ensure consistency
    // However, if we fetch with category param, state.posts will only contain that category.
    filteredPosts: (state) => state.posts, 
    activePost: (state) => state.posts.find((p) => p.id === state.activePostId),
    hasMore: (state) => state.posts.length < state.total,
  },
  actions: {
    setFilter(filter: PostFilter) {
      if (this.filter === filter) return
      this.filter = filter
      this.page = 1
      this.posts = []
      this.fetchPosts()
    },
    openPost(id: number | string) {
      this.activePostId = id
    },
    closePost() {
      this.activePostId = null
    },
    setSearchQuery(query: string, mode: 'keyword' | 'semantic' = 'keyword') {
      this.searchQuery = query
      this.searchMode = mode
      this.page = 1
      this.posts = []
      this.fetchPosts()
    },
    async loadMore() {
      if (this.loading || !this.hasMore) return
      this.page++
      await this.fetchPosts(true)
    },
    async fetchPosts(isLoadMore = false) {
      this.loading = true
      this.error = null
      try {
        const { postsControllerFindAll } = getPosts()
        
        const params: any = {
          page: this.page,
          limit: this.limit,
        }

        if (this.filter !== 'all') {
          params.category = this.filter
        }

        if (this.searchQuery) {
          if (this.searchMode === 'semantic') {
            params.vectorQ = this.searchQuery
          } else {
            params.q = this.searchQuery
          }
        }

        // Orval generated type is void, so we cast to any first
        const response = await postsControllerFindAll(params)
        
        console.log('Raw API Response (Orval):', response)

        const rawData = response as any
        // Handle array wrapped in { items: ... } (NestJS pagination)
        const items = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.items)
            ? rawData.items
            : []
        
        const total = rawData?.total ?? rawData?.length ?? 0
        this.total = total

        const mappedItems = items.map((item: any) => ({
          id: item.id ?? item._id ?? Math.random(),
          title: item.title ?? '无标题',
          category: item.category ?? 'tech',
          date: item.date ?? item.createdAt ?? item.created_at ?? new Date().toISOString(),
          excerpt: item.excerpt ?? item.description ?? '暂无摘要',
          content: item.content ?? item.body ?? '',
          username: item.username ?? item.author ?? 'Unknown',
        }))

        if (isLoadMore) {
          this.posts.push(...mappedItems)
        } else {
          this.posts = mappedItems
        }

      } catch (e) {
        this.error = '无法加载数据'
        console.error('Fetch posts failed:', e)
      } finally {
        this.loading = false
      }
    },
  },
})
