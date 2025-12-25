<script setup lang="ts">
import { computed, onMounted, reactive, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getSuperAdminUsers } from '@/api/generated/super-admin-users/super-admin-users'
import { getSuperAdminInviteCodes } from '@/api/generated/super-admin-invite-codes/super-admin-invite-codes'

type ManagedRole = 'user' | 'admin'
type InviteRole = 'user' | 'admin'
type SuperAdminTab = 'users' | 'invites_user' | 'invites_admin'

type ManagedUser = {
  id: string
  username: string
  role: ManagedRole
  createdAt?: string
  updatedAt?: string
}

type InviteCodeItem = {
  code: string
  role: InviteRole
  enabled: boolean
}

type InviteFormState = {
  code: string
  enabled: boolean
}

type InviteState = {
  list: Ref<InviteCodeItem[]>
  loading: Ref<boolean>
  error: Ref<string>
  actionLoading: Ref<boolean>
  form: InviteFormState
}

const router = useRouter()
const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.isSuperAdmin)

const superAdminTab = ref<SuperAdminTab>('users')
const managedUsers = ref<ManagedUser[]>([])
const usersLoading = ref(false)
const usersActionLoading = ref(false)
const usersError = ref('')

const createUserForm = reactive({
  username: '',
  password: '',
  role: 'user' as ManagedRole,
})

const userInviteCodes = ref<InviteCodeItem[]>([])
const adminInviteCodes = ref<InviteCodeItem[]>([])
const userInviteLoading = ref(false)
const adminInviteLoading = ref(false)
const userInviteActionLoading = ref(false)
const adminInviteActionLoading = ref(false)
const userInviteError = ref('')
const adminInviteError = ref('')
const userInviteForm = reactive<InviteFormState>({ code: '', enabled: true })
const adminInviteForm = reactive<InviteFormState>({ code: '', enabled: true })

const INVITE_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/
const PASSWORD_REGEX = /^[a-zA-Z0-9]+$/

const handleLogout = () => {
  authStore.logout()
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}
const fetchManagedUsers = async () => {
  if (!isSuperAdmin.value) return
  usersLoading.value = true
  usersError.value = ''
  try {
    const { superAdminUsersControllerFindAll } = getSuperAdminUsers()
    const response = await superAdminUsersControllerFindAll()
    managedUsers.value = Array.isArray(response) ? (response as ManagedUser[]) : []
  } catch (e: any) {
    usersError.value = e.response?.data?.message || '无法加载账号列表'
  } finally {
    usersLoading.value = false
  }
}

const createManagedUser = async () => {
  if (!isSuperAdmin.value) return
  if (usersActionLoading.value) return

  const trimmedUsername = createUserForm.username.trim()
  if (!trimmedUsername || !createUserForm.password) {
    usersError.value = '请输入用户名和密码'
    return
  }
  if (trimmedUsername.length > 12) {
    usersError.value = '用户名过长（最多 12 字符）'
    return
  }
  if (createUserForm.password.length > 10) {
    usersError.value = '密码过长（最多 10 字符）'
    return
  }
  if (!PASSWORD_REGEX.test(createUserForm.password)) {
    usersError.value = '密码仅支持字母与数字'
    return
  }

  usersActionLoading.value = true
  usersError.value = ''
  try {
    const { superAdminUsersControllerCreate } = getSuperAdminUsers()
    await superAdminUsersControllerCreate({
      username: trimmedUsername,
      password: createUserForm.password,
      role: createUserForm.role,
    } as any)
    createUserForm.username = ''
    createUserForm.password = ''
    createUserForm.role = 'user'
    await fetchManagedUsers()
  } catch (e: any) {
    usersError.value = e.response?.data?.message || '创建账号失败'
  } finally {
    usersActionLoading.value = false
  }
}

const updateManagedUserRole = async (user: ManagedUser, nextRole: ManagedRole) => {
  if (!isSuperAdmin.value) return
  if (usersActionLoading.value) return
  if (nextRole === user.role) return

  usersActionLoading.value = true
  usersError.value = ''
  try {
    const { superAdminUsersControllerUpdateRole } = getSuperAdminUsers()
    await superAdminUsersControllerUpdateRole(user.id, { role: nextRole } as any)
    await fetchManagedUsers()
  } catch (e: any) {
    usersError.value = e.response?.data?.message || '更新角色失败'
  } finally {
    usersActionLoading.value = false
  }
}

