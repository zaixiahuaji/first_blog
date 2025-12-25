<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPosts } from '@/api/generated/posts/posts'
import PostEditor from '@/components/admin/PostEditor.vue'
import type { PostItem } from '@/stores/posts'

const router = useRouter()
const authStore = useAuthStore()

const posts = ref<PostItem[]>([])
const postsLoading = ref(false)

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
  } catch (e) {
    console.error('Failed to save post', e)
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}
const fetchPosts = async () => {
  postsLoading.value = true
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
  } finally {
    postsLoading.value = false
  }
}

const handleDelete = async (id: number | string) => {
  if (!confirm('确定要删除这篇文档吗？此操作不可逆。')) return

  try {
    const { postsControllerRemove } = getPosts()
    await postsControllerRemove(id.toString())
    await fetchPosts() // Refresh list
  } catch (e) {
    console.error('Failed to delete post', e)
    alert('删除失败')
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
        <button
          v-if="isAdminLike"
          @click="router.push('/admin/categories')"
          class="hover:underline"
        >
          [ 类别管理 ]
        </button>
        <button
          v-if="isSuperAdmin"
          @click="router.push('/admin/super-admin')"
          class="hover:underline"
        >
          [ 超级管理 ]
        </button>
        <button @click="handleLogout" class="hover:text-red-500 hover:underline">[ 断开连接 ]</button>
      </div>
    </header>

    <!-- Post Editor Modal -->
    <PostEditor
      :is-open="isEditorOpen"
      :post="editingPost"
      :is-loading="isSaving"
      @close="isEditorOpen = false"
      @save="handleSave"
    />

    <!-- Main Content -->
    <main class="flex-1 p-8 overflow-y-auto z-10 relative min-h-0 space-y-10">
      <section class="border border-[#00ff00]">
        <div v-if="postsLoading" class="text-center py-20 text-xl animate-pulse">
          >> 正在检索数据...
        </div>

        <div v-else>
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-[#00ff00] bg-[#00ff00]/10">
                <th class="p-4 font-bold uppercase w-20">ID</th>
                <th class="p-4 font-bold uppercase">标题</th>
                <th class="p-4 font-bold uppercase w-32">作者</th>
                <th class="p-4 font-bold uppercase w-32">分类</th>
                <th class="p-4 font-bold uppercase w-40">日期</th>
                <th class="p-4 font-bold uppercase w-48 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="post in posts"
                :key="post.id"
                class="border-b border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-colors group"
              >
                <td class="p-4 font-vt323 text-lg opacity-70">
                  #{{ post.id.toString().slice(0, 8) }}...
                </td>
                <td class="p-4 font-bold truncate max-w-xs">{{ post.title }}</td>
                <td class="p-4 font-vt323 text-lg">{{ post.username || 'UNKNOWN' }}</td>
                <td class="p-4 uppercase text-xs">
                  <span class="border border-[#00ff00] px-1">{{ post.category }}</span>
                </td>
                <td class="p-4 font-vt323 text-lg">{{ formatDate(post.date) }}</td>
                <td class="p-4 text-right space-x-4">
                  <button
                    @click="openEditEditor(post)"
                    class="hover:text-white hover:bg-[#00ff00] px-2 transition-colors"
                  >
                    EDIT
                  </button>
                  <button
                    @click="handleDelete(post.id)"
                    class="text-red-500 hover:bg-red-500 hover:text-black px-2 transition-colors"
                  >
                    DEL
                  </button>
                </td>
              </tr>
              <tr v-if="posts.length === 0">
                <td colspan="6" class="p-6 text-center text-xs opacity-60">暂无文章</td>
              </tr>
            </tbody>
          </table>
        </div>
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
</style>
