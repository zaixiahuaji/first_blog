<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminBootLoader from '@/components/intro/AdminBootLoader.vue'
import RegisterSuccessModal from '@/components/admin/RegisterSuccessModal.vue'

const router = useRouter()
const authStore = useAuthStore()

const isRegisterMode = ref(false)
const username = ref('')
const password = ref('')
const inviteCode = ref('')
const isLoading = ref(false)
const error = ref('')
const registerSuccessOpen = ref(false)
const usernameInput = ref<HTMLInputElement | null>(null)

const INVITE_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/
const INTRO_COOLDOWN_MS = 60_000
const INTRO_COOLDOWN_KEY = 'huaji_intro_admin_last_shown_at'

const readLastIntroShownAt = () => {
  try {
    const raw = localStorage.getItem(INTRO_COOLDOWN_KEY)
    if (!raw) return 0
    const value = Number(raw)
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

const shouldShowIntro = () => {
  const lastShownAt = readLastIntroShownAt()
  if (!lastShownAt) return true
  return Date.now() - lastShownAt >= INTRO_COOLDOWN_MS
}

const markIntroShownNow = () => {
  try {
    localStorage.setItem(INTRO_COOLDOWN_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}

const showIntro = ref(shouldShowIntro())

const focusUsername = () => {
  nextTick(() => {
    usernameInput.value?.focus()
  })
}

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value
  error.value = ''
  password.value = ''
  if (!isRegisterMode.value) {
    inviteCode.value = ''
  }
}

const handleLogin = async () => {
  const trimmedUsername = username.value.trim()
  if (!trimmedUsername || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.login({ username: trimmedUsername, password: password.value })
    router.push('/admin/dashboard')
  } catch (e: any) {
    error.value = '访问被拒绝，凭证无效'
    password.value = ''
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  const trimmedUsername = username.value.trim()
  const trimmedInviteCode = inviteCode.value.trim()

  if (!trimmedUsername || !password.value || !trimmedInviteCode) {
    error.value = '请填写所有必填字段'
    return
  }

  if (trimmedUsername.length > 12) {
    error.value = '用户名过长（最多 12 字符）'
    return
  }

  if (!INVITE_CODE_REGEX.test(trimmedInviteCode)) {
    error.value = '邀请码格式错误，必须为 XXXX-XXXX 且全大写'
    return
  }

  if (password.value.length > 10) {
    error.value = '密码过长（最多 10 字符）'
    return
  }

  if (!/^[a-zA-Z0-9]+$/.test(password.value)) {
    error.value = '密码仅支持字母与数字'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await authStore.register({
      username: trimmedUsername,
      inviteCode: trimmedInviteCode,
      password: password.value,
    })

    isRegisterMode.value = false
    password.value = ''
    inviteCode.value = ''
    registerSuccessOpen.value = true
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

const handleIntroDone = () => {
  markIntroShownNow()
  showIntro.value = false
  focusUsername()
}

onMounted(() => {
  if (!showIntro.value) {
    focusUsername()
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-[#00ff00] font-vt323 flex items-center justify-center p-4">
    <AdminBootLoader v-if="showIntro" @done="handleIntroDone" />

    <!-- CRT Overlay -->
    <div class="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
    <div class="fixed inset-0 scan-line z-40 pointer-events-none"></div>

    <div class="w-full max-w-md border-2 border-[#00ff00] p-8 relative shadow-[0_0_20px_rgba(0,255,0,0.2)] z-10">
      <!-- Header -->
      <div class="text-center mb-8 border-b border-[#00ff00] pb-4">
        <h1 class="text-4xl uppercase tracking-widest mb-2">
          {{ isRegisterMode ? '人员登记' : '系统入口' }}
        </h1>
        <p class="text-sm opacity-70">受限区域 // 仅限授权人员</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div>
          <label class="block text-xl mb-2">> 用户名:</label>
          <input
            v-model="username"
            ref="usernameInput"
            type="text"
            maxlength="12"
            class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
          />
        </div>

        <template v-if="isRegisterMode">
          <div>
            <label class="block text-xl mb-2">> 邀请码 (XXXX-XXXX):</label>
            <input
              v-model="inviteCode"
              type="text"
              maxlength="9"
              class="w-full bg-black border border-[#00ff00] px-4 py-2 text-[#00ff00] focus:outline-none focus:shadow-[0_0_10px_#00ff00] font-sharetech"
              placeholder="ABCD-1234"
            />
          </div>
        </template>

        <div>
          <label class="block text-xl mb-2">
            > 密码 {{ isRegisterMode ? '(最多 10，字母数字)' : '' }}:
          </label>
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
        终端 ID: ADMIN-01 // 状态 {{ isRegisterMode ? '写入模式' : '等待输入' }}
      </div>

      <!-- Corner Decorations -->
      <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ff00]"></div>
      <div class="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00ff00]"></div>
      <div class="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00ff00]"></div>
      <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ff00]"></div>
    </div>

    <RegisterSuccessModal :isOpen="registerSuccessOpen" @close="registerSuccessOpen = false" />
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
