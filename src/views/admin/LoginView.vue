<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) {
    error.value = '请输入终端凭证'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.login({
      email: username.value,
      password: password.value,
    })
    router.push('/admin/dashboard')
  } catch (e: any) {
    error.value = '访问被拒绝: 凭证无效'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-[#00ff00] font-vt323 flex items-center justify-center p-4">
    <!-- CRT Overlay -->
    <div class="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
    <div class="fixed inset-0 scan-line z-40 pointer-events-none"></div>

    <div class="w-full max-w-md border-2 border-[#00ff00] p-8 relative shadow-[0_0_20px_rgba(0,255,0,0.2)]">
      <!-- Header -->
      <div class="text-center mb-8 border-b border-[#00ff00] pb-4">
        <h1 class="text-4xl uppercase tracking-widest mb-2">系统入口</h1>
        <p class="text-sm opacity-70">受限区域 // 仅限授权人员</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-xl mb-2">> 邮箱 / 账户:</label>
          <input
            v-model="username"
            type="text"
            class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
            autofocus
          />
        </div>

        <div>
          <label class="block text-xl mb-2">> 密码:</label>
          <input
            v-model="password"
            type="password"
            class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
          />
        </div>

        <!-- Error Message -->
        <div v-if="error" class="text-red-500 border border-red-500 p-2 text-center animate-pulse">
          !! {{ error }} !!
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-[#00ff00] text-black font-bold py-3 text-xl hover:bg-[#00cc00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
        >
          {{ isLoading ? '正在连接...' : '启动连接' }}
        </button>
      </form>

      <!-- Decorative Footer -->
      <div class="mt-8 text-center text-xs opacity-50">
        终端 ID: ADMIN-01 // 状态: 等待输入
      </div>

      <!-- Corner Decorations -->
      <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ff00]"></div>
      <div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00ff00]"></div>
      <div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00ff00]"></div>
      <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ff00]"></div>
    </div>
  </div>
</template>

<style scoped>
/* Specific Dark Mode Styles for Admin */
.crt-overlay {
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
    linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 2px, 3px 100%;
}
</style>