const handleRoleChange = (user: ManagedUser, event: Event) => {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  updateManagedUserRole(user, target.value as ManagedRole)
}

const removeManagedUser = async (user: ManagedUser) => {
  if (!isSuperAdmin.value) return
  if (usersActionLoading.value) return
  if (!confirm(`确定要删除账号 ${user.username} 吗？此操作不可逆。`)) return

  usersActionLoading.value = true
  usersError.value = ''
  try {
    const { superAdminUsersControllerRemove } = getSuperAdminUsers()
    await superAdminUsersControllerRemove(user.id)
    await fetchManagedUsers()
  } catch (e: any) {
    usersError.value = e.response?.data?.message || '删除账号失败'
  } finally {
    usersActionLoading.value = false
  }
}
const getInviteState = (role: InviteRole): InviteState => {
  if (role === 'user') {
    return {
      list: userInviteCodes,
      loading: userInviteLoading,
      error: userInviteError,
      actionLoading: userInviteActionLoading,
      form: userInviteForm,
    }
  }
  return {
    list: adminInviteCodes,
    loading: adminInviteLoading,
    error: adminInviteError,
    actionLoading: adminInviteActionLoading,
    form: adminInviteForm,
  }
}

const fetchInviteCodes = async (role: InviteRole) => {
  if (!isSuperAdmin.value) return
  const state = getInviteState(role)
  state.loading.value = true
  state.error.value = ''
  try {
    const { superAdminInviteCodesControllerList } = getSuperAdminInviteCodes()
    const response = await superAdminInviteCodesControllerList({ role })
    state.list.value = Array.isArray(response) ? (response as InviteCodeItem[]) : []
  } catch (e: any) {
    state.error.value = e.response?.data?.message || '无法加载邀请码列表'
  } finally {
    state.loading.value = false
  }
}

const createInviteCode = async (role: InviteRole) => {
  if (!isSuperAdmin.value) return
  const state = getInviteState(role)
  if (state.actionLoading.value) return

  const trimmedCode = state.form.code.trim()
  if (trimmedCode && !INVITE_CODE_REGEX.test(trimmedCode)) {
    state.error.value = '邀请码格式错误，必须为 XXXX-XXXX 且全大写'
    return
  }

  state.actionLoading.value = true
  state.error.value = ''
  try {
    const { superAdminInviteCodesControllerCreate } = getSuperAdminInviteCodes()
    const payload: any = {
      role,
      enabled: state.form.enabled,
    }
    if (trimmedCode) payload.code = trimmedCode
    await superAdminInviteCodesControllerCreate(payload)
    state.form.code = ''
    state.form.enabled = true
    await fetchInviteCodes(role)
  } catch (e: any) {
    state.error.value = e.response?.data?.message || '创建邀请码失败'
  } finally {
    state.actionLoading.value = false
  }
}

const toggleInviteCode = async (role: InviteRole, invite: InviteCodeItem) => {
  if (!isSuperAdmin.value) return
  const state = getInviteState(role)
  if (state.actionLoading.value) return

  state.actionLoading.value = true
  state.error.value = ''
  try {
    const { superAdminInviteCodesControllerUpdate } = getSuperAdminInviteCodes()
    await superAdminInviteCodesControllerUpdate(invite.code, { enabled: !invite.enabled } as any)
    await fetchInviteCodes(role)
  } catch (e: any) {
    state.error.value = e.response?.data?.message || '更新邀请码失败'
  } finally {
    state.actionLoading.value = false
  }
}

const removeInviteCode = async (role: InviteRole, invite: InviteCodeItem) => {
  if (!isSuperAdmin.value) return
  const state = getInviteState(role)
  if (state.actionLoading.value) return
  if (!confirm(`确定要删除邀请码 ${invite.code} 吗？此操作不可逆。`)) return

  state.actionLoading.value = true
  state.error.value = ''
  try {
    const { superAdminInviteCodesControllerRemove } = getSuperAdminInviteCodes()
    await superAdminInviteCodesControllerRemove(invite.code)
    await fetchInviteCodes(role)
  } catch (e: any) {
    state.error.value = e.response?.data?.message || '删除邀请码失败'
  } finally {
    state.actionLoading.value = false
  }
}

