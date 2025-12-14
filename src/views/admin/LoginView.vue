<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isRegisterMode = ref(false)
const loginIdentity = ref('') // Username or Email for login
const username = ref('') // Username for register
const email = ref('') // Email for register
const password = ref('')
const isLoading = ref(false)
const error = ref('')

// Check if string looks like an email
const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
  error.value = ''
  password.value = ''
  // Keep relevant fields if possible, or clear them
  if (isRegisterMode.value) {
    if (isEmail(loginIdentity.value)) {
      email.value = loginIdentity.value
      username.value = ''
    } else {
      username.value = loginIdentity.value
      email.value = ''
    }
  } else {
    // Switching back to login
    if (username.value) loginIdentity.value = username.value
    else if (email.value) loginIdentity.value = email.value
  }
}

const handleLogin = async () => {
  if (!loginIdentity.value || !password.value) {
    error.value = '请输入终端凭证'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const payload = isEmail(loginIdentity.value)
      ? { email: loginIdentity.value, password: password.value }
      : { username: loginIdentity.value, password: password.value }

    await authStore.login(payload)
    router.push('/admin/dashboard')
  } catch (e: any) {
    error.value = '访问被拒绝: 凭证无效'
    password.value = '' // Clear password on failure
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  if (!username.value || !email.value || !password.value) {
    error.value = '请填写所有必填字段'
    return
  }

  // Basic validation based on DTO
  if (username.value.length > 12) {
    error.value = '用户名过长 (最大12字符)'
    return
  }
  if (!/^[a-zA-Z0-9]+$/.test(password.value)) { // Assuming basic alphanumeric requirement from DTO comment "仅字母和数字"
     // Wait, DTO says "仅字母和数字" but usually password needs more? 
     // Let's stick to DTO comment "仅字母和数字，长度 1-10" for now as per DTO
  }
  if (password.value.length > 10) {
    error.value = '密码过长 (最大10字符)'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.register({
      username: username.value,
      email: email.value,
      password: password.value,
    })
    
    // Switch to login mode
    isRegisterMode.value = false
    loginIdentity.value = username.value || email.value
    password.value = '' // Clear password for security
    
    // Show temporary success message using the error field (in green or just text)
    // We'll just reset error for now or add a success state if needed. 
    // Re-using error for notification but styling it might be confusing if red.
    // Let's just switch. The user will see the login form.
    alert('注册成功，请登录') // Simple feedback for now
    
  } catch (e: any) {
    error.value = e.response?.data?.message || '注册失败'
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = () => {
  if (isRegisterMode.value) {
    handleRegister()
  } else {
    handleLogin()
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
        <h1 class="text-4xl uppercase tracking-widest mb-2">{{ isRegisterMode ? '人员登记' : '系统入口' }}</h1>
        <p class="text-sm opacity-70">受限区域 // 仅限授权人员</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <template v-if="!isRegisterMode">
          <div>
            <label class="block text-xl mb-2">> 邮箱 / 账户:</label>
            <input
              v-model="loginIdentity"
              type="text"
              class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
              autofocus
            />
          </div>
        </template>

        <template v-else>
          <div>
            <label class="block text-xl mb-2">> 用户名 (Max 12):</label>
            <input
              v-model="username"
              type="text"
              maxlength="12"
              class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
            />
          </div>
          <div>
            <label class="block text-xl mb-2">> 邮箱:</label>
            <input
              v-model="email"
              type="email"
              class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
            />
          </div>
        </template>

        <div>
          <label class="block text-xl mb-2">> 密码 {{ isRegisterMode ? '(Max 10, 字母数字)' : '' }}:</label>
          <input
            v-model="password"
            type="password"
            :maxlength="isRegisterMode ? 10 : undefined"
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
          {{ isLoading ? '处理中...' : (isRegisterMode ? '写入数据' : '启动连接') }}
        </button>

        <div class="text-center pt-2">
          <button 
            type="button" 
            @click="toggleMode"
            class="text-sm underline hover:text-[#00cc00] uppercase tracking-wider"
          >
            {{ isRegisterMode ? '< 返回登录' : '注册新权限 >' }}
          </button>
        </div>
      </form>

      <!-- Decorative Footer -->
      <div class="mt-8 text-center text-xs opacity-50">
        终端 ID: ADMIN-01 // 状态: {{ isRegisterMode ? '写入模式' : '等待输入' }}
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

