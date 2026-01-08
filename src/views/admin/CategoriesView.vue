<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCategoriesStore, type AdminCategory } from '@/stores/categories'
import type { CreateCategoryDto, UpdateCategoryDto } from '@/api/generated/model'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

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
  sortOrder: number | undefined
  isActive: boolean
}>({
  slug: '',
  name: '',
  description: '',
  color: categoriesStore.themeColors[0] ?? '#ff8800',
  sortOrder: undefined,
  isActive: true,
})

const createFormRef = ref<FormInstance>()
const createRules: FormRules = {
  slug: [
    { required: true, message: '请输入 slug', trigger: 'blur' },
    {
      pattern: /^[a-z0-9_]{1,12}$/,
      message: 'slug 仅允许 a-z / 0-9 / _，最长 12 位',
      trigger: 'blur',
    },
  ],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  color: [{ required: true, message: '请选择颜色', trigger: 'change' }],
}

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

watch(
  () => createForm.slug,
  (next) => {
    const normalized = normalizeSlug(next)
    if (normalized !== next) createForm.slug = normalized
  },
)

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
    ElMessage.success('排序已保存')
  } catch (e) {
    console.error('Reorder categories failed:', e)
    ElMessage.error('排序保存失败')
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
  if (!editForm.name.trim()) {
    ElMessage.warning('名称不能为空')
    return
  }

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
    ElMessage.success('已更新')
  } catch (e) {
    console.error('Update category failed:', e)
    ElMessage.error('更新失败')
  }
}

const activeUpdatingId = ref<string | null>(null)

const setActive = async (category: AdminCategory, nextIsActive: boolean) => {
  if (activeUpdatingId.value === category.id) return
  if (category.isActive === nextIsActive) return

  const prev = category.isActive
  category.isActive = nextIsActive
  activeUpdatingId.value = category.id

  try {
    await categoriesStore.updateCategory(category.id, { isActive: nextIsActive } as any)
    await refresh()
    ElMessage.success('状态已更新')
  } catch (e) {
    category.isActive = prev
    console.error('Toggle category failed:', e)
    ElMessage.error('操作失败')
  } finally {
    if (activeUpdatingId.value === category.id) activeUpdatingId.value = null
  }
}

const removeCategory = async (category: AdminCategory) => {
  if (category.isSystem) return

  try {
    await categoriesStore.deleteCategory(category.id)
    await refresh()
    ElMessage.success('已删除')
  } catch (e) {
    console.error('Delete category failed:', e)
    ElMessage.error('删除失败')
  }
}

