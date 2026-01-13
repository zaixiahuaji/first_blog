import { defineStore } from 'pinia'
import { getCategories } from '@/api/generated/categories/categories'
import { getAdminCategories } from '@/api/generated/admin-categories/admin-categories'
import { CreateCategoryDtoColor } from '@/api/generated/model'
import type {
  CreateCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
} from '@/api/generated/model'

export interface PublicCategory {
  id: string
  slug: string
  name: string
  color: string
  sortOrder: number
}

export interface AdminCategory extends PublicCategory {
  description?: string | null
  isActive: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

const DEFAULT_FALLBACK_COLOR = '#2d2d30'

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const sortByOrder = <T extends { sortOrder?: number }>(items: T[]): T[] =>
  [...items].sort(
    (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
  )

export const useCategoriesStore = defineStore('categories', {
  state: () => ({
    activeCategories: [] as PublicCategory[],
    adminCategories: [] as AdminCategory[],
    loadingActive: false,
    loadingAdmin: false,
    errorActive: null as string | null,
    errorAdmin: null as string | null,
  }),
  getters: {
    themeColors: () => Object.values(CreateCategoryDtoColor),
    activeBySlug: (state) => {
      const map: Record<string, PublicCategory> = {}
      for (const category of state.activeCategories) map[category.slug] = category
      return map
    },
    adminBySlug: (state) => {
      const map: Record<string, AdminCategory> = {}
      for (const category of state.adminCategories) map[category.slug] = category
      return map
    },
  },
  actions: {
    getLabel(slug: string): string {
      return (
        this.activeBySlug[slug]?.name ||
        this.adminBySlug[slug]?.name ||
        slug ||
        'UNKNOWN'
      )
    },
    getColor(slug: string): string {
      return (
        this.activeBySlug[slug]?.color ||
        this.adminBySlug[slug]?.color ||
        DEFAULT_FALLBACK_COLOR
      )
    },
    async fetchActiveCategories() {
      if (this.loadingActive) return
      this.loadingActive = true
      this.errorActive = null
      try {
        const { categoriesControllerFindActive } = getCategories()
        const res = await categoriesControllerFindActive()
        this.activeCategories = sortByOrder(toArray<PublicCategory>(res))
      } catch (e) {
        console.error('Fetch active categories failed:', e)
        this.errorActive = '无法加载类别'
        this.activeCategories = []
      } finally {
        this.loadingActive = false
      }
    },
    async fetchAdminCategories() {
      if (this.loadingAdmin) return
      this.loadingAdmin = true
      this.errorAdmin = null
      try {
        const { adminCategoriesControllerAdminFindAll } = getAdminCategories()
        const res = await adminCategoriesControllerAdminFindAll()
        this.adminCategories = sortByOrder(toArray<AdminCategory>(res))
      } catch (e) {
        console.error('Fetch admin categories failed:', e)
        this.errorAdmin = '无法加载管理端类别'
        this.adminCategories = []
      } finally {
        this.loadingAdmin = false
      }
    },
    async createCategory(payload: CreateCategoryDto) {
      const { adminCategoriesControllerCreate } = getAdminCategories()
      await adminCategoriesControllerCreate(payload as any)
      await this.fetchAdminCategories()
    },
    async updateCategory(id: string, payload: UpdateCategoryDto) {
      const { adminCategoriesControllerUpdate } = getAdminCategories()
      await adminCategoriesControllerUpdate(id, payload as any)
      await this.fetchAdminCategories()
    },
    async deleteCategory(id: string) {
      const { adminCategoriesControllerRemove } = getAdminCategories()
      await adminCategoriesControllerRemove(id)
      await this.fetchAdminCategories()
    },
    async reorderCategories(payload: ReorderCategoriesDto) {
      const { adminCategoriesControllerReorder } = getAdminCategories()
      await adminCategoriesControllerReorder(payload as any)
      await this.fetchAdminCategories()
    },
  },
})