const refreshSuperAdminTab = async () => {
  if (!isSuperAdmin.value) return
  if (superAdminTab.value === 'users') {
    await fetchManagedUsers()
    return
  }
  if (superAdminTab.value === 'invites_user') {
    await fetchInviteCodes('user')
    return
  }
  await fetchInviteCodes('admin')
}

onMounted(() => {
  if (!authStore.user) {
    authStore.initialize()
  }
  if (!isSuperAdmin.value) return
  fetchManagedUsers()
  fetchInviteCodes('user')
  fetchInviteCodes('admin')
})
</script>

<template>
  <div class="h-screen bg-[#0a0a0a] text-[#00ff00] font-sharetech flex flex-col overflow-hidden">
    <div class="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>
    <div class="fixed inset-0 scan-line z-40 pointer-events-none"></div>

    <header class="border-b border-[#00ff00] p-4 flex justify-between items-center z-10 bg-[#0a0a0a] shrink-0">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl font-bold uppercase tracking-widest">超级管理</h1>
        <span class="text-xs border border-[#00ff00] px-2 py-0.5">
          {{ authStore.user?.role?.toUpperCase() || 'UNKNOWN' }}
        </span>
      </div>
      <div class="flex gap-4">
        <button @click="router.push('/admin/dashboard')" class="hover:underline">[ 返回面板 ]</button>
        <button @click="router.push('/admin/categories')" class="hover:underline">[ 类别管理 ]</button>
        <button @click="handleLogout" class="hover:text-red-500 hover:underline">[ 断开连接 ]</button>
      </div>
    </header>

    <!-- <main class="flex-1 p-8 overflow-y-auto z-10 relative min-h-0 space-y-10"> -->
    <section v-if="isSuperAdmin" class="border border-[#00ff00]">
      <div class="px-4 py-3 border-b border-[#00ff00]/40 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-3">
          <button type="button"
            class="px-4 py-2 border border-[#00ff00] uppercase text-xs tracking-widest transition-colors"
            :class="superAdminTab === 'users' ? 'bg-[#00ff00] text-black' : 'hover:bg-[#00ff00]/20'"
            @click="superAdminTab = 'users'">
            账号管理
          </button>
          <button type="button"
            class="px-4 py-2 border border-[#00ff00] uppercase text-xs tracking-widest transition-colors" :class="superAdminTab === 'invites_user'
              ? 'bg-[#00ff00] text-black'
              : 'hover:bg-[#00ff00]/20'
              " @click="superAdminTab = 'invites_user'">
            USER 邀请码
          </button>
          <button type="button"
            class="px-4 py-2 border border-[#00ff00] uppercase text-xs tracking-widest transition-colors" :class="superAdminTab === 'invites_admin'
              ? 'bg-[#00ff00] text-black'
              : 'hover:bg-[#00ff00]/20'
              " @click="superAdminTab = 'invites_admin'">
            ADMIN 邀请码
          </button>
        </div>
        <button type="button" @click="refreshSuperAdminTab"
          class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-xs">
          刷新
        </button>
      </div>

      <div class="p-6 space-y-6">
        <template v-if="superAdminTab === 'users'">
          <div class="border border-[#00ff00]/40 p-4">
            <h3 class="text-sm font-bold uppercase mb-4">> 新建账号</h3>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div class="md:col-span-4 space-y-2">
                <label class="block text-xs uppercase opacity-80">用户名 (≤12)</label>
                <input v-model="createUserForm.username"
                  class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                  maxlength="12" />
              </div>
              <div class="md:col-span-4 space-y-2">
                <label class="block text-xs uppercase opacity-80">密码 (≤10，字母数字)</label>
                <input v-model="createUserForm.password" type="password"
                  class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech"
                  maxlength="10" />
              </div>
              <div class="md:col-span-2 space-y-2">
                <label class="block text-xs uppercase opacity-80">角色</label>
                <select v-model="createUserForm.role"
                  class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div class="md:col-span-2 flex items-end">
                <button type="button" @click="createManagedUser" :disabled="usersLoading || usersActionLoading"
                  class="w-full px-3 py-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase disabled:opacity-40 disabled:hover:bg-transparent">
                  创建
                </button>
              </div>
            </div>
            <p class="mt-3 text-xs opacity-60">仅支持创建 user/admin 账号，不能操作 super_admin。</p>
          </div>

          <div v-if="usersError" class="border border-red-500 text-red-400 p-3 text-sm">
            错误：{{ usersError }}
          </div>

          <div class="border border-[#00ff00]/40">
            <div class="p-4 border-b border-[#00ff00]/40 flex items-center justify-between">
              <h3 class="text-sm font-bold uppercase">> 账号列表</h3>
            </div>
            <div v-if="usersLoading" class="p-6 text-center text-sm animate-pulse">
              >> 正在加载账号...
            </div>
            <div v-else>
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[#00ff00]/40 bg-[#00ff00]/10">
                    <th class="p-3 text-sm uppercase w-48">用户名</th>
                    <th class="p-3 text-sm uppercase w-32">角色</th>
                    <th class="p-3 text-sm uppercase">创建时间</th>
                    <th class="p-3 text-sm uppercase">更新时间</th>
                    <th class="p-3 text-sm uppercase w-40 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in managedUsers" :key="user.id"
                    class="border-b border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-colors">
                    <td class="p-3 font-vt323 text-lg">{{ user.username }}</td>
                    <td class="p-3">
                      <select :value="user.role" @change="handleRoleChange(user, $event)"
                        :disabled="usersLoading || usersActionLoading"
                        class="bg-black border border-[#00ff00] p-1 text-[#00ff00] focus:outline-none font-sharetech text-xs uppercase">
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td class="p-3 font-vt323 text-xl opacity-100">{{ formatDateTime(user.createdAt) }}</td>
                    <td class="p-3 font-vt323 text-xl opacity-100">{{ formatDateTime(user.updatedAt) }}</td>
                    <td class="p-3 text-right">
                      <button type="button" @click="removeManagedUser(user)"
                        :disabled="usersLoading || usersActionLoading"
                        class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase text-sm disabled:opacity-40">
                        删除
                      </button>
                    </td>
                  </tr>
                  <tr v-if="managedUsers.length === 0">
                    <td colspan="5" class="p-4 text-center text-xs opacity-60">暂无账号</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
        <template v-else-if="superAdminTab === 'invites_user'">
          <div class="border border-[#00ff00]/40 p-4">
            <h3 class="text-sm font-bold uppercase mb-4">> 新建 USER 邀请码</h3>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div class="md:col-span-6 space-y-2">
                <label class="block text-xs uppercase opacity-80">手动邀请码 (可留空自动生成)</label>
                <input v-model="userInviteForm.code"
                  class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech font-mono"
                  maxlength="9" placeholder="ABCD-1234" />
              </div>
              <div class="md:col-span-3 flex items-end">
                <label class="flex items-center gap-2 text-xs uppercase opacity-80">
                  <input v-model="userInviteForm.enabled" type="checkbox" class="accent-[#00ff00]" />
                  启用
                </label>
              </div>
              <div class="md:col-span-3 flex items-end">
                <button type="button" @click="createInviteCode('user')"
                  :disabled="userInviteLoading || userInviteActionLoading"
                  class="w-full px-3 py-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase disabled:opacity-40 disabled:hover:bg-transparent">
                  创建
                </button>
              </div>
            </div>
          </div>

          <div v-if="userInviteError" class="border border-red-500 text-red-400 p-3 text-sm">
            错误：{{ userInviteError }}
          </div>

          <div class="border border-[#00ff00]/40">
            <div class="p-4 border-b border-[#00ff00]/40 flex items-center justify-between">
              <h3 class="text-sm font-bold uppercase">> 邀请码列表</h3>
            </div>
            <div v-if="userInviteLoading" class="p-6 text-center text-sm animate-pulse">
              >> 正在加载邀请码...
            </div>
            <div v-else>
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[#00ff00]/40 bg-[#00ff00]/10">
                    <th class="p-3 text-sm uppercase w-48">邀请码</th>
                    <th class="p-3 text-sm uppercase w-32">状态</th>
                    <th class="p-3 text-sm uppercase w-40 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="invite in userInviteCodes" :key="invite.code"
                    class="border-b border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-colors"
                    :class="{ 'opacity-60': !invite.enabled }">
                    <td class="p-3 font-mono text-sm uppercase">{{ invite.code }}</td>
                    <td class="p-3 text-sm uppercase">
                      {{ invite.enabled ? '启用' : '已使用/禁用' }}
                    </td>
                    <td class="p-3 text-right space-x-3">
                      <button type="button" @click="toggleInviteCode('user', invite)"
                        :disabled="userInviteLoading || userInviteActionLoading"
                        class="px-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-sm disabled:opacity-40">
                        {{ invite.enabled ? '禁用' : '启用' }}
                      </button>
                      <button type="button" @click="removeInviteCode('user', invite)"
                        :disabled="userInviteLoading || userInviteActionLoading"
                        class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase text-sm disabled:opacity-40">
                        删除
                      </button>
                    </td>
                  </tr>
                  <tr v-if="userInviteCodes.length === 0">
                    <td colspan="3" class="p-4 text-center text-xs opacity-60">暂无邀请码</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="border border-[#00ff00]/40 p-4">
            <h3 class="text-sm font-bold uppercase mb-4">> 新建 ADMIN 邀请码</h3>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div class="md:col-span-6 space-y-2">
                <label class="block text-xs uppercase opacity-80">手动邀请码 (可留空自动生成)</label>
                <input v-model="adminInviteForm.code"
                  class="w-full bg-black border border-[#00ff00] p-2 text-[#00ff00] focus:outline-none font-sharetech font-mono"
                  maxlength="9" placeholder="ABCD-1234" />
              </div>
              <div class="md:col-span-3 flex items-end">
                <label class="flex items-center gap-2 text-xs uppercase opacity-80">
                  <input v-model="adminInviteForm.enabled" type="checkbox" class="accent-[#00ff00]" />
                  启用
                </label>
              </div>
              <div class="md:col-span-3 flex items-end">
                <button type="button" @click="createInviteCode('admin')"
                  :disabled="adminInviteLoading || adminInviteActionLoading"
                  class="w-full px-3 py-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase disabled:opacity-40 disabled:hover:bg-transparent">
                  创建
                </button>
              </div>
            </div>
          </div>

          <div v-if="adminInviteError" class="border border-red-500 text-red-400 p-3 text-sm">
            错误：{{ adminInviteError }}
          </div>

          <div class="border border-[#00ff00]/40">
            <div class="p-4 border-b border-[#00ff00]/40 flex items-center justify-between">
              <h3 class="text-sm font-bold uppercase">> 邀请码列表</h3>
            </div>
            <div v-if="adminInviteLoading" class="p-6 text-center text-sm animate-pulse">
              >> 正在加载邀请码...
            </div>
            <div v-else>
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-[#00ff00]/40 bg-[#00ff00]/10">
                    <th class="p-3 text-sm uppercase w-48">邀请码</th>
                    <th class="p-3 text-sm uppercase w-32">状态</th>
                    <th class="p-3 text-sm uppercase w-40 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="invite in adminInviteCodes" :key="invite.code"
                    class="border-b border-[#00ff00]/30 hover:bg-[#00ff00]/5 transition-colors"
                    :class="{ 'opacity-60': !invite.enabled }">
                    <td class="p-3 font-mono text-sm uppercase">{{ invite.code }}</td>
                    <td class="p-3 text-sm uppercase">
                      {{ invite.enabled ? '启用' : '已使用/禁用' }}
                    </td>
                    <td class="p-3 text-right space-x-3">
                      <button type="button" @click="toggleInviteCode('admin', invite)"
                        :disabled="adminInviteLoading || adminInviteActionLoading"
                        class="px-2 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-sm disabled:opacity-40">
                        {{ invite.enabled ? '禁用' : '启用' }}
                      </button>
                      <button type="button" @click="removeInviteCode('admin', invite)"
                        :disabled="adminInviteLoading || adminInviteActionLoading"
                        class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase text-sm disabled:opacity-40">
                        删除
                      </button>
                    </td>
                  </tr>
                  <tr v-if="adminInviteCodes.length === 0">
                    <td colspan="3" class="p-4 text-center text-xs opacity-60">暂无邀请码</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </section>
    <!-- </main> -->

    <footer class="border-t border-[#00ff00] p-2 text-xs flex justify-between opacity-60 z-10 bg-[#0a0a0a] shrink-0">
      <span>系统状态: 在线</span>
      <span>权限: SUPER_ADMIN</span>
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
