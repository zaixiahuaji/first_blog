import { defineStore } from 'pinia'
import { getPosts } from '@/api/generated/posts/posts'
import type { PostDto, PostsControllerFindAllParams } from '@/api/generated/model'

export type PostFilter = 'all' | string

export type PostItem = PostDto

export const usePostsStore = defineStore('posts', {
  state: () => ({
    filter: 'all' as PostFilter,
    activePostId: null as string | null,
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
    openPost(id: string) {
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

        const params: PostsControllerFindAllParams = {
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

        const response = await postsControllerFindAll(params)

        this.total = response.total ?? 0

        if (isLoadMore) {
          this.posts.push(...(response.items ?? []))
        } else {
          this.posts = response.items ?? []
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
