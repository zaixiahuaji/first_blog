<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPosts } from '@/api/generated/posts/posts'
import PostEditor from '@/components/admin/PostEditor.vue'
import type { PostItem } from '@/stores/posts'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const posts = ref<PostItem[]>([])
const postsLoading = ref(false)
const postsError = ref<string | null>(null)

const isAdminLike = computed(() => authStore.isAdminLike)
const isSuperAdmin = computed(() => authStore.isSuperAdmin)

// Editor State
const isEditorOpen = ref(false)
const editingPost = ref<PostItem | null>(null)
const isSaving = ref(false)

const openCreateEditor = () => {
  editingPost.value = null
  isEditorOpen.value = true
}

const openEditEditor = (post: PostItem) => {
  editingPost.value = post
  isEditorOpen.value = true
}

const handleSave = async (postData: Partial<PostItem>) => {
  isSaving.value = true
  try {
    const { postsControllerCreate, postsControllerUpdate } = getPosts()

    if (editingPost.value) {
      // Update
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } =
        postData
      await postsControllerUpdate(editingPost.value.id, rest as any)
    } else {
      // Create
      const payload = {
        title: postData.title ?? '',
        category: postData.category ?? 'other',
        date: postData.date ?? '',
        excerpt: postData.excerpt ?? '',
        content: postData.content ?? '',
      }
      await postsControllerCreate(payload as any)
    }

    // Refresh and close
    await fetchPosts()
    isEditorOpen.value = false
    ElMessage.success(editingPost.value ? '已更新' : '已创建')
  } catch (e) {
    console.error('Failed to save post', e)
    ElMessage.error('保存失败')
  } finally {
    isSaving.value = false
  }
}
const fetchPosts = async () => {
  postsLoading.value = true
  postsError.value = null
  try {
    const { postsControllerFindAll } = getPosts()
    const response = await postsControllerFindAll({ page: 1, limit: 100 })
    let mappedPosts = response.items ?? []

    // Client-side RBAC Filtering (Fallback)
    if (authStore.user?.role === 'user' && authStore.user?.username) {
      const currentUsername = authStore.user.username
      mappedPosts = mappedPosts.filter((p: any) => p.username === currentUsername)
    }

    posts.value = mappedPosts
  } catch (e) {
    console.error('Failed to fetch posts', e)
    postsError.value = '无法加载文章列表'
  } finally {
    postsLoading.value = false
  }
}

const deletePost = async (id: number | string) => {
  try {
    const { postsControllerRemove } = getPosts()
    await postsControllerRemove(id.toString())
    await fetchPosts() // Refresh list
    ElMessage.success('已删除')
  } catch (e) {
    console.error('Failed to delete post', e)
    ElMessage.error('删除失败')
  }
}

const handleLogout = () => {
  authStore.logout()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

onMounted(() => {
  if (!authStore.user) {
    authStore.initialize()
  }
  fetchPosts()
})
</script>

<template>
  <div class="h-screen bg-[#0a0a0a] text-[#00ff00] font-sharetech flex flex-col overflow-hidden">
    <!-- CRT Overlay -->
    <div class="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
    <div class="fixed inset-0 scan-line z-40 pointer-events-none"></div>

    <!-- Top Bar -->
    <header class="border-b border-[#00ff00] p-4 flex justify-between items-center z-10 bg-[#0a0a0a] shrink-0">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold uppercase tracking-widest">控制面板</h1>
        <span class="text-xs border border-[#00ff00] px-2 py-0.5">
          {{ authStore.user?.role?.toUpperCase() || 'UNKNOWN' }}
        </span>
      </div>
      <div class="flex gap-4">
        <button @click="openCreateEditor" class="hover:underline">[ 新建文章 ]</button>
        <button v-if="isAdminLike" @click="router.push('/admin/categories')" class="hover:underline">
          [ 类别管理 ]
        </button>
        <button v-if="isSuperAdmin" @click="router.push('/admin/super-admin')" class="hover:underline">
          [ 超级管理 ]
        </button>
        <button @click="handleLogout" class="hover:text-red-500 hover:underline">[ 断开连接 ]</button>
      </div>
    </header>

    <!-- Post Editor Modal -->
    <PostEditor :is-open="isEditorOpen" :post="editingPost" :is-loading="isSaving" @close="isEditorOpen = false"
      @save="handleSave" />

    <!-- Main Content -->
    <main class="flex-1 p-8 overflow-y-auto z-10 relative min-h-0 space-y-10">
      <section class="border border-[#00ff00]">
        <el-alert v-if="postsError" class="m-4" type="error" show-icon :closable="false" :title="`错误：${postsError}`" />

        <el-table v-else class="terminal-posts-table" :data="posts" row-key="id" v-loading="postsLoading"
          element-loading-text=">> 正在检索数据..." element-loading-background="rgba(0,0,0,0.6)" empty-text="暂无文章">
          <el-table-column label="ID" width="140">
            <template #default="{ row }">
              <span class="font-vt323 text-lg opacity-70">#{{ String(row.id).slice(0, 8) }}...</span>
            </template>
          </el-table-column>

          <el-table-column label="标题" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="font-bold">{{ row.title }}</span>
            </template>
          </el-table-column>

          <el-table-column label="作者" width="160">
            <template #default="{ row }">
              <span class="font-vt323 text-base">{{ row.username || 'UNKNOWN' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="分类" width="160">
            <template #default="{ row }">
              <span class="border border-[#00ff00] px-1 uppercase text-xs">{{ row.category }}</span>
            </template>
          </el-table-column>

          <el-table-column label="日期" width="180">
            <template #default="{ row }">
              <span class="font-vt323 text-lg">{{ formatDate(row.date) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" align="right" header-align="right">
            <template #default="{ row }">
              <div class="flex justify-end gap-3">
                <button
                  type="button"
                  class="hover:text-black hover:bg-[#00ff00] px-2 transition-colors uppercase"
                  @click="openEditEditor(row)"
                >
                  EDIT
                </button>

                <el-popconfirm
                  title="确定要删除这篇文档吗？此操作不可逆。"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  cancel-button-type="default"
                  confirm-button-type="danger"
                  width="240"
                  @confirm="deletePost(row.id)"
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
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </main>

    <!-- Status Bar -->
    <footer class="border-t border-[#00ff00] p-2 text-xs flex justify-between opacity-60 z-10 bg-[#0a0a0a] shrink-0">
      <span>系统状态: 在线</span>
      <span>记录数: {{ posts.length }}</span>
    </footer>
  </div>
</template>

<style scoped>
.crt-overlay {
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 2px, 3px 100%;
}

:deep(.terminal-posts-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: rgba(0, 255, 0, 0.05);
}

:deep(.terminal-posts-table .el-table__cell) {
  border-right: none;
  padding: 0;
  vertical-align: middle;
}

:deep(.terminal-posts-table .el-table__cell .cell) {
  padding: 16px;
}

:deep(.terminal-posts-table .el-table__header-wrapper .el-table__cell) {
  background: rgba(0, 255, 0, 0.12);
  border-bottom: 1px solid rgba(0, 255, 0, 0.9);
}

:deep(.terminal-posts-table .el-table__header-wrapper .el-table__cell .cell) {
  font-weight: 700;
  text-transform: uppercase;
}

:deep(.terminal-posts-table .el-table__body-wrapper .el-table__cell) {
  background: transparent;
  border-bottom: 1px solid rgba(0, 255, 0, 0.3);
}

:deep(.terminal-posts-table .el-table__body tr:hover > td.el-table__cell) {
  background: rgba(0, 255, 0, 0.05);
}
</style>
