<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCategoriesStore, type AdminCategory } from '@/stores/categories'
import type { CreateCategoryDto, UpdateCategoryDto } from '@/api/generated/model'

const router = useRouter()
const authStore = useAuthStore()
const categoriesStore = useCategoriesStore()

const localCategories = ref<AdminCategory[]>([])
const isOrderDirty = ref(false)
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const editingId = ref<string | null>(null)
const editForm = reactive<{
  name: string
  description: string
  color: string
  sortOrder: number
  isActive: boolean
}>({
  name: '',
  description: '',
  color: categoriesStore.themeColors[0] ?? '#ff8800',
  sortOrder: 0,
  isActive: true,
})

const createForm = reactive<{
  slug: string
  name: string
  description: string
  color: string
  sortOrder: number | null
  isActive: boolean
}>({
  slug: '',
  name: '',
  description: '',
  color: categoriesStore.themeColors[0] ?? '#ff8800',
  sortOrder: null,
  isActive: true,
})

const isAdminLike = computed(
  () => authStore.userRole === 'admin' || authStore.userRole === 'super_admin',
)
const loading = computed(() => categoriesStore.loadingAdmin)
const error = computed(() => categoriesStore.errorAdmin)

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 12)

const refresh = async () => {
  await categoriesStore.fetchAdminCategories()
  localCategories.value = [...categoriesStore.adminCategories]
  isOrderDirty.value = false
}

watch(
  () => categoriesStore.adminCategories,
  (next) => {
    if (isOrderDirty.value) return
    localCategories.value = [...next]
  },
)

const move = (from: number, to: number) => {
  if (from === to) return
  if (from < 0 || to < 0) return
  if (from >= localCategories.value.length) return
  if (to >= localCategories.value.length) return

  const next = [...localCategories.value]
  const item = next[from]
  if (!item) return
  next.splice(from, 1)
  next.splice(to, 0, item)
  localCategories.value = next
  isOrderDirty.value = true
}

const moveUp = (index: number) => move(index, index - 1)
const moveDown = (index: number) => move(index, index + 1)