const createCategory = async () => {
  const isValid = await createFormRef.value?.validate().catch(() => false)
  if (!isValid) {
    ElMessage.warning('请检查表单字段')
    return
  }

  const slug = normalizeSlug(createForm.slug)

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
    createFormRef.value?.resetFields()
    await refresh()
    ElMessage.success('创建成功')
  } catch (e) {
    console.error('Create category failed:', e)
    ElMessage.error('创建失败（可能是 slug 冲突或格式不合法）')
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
        <el-form
          ref="createFormRef"
          :model="createForm"
          :rules="createRules"
          label-position="top"
          @submit.prevent
        >
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <el-form-item class="lg:col-span-2" prop="slug" label="slug (^[a-z0-9_]{1,12}$)">
              <el-input v-model="createForm.slug" placeholder="e.g. life" maxlength="12" clearable />
            </el-form-item>

            <el-form-item class="lg:col-span-2" prop="name" label="名称">
              <el-input v-model="createForm.name" placeholder="显示名称" clearable />
            </el-form-item>

            <el-form-item class="lg:col-span-4" prop="description" label="描述 (可选)">
              <el-input v-model="createForm.description" placeholder="一句话描述" clearable />
            </el-form-item>

            <div class="lg:col-span-3 grid grid-cols-3 gap-4">
              <el-form-item class="col-span-2" prop="color" label="颜色">
                <el-select
                  v-model="createForm.color"
                  popper-class="terminal-color-dropdown"
                  class="terminal-color-select"
                  :teleported="false"
                >
                  <template #label="{ label }">
                    <div class="flex items-center gap-2 w-full">
                      <span class="font-mono text-xs">{{ String(label).toUpperCase() }}</span>
                      <span class="terminal-color-swatch ml-auto" :style="{ backgroundColor: createForm.color }"></span>
                    </div>
                  </template>

                  <el-option
                    v-for="color in categoriesStore.themeColors"
                    :key="color"
                    :label="color.toUpperCase()"
                    :value="color"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="font-mono text-xs">{{ color.toUpperCase() }}</span>
                      <span class="terminal-color-swatch" :style="{ backgroundColor: color }"></span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item class="col-span-1" prop="sortOrder" label="排序">
                <el-input-number
                  v-model="createForm.sortOrder"
                  :min="0"
                  :controls="false"
                  class="w-full"
                />
              </el-form-item>
            </div>
          </div>

          <div class="mt-2 flex items-center justify-between">
            <label class="flex items-center gap-2 text-xs uppercase opacity-80">
              <input v-model="createForm.isActive" type="checkbox" class="accent-[#00ff00]" />
              启用
            </label>
            <el-button type="primary" @click="createCategory">创建</el-button>
          </div>
        </el-form>
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

        <div
          class="w-full"
          v-loading="loading"
          element-loading-text="加载中..."
          element-loading-background="rgba(0,0,0,0.6)"
        >
          <el-alert
            v-if="error"
            class="m-4"
            type="error"
            show-icon
            :closable="false"
            :title="`错误：${error}`"
          />

          <table v-else class="w-full text-left border-collapse">
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
                    <el-input v-model="editForm.name" clearable />
                    <el-input v-model="editForm.description" placeholder="描述 (可选)" clearable />
                    <div class="flex items-center gap-2">
                      <span class="text-xs opacity-60 uppercase shrink-0">sortOrder</span>
                      <el-input-number
                        v-model.number="editForm.sortOrder"
                        :min="0"
                        :controls="false"
                        size="small"
                        class="w-28"
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
                    <el-select
                      v-model="editForm.color"
                      popper-class="terminal-color-dropdown"
                      class="terminal-color-select"
                      :teleported="false"
                    >
                      <template #label="{ label }">
                        <div class="flex items-center gap-2 w-full">
                          <span class="font-mono text-xs">{{ String(label).toUpperCase() }}</span>
                          <span class="terminal-color-swatch ml-auto" :style="{ backgroundColor: editForm.color }"></span>
                        </div>
                      </template>

                      <el-option
                        v-for="color in categoriesStore.themeColors"
                        :key="color"
                        :label="color.toUpperCase()"
                        :value="color"
                      >
                        <div class="flex items-center justify-between gap-3">
                          <span class="font-mono text-xs">{{ color.toUpperCase() }}</span>
                          <span class="terminal-color-swatch" :style="{ backgroundColor: color }"></span>
                        </div>
                      </el-option>
                    </el-select>
                  </div>
                  <div v-else class="flex items-center gap-2">
                    <div class="w-4 h-4 border border-[#00ff00]" :style="{ backgroundColor: category.color }"></div>
                    <span class="font-mono text-xs">{{ category.color.toUpperCase() }}</span>
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
                      type="button"
                      :disabled="activeUpdatingId === category.id"
                      @click="setActive(category, !category.isActive)"
                      class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-xs disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#00ff00]"
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

                    <el-popconfirm
                      v-if="!category.isSystem"
                      :title="`确定删除类别「${category.name}」(${category.slug})？\n该类别下的文章将迁移到 other。此操作不可逆。`"
                      confirm-button-text="删除"
                      cancel-button-text="取消"
                      cancel-button-type="default"
                      confirm-button-type="danger"
                      width="320"
                      @confirm="removeCategory(category)"
                    >
                      <template #reference>
                        <button
                          type="button"
                          class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase"
                        >
                          DEL
                        </button>
                      </template>
                    </el-popconfirm>
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

.terminal-color-swatch {
  width: 14px;
  height: 14px;
  border: 1px solid #00ff00;
  display: inline-block;
}

:deep(.terminal-color-select) {
  width: 100%;
}

:deep(.terminal-color-select .el-select__wrapper) {
  background-color: #000;
  box-shadow: none;
  border-radius: 0;
  border: 1px solid #00ff00;
  min-height: 40px;
  padding: 0 10px;
}

:deep(.terminal-color-select .el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #00ff00 inset;
}

:deep(.terminal-color-select .el-select__selected-item) {
  color: #00ff00;
}

:deep(.terminal-color-select .el-select__caret) {
  color: #00ff00;
}

:deep(.terminal-color-select .el-select__prefix) {
  margin-right: 8px;
}

:deep(.terminal-color-dropdown) {
  border: 1px solid #00ff00;
  border-radius: 0;
  background: #000;
  box-shadow: none;
}

:deep(.terminal-color-dropdown .el-select-dropdown__item) {
  color: #00ff00;
  background: #000;
  display:flex;
  align-items:center;
}

:deep(.terminal-color-dropdown .el-select-dropdown__item.is-hovering),
:deep(.terminal-color-dropdown .el-select-dropdown__item:hover) {
  background: rgba(0, 255, 0, 0.12);
}

:deep(.terminal-color-dropdown .el-select-dropdown__item.is-selected) {
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
  font-weight: 700;
}
</style>