const onDragStart = (index: number, e: DragEvent) => {
  draggingIndex.value = index
  dragOverIndex.value = null
  try {
    e.dataTransfer?.setData('text/plain', String(index))
    e.dataTransfer?.setDragImage(new Image(), 0, 0)
  } catch {
    // ignore
  }
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

const onDragOver = (index: number, e: DragEvent) => {
  e.preventDefault()
  dragOverIndex.value = index
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

const onDragLeave = () => {
  dragOverIndex.value = null
}

const onDrop = (index: number, e: DragEvent) => {
  e.preventDefault()
  const from =
    draggingIndex.value ??
    Number.parseInt(e.dataTransfer?.getData('text/plain') ?? '-1', 10)
  draggingIndex.value = null
  dragOverIndex.value = null
  if (!Number.isFinite(from)) return
  if (from < 0) return
  move(from, index)
}

const saveOrder = async () => {
  if (!isOrderDirty.value) return
  try {
    await categoriesStore.reorderCategories({
      orderedIds: localCategories.value.map((c) => c.id),
    })
    await refresh()
  } catch (e) {
    console.error('Reorder categories failed:', e)
    alert('排序保存失败')
  }
}

const startEdit = (category: AdminCategory) => {
  editingId.value = category.id
  editForm.name = category.name
  editForm.description = category.description ?? ''
  editForm.color = category.color
  editForm.sortOrder = category.sortOrder
  editForm.isActive = category.isActive
}

const cancelEdit = () => {
  editingId.value = null
}

const saveEdit = async (category: AdminCategory) => {
  const payload: UpdateCategoryDto = {
    name: editForm.name.trim(),
    description: (editForm.description.trim() || undefined) as any,
    color: editForm.color as any,
    sortOrder: Number.isFinite(editForm.sortOrder) ? editForm.sortOrder : undefined,
    isActive: editForm.isActive,
  }

  try {
    await categoriesStore.updateCategory(category.id, payload as any)
    editingId.value = null
    await refresh()
  } catch (e) {
    console.error('Update category failed:', e)
    alert('更新失败')
  }
}

const toggleActive = async (category: AdminCategory) => {
  try {
    await categoriesStore.updateCategory(category.id, { isActive: !category.isActive } as any)
    await refresh()
  } catch (e) {
    console.error('Toggle category failed:', e)
    alert('操作失败')
  }
}

const removeCategory = async (category: AdminCategory) => {
  if (category.isSystem) return

  const ok = confirm(
    `确定删除类别「${category.name}」(${category.slug})？\n该类别下的文章将迁移到 other。此操作不可逆。`,
  )
  if (!ok) return

  try {
    await categoriesStore.deleteCategory(category.id)
    await refresh()
  } catch (e) {
    console.error('Delete category failed:', e)
    alert('删除失败')
  }
}

const createCategory = async () => {
  const slug = normalizeSlug(createForm.slug)
  if (!slug || !createForm.name.trim()) {
    alert('请填写 slug 和名称')
    return
  }

  const sortOrder =
    typeof createForm.sortOrder === 'number' && Number.isFinite(createForm.sortOrder)
      ? createForm.sortOrder
      : undefined

  const payload: CreateCategoryDto = {
    slug,
    name: createForm.name.trim(),
    description: createForm.description.trim() || undefined,
    color: createForm.color as any,
    sortOrder,
    isActive: createForm.isActive,
  }

  try {
    await categoriesStore.createCategory(payload as any)
    createForm.slug = ''
    createForm.name = ''
    createForm.description = ''
    createForm.color = categoriesStore.themeColors[0] ?? '#ff8800'
    createForm.sortOrder = null
    createForm.isActive = true
    await refresh()
  } catch (e) {
    console.error('Create category failed:', e)
    alert('创建失败（可能是 slug 冲突或格式不合法）')
  }
}

onMounted(async () => {
  if (!authStore.user) {
    authStore.initialize()
  }

  if (!isAdminLike.value) {
    router.replace('/admin/dashboard')
    return
  }

  await refresh()
})
</script>

<template>
  <div class="h-screen bg-[#0a0a0a] text-[#00ff00] font-sharetech flex flex-col overflow-hidden">
    <div class="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
    <div class="fixed inset-0 scan-line z-40 pointer-events-none"></div>

    <header
      class="border-b border-[#00ff00] p-4 flex justify-between items-center z-10 bg-[#0a0a0a] shrink-0"
    >
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold uppercase tracking-widest">类别管理</h1>
        <span class="text-xs border border-[#00ff00] px-2 py-0.5">
          {{ authStore.user?.role?.toUpperCase() || 'UNKNOWN' }}
        </span>
      </div>
      <div class="flex gap-4">
        <button @click="router.push('/admin/dashboard')" class="hover:underline">[ 返回面板 ]</button>
        <button @click="authStore.logout()" class="hover:text-red-500 hover:underline">[ 断开连接 ]</button>
      </div>
    </header>

    <main class="flex-1 p-8 overflow-y-auto z-10 relative min-h-0 space-y-10">
      <section class="border border-[#00ff00] p-6">
        <h2 class="text-lg font-bold uppercase mb-4">> 新建类别</h2>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-3 space-y-2">
            <label class="block text-xs uppercase opacity-80">slug (^[a-z0-9_]{1,12}$)</label>
            <input
              v-model="createForm.slug"
              @input="createForm.slug = normalizeSlug(createForm.slug)"
              class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
              placeholder="e.g. life"
            />
          </div>
          <div class="lg:col-span-3 space-y-2">
            <label class="block text-xs uppercase opacity-80">名称</label>
            <input
              v-model="createForm.name"
              class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
              placeholder="显示名称"
            />
          </div>
          <div class="lg:col-span-4 space-y-2">
            <label class="block text-xs uppercase opacity-80">描述 (可选)</label>
            <input
              v-model="createForm.description"
              class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
              placeholder="一句话描述"
            />
          </div>
          <div class="lg:col-span-2 grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="block text-xs uppercase opacity-80">颜色</label>
              <div class="flex items-center gap-2">
                <select
                  v-model="createForm.color"
                  class="flex-1 bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                >
                  <option v-for="color in categoriesStore.themeColors" :key="color" :value="color">
                    {{ color }}
                  </option>
                </select>
                <div class="w-4 h-4 border border-[#00ff00]" :style="{ backgroundColor: createForm.color }"></div>
              </div>
            </div>
            <div class="space-y-2">
              <label class="block text-xs uppercase opacity-80">排序</label>
              <input
                v-model.number="createForm.sortOrder"
                type="number"
                min="0"
                class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <label class="flex items-center gap-2 text-xs uppercase opacity-80">
            <input v-model="createForm.isActive" type="checkbox" class="accent-[#00ff00]" />
            启用
          </label>
          <button
            @click="createCategory"
            class="px-4 py-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase"
          >
            创建
          </button>
        </div>
      </section>

      <section class="border border-[#00ff00]">
        <div class="p-4 border-b border-[#00ff00] bg-[#00ff00]/10 flex items-center justify-between">
          <h2 class="text-lg font-bold uppercase">> 类别列表</h2>
          <div class="flex items-center gap-4">
            <button
              @click="refresh"
              class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase"
            >
              刷新
            </button>
            <button
              @click="saveOrder"
              :disabled="!isOrderDirty"
              class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#00ff00]"
            >
              保存排序
            </button>
          </div>
        </div>

        <div v-if="loading" class="p-8 text-center text-xl animate-pulse">>> 正在加载...</div>
        <div v-else-if="error" class="p-6 text-red-400 border-t border-[#00ff00]">错误：{{ error }}</div>

        <div v-else class="w-full">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[#00ff00] bg-[#00ff00]/10">
                <th class="p-4 font-bold uppercase w-16">#</th>
                <th class="p-4 font-bold uppercase w-28">拖拽</th>
                <th class="p-4 font-bold uppercase w-40">slug</th>
                <th class="p-4 font-bold uppercase">名称 / 描述</th>
                <th class="p-4 font-bold uppercase w-40">颜色</th>
                <th class="p-4 font-bold uppercase w-28">启用</th>
                <th class="p-4 font-bold uppercase w-56 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(category, index) in localCategories"
                :key="category.id"
                class="border-b border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-colors"
                :class="{
                  'opacity-60': !category.isActive,
                  'bg-[#00ff00]/10': dragOverIndex === index,
                }"
                draggable="true"
                @dragstart="onDragStart(index, $event)"
                @dragover="onDragOver(index, $event)"
                @dragleave="onDragLeave"
                @drop="onDrop(index, $event)"
              >
                <td class="p-4 font-vt323 text-lg opacity-70">{{ index + 1 }}</td>
                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <button
                      @click="moveUp(index)"
                      class="px-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors"
                      :disabled="index === 0"
                    >
                      ↑
                    </button>
                    <button
                      @click="moveDown(index)"
                      class="px-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors"
                      :disabled="index === localCategories.length - 1"
                    >
                      ↓
                    </button>
                    <span class="text-xs opacity-60">DRAG</span>
                  </div>
                </td>
                <td class="p-4 font-mono text-xs uppercase">
                  <span class="border border-[#00ff00] px-2 py-1">{{ category.slug }}</span>
                  <span v-if="category.isSystem" class="ml-2 text-xs opacity-70">[SYSTEM]</span>
                </td>

                <td class="p-4">
                  <div v-if="editingId === category.id" class="space-y-2">
                    <input
                      v-model="editForm.name"
                      class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                    />
                    <input
                      v-model="editForm.description"
                      class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                      placeholder="描述 (可选)"
                    />
                    <div class="flex items-center gap-2">
                      <span class="text-xs opacity-60 uppercase shrink-0">sortOrder</span>
                      <input
                        v-model.number="editForm.sortOrder"
                        type="number"
                        min="0"
                        class="w-28 bg-black border border-[#00ff00] p-1 text-[#00ff00] focus:outline-none font-sharetech text-xs"
                      />
                    </div>
                  </div>
                  <div v-else>
                    <div class="font-bold">{{ category.name }}</div>
                    <div class="text-xs opacity-70">{{ category.description || '-' }}</div>
                    <div class="text-xs opacity-60">sortOrder: {{ category.sortOrder }}</div>
                  </div>
                </td>

                <td class="p-4">
                  <div v-if="editingId === category.id" class="flex items-center gap-2">
                    <select
                      v-model="editForm.color"
                      class="flex-1 bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                    >
                      <option v-for="color in categoriesStore.themeColors" :key="color" :value="color">
                        {{ color }}
                      </option>
                    </select>
                    <div class="w-4 h-4 border border-[#00ff00]" :style="{ backgroundColor: editForm.color }"></div>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <div class="w-4 h-4 border border-[#00ff00]" :style="{ backgroundColor: category.color }"></div>
                    <span class="font-mono text-xs">{{ category.color }}</span>
                  </div>
                </td>

                <td class="p-4">
                  <div class="flex items-center gap-2">
                    <input
                      v-if="editingId === category.id"
                      v-model="editForm.isActive"
                      type="checkbox"
                      class="accent-[#00ff00]"
                    />
                    <button
                      v-else
                      @click="toggleActive(category)"
                      class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-xs"
                    >
                      {{ category.isActive ? 'ON' : 'OFF' }}
                    </button>
                  </div>
                </td>

                <td class="p-4 text-right space-x-3">
                  <template v-if="editingId === category.id">
                    <button
                      @click="saveEdit(category)"
                      class="hover:text-black hover:bg-[#00ff00] px-2 transition-colors uppercase"
                    >
                      SAVE
                    </button>
                    <button
                      @click="cancelEdit"
                      class="hover:text-white hover:bg-[#00ff00]/20 px-2 transition-colors uppercase"
                    >
                      CANCEL
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="startEdit(category)"
                      class="hover:text-black hover:bg-[#00ff00] px-2 transition-colors uppercase"
                    >
                      EDIT
                    </button>
                    <button
                      v-if="!category.isSystem"
                      @click="removeCategory(category)"
                      class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase"
                    >
                      DEL
                    </button>
                    <span v-else class="text-xs opacity-60">SYSTEM_LOCK</span>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer
      class="border-t border-[#00ff00] p-2 text-xs flex justify-between opacity-60 z-10 bg-[#0a0a0a] shrink-0"
    >
      <span>系统状态: 在线</span>
      <span>类别数: {{ localCategories.length }}</span>
    </footer>
  </div>
</template>

<style scoped>
.crt-overlay {
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 2px, 3px 100%;
}
</style>
