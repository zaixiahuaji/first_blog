<script setup lang="ts">
import { computed, onMounted, reactive, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
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

const INVITE_CODE_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/
const PASSWORD_REGEX = /^[a-zA-Z0-9]+$/

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

const createUserFormRef = ref<FormInstance>()
const createUserRules: FormRules = {
  username: [
    {
      validator: (_rule, value: unknown, callback) => {
        const trimmed = String(value ?? '').trim()
        if (!trimmed) return callback(new Error('请输入用户名'))
        if (trimmed.length > 12) return callback(new Error('用户名过长（最多 12 字符）'))
        return callback()
      },
      trigger: 'blur',
    },
  ],
  password: [
    {
      validator: (_rule, value: unknown, callback) => {
        const raw = String(value ?? '')
        if (!raw) return callback(new Error('请输入密码'))
        if (raw.length > 10) return callback(new Error('密码过长（最多 10 字符）'))
        if (!PASSWORD_REGEX.test(raw)) return callback(new Error('密码仅支持字母与数字'))
        return callback()
      },
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

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

const userInviteFormRef = ref<FormInstance>()
const adminInviteFormRef = ref<FormInstance>()
const inviteRules: FormRules = {
  code: [
    {
      validator: (_rule, value: unknown, callback) => {
        const trimmed = String(value ?? '').trim()
        if (!trimmed) return callback()
        if (!INVITE_CODE_REGEX.test(trimmed)) {
          return callback(new Error('邀请码格式错误，必须为 XXXX-XXXX 且全大写'))
        }
        return callback()
      },
      trigger: 'blur',
    },
  ],
}

const isRefreshingTab = computed(() => {
  if (superAdminTab.value === 'users') return usersLoading.value
  if (superAdminTab.value === 'invites_user') return userInviteLoading.value
  return adminInviteLoading.value
})

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

  const form = createUserFormRef.value
  if (form) {
    try {
      await form.validate()
    } catch {
      ElMessage.warning('请检查表单字段')
      return
    }
  }

  usersActionLoading.value = true
  usersError.value = ''
  try {
    const { superAdminUsersControllerCreate } = getSuperAdminUsers()
    await superAdminUsersControllerCreate({
      username: createUserForm.username.trim(),
      password: createUserForm.password,
      role: createUserForm.role,
    } as any)
    createUserFormRef.value?.resetFields()
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

const removeManagedUser = async (user: ManagedUser) => {
  if (!isSuperAdmin.value) return
  if (usersActionLoading.value) return

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

  const form = role === 'user' ? userInviteFormRef.value : adminInviteFormRef.value
  if (form) {
    try {
      await form.validate()
    } catch {
      ElMessage.warning('请检查表单字段')
      return
    }
  }

  state.actionLoading.value = true
  state.error.value = ''
  try {
    const { superAdminInviteCodesControllerCreate } = getSuperAdminInviteCodes()
    const payload: any = {
      role,
      enabled: state.form.enabled,
    }
    const trimmedCode = state.form.code.trim()
    if (trimmedCode) payload.code = trimmedCode
    await superAdminInviteCodesControllerCreate(payload)
    form?.resetFields()
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

    <main class="flex-1 p-8 overflow-y-auto z-10 relative min-h-0 space-y-10">
      <section v-if="isSuperAdmin" class="border border-[#00ff00]">
        <el-tabs v-model="superAdminTab" class="terminal-superadmin-tabs">
          <template #extra>
            <el-button size="small" :loading="isRefreshingTab" @click="refreshSuperAdminTab">刷新</el-button>
          </template>

          <el-tab-pane label="账号管理" name="users">
            <div class="p-6 space-y-6">
              <div class="border border-[#00ff00]/40 p-4">
                <h3 class="text-sm font-bold uppercase mb-4">> 新建账号</h3>
                <el-form
                  ref="createUserFormRef"
                  :model="createUserForm"
                  :rules="createUserRules"
                  label-position="top"
                >
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <el-form-item class="md:col-span-4" label="用户名 (≤12)" prop="username">
                      <el-input
                        v-model="createUserForm.username"
                        maxlength="12"
                        :disabled="usersLoading || usersActionLoading"
                      />
                    </el-form-item>
                    <el-form-item class="md:col-span-4" label="密码 (≤10，字母数字)" prop="password">
                      <el-input
                        v-model="createUserForm.password"
                        type="password"
                        maxlength="10"
                        show-password
                        :disabled="usersLoading || usersActionLoading"
                      />
                    </el-form-item>
                    <el-form-item class="md:col-span-2" label="角色" prop="role">
                      <el-select v-model="createUserForm.role" :disabled="usersLoading || usersActionLoading">
                        <el-option label="user" value="user" />
                        <el-option label="admin" value="admin" />
                      </el-select>
                    </el-form-item>
                    <div class="md:col-span-2 flex items-end">
                      <el-button
                        type="primary"
                        class="w-full"
                        :loading="usersActionLoading"
                        :disabled="usersLoading || usersActionLoading"
                        @click="createManagedUser"
                      >
                        创建
                      </el-button>
                    </div>
                  </div>
                </el-form>
                <p class="mt-3 text-xs opacity-60">仅支持创建 user/admin 账号，不能操作 super_admin。</p>
              </div>

              <div class="border border-[#00ff00]/40">
                <div class="p-4 border-b border-[#00ff00]/40 flex items-center justify-between">
                  <h3 class="text-sm font-bold uppercase">> 账号列表</h3>
                </div>

                <div
                  class="w-full"
                  v-loading="usersLoading"
                  element-loading-text=">> 正在加载账号..."
                  element-loading-background="rgba(0,0,0,0.6)"
                >
                  <el-alert
                    v-if="usersError"
                    class="m-4"
                    type="error"
                    show-icon
                    :closable="false"
                    :title="`错误：${usersError}`"
                  />

                  <el-table class="terminal-superadmin-table" :data="managedUsers" row-key="id" empty-text="暂无账号">
                    <el-table-column label="用户名" min-width="180">
                      <template #default="{ row }">
                        <span class="font-vt323 text-lg">{{ row.username }}</span>
                      </template>
                    </el-table-column>

                    <el-table-column label="角色" width="160">
                      <template #default="{ row }">
                        <el-select
                          :model-value="row.role"
                          size="small"
                          :disabled="usersLoading || usersActionLoading"
                          @update:model-value="(next) => updateManagedUserRole(row, next as ManagedRole)"
                        >
                          <el-option label="user" value="user" />
                          <el-option label="admin" value="admin" />
                        </el-select>
                      </template>
                    </el-table-column>

                    <el-table-column label="创建时间" min-width="220">
                      <template #default="{ row }">
                        <span class="font-vt323 text-xl opacity-100">{{ formatDateTime(row.createdAt) }}</span>
                      </template>
                    </el-table-column>

                    <el-table-column label="更新时间" min-width="220">
                      <template #default="{ row }">
                        <span class="font-vt323 text-xl opacity-100">{{ formatDateTime(row.updatedAt) }}</span>
                      </template>
                    </el-table-column>

                    <el-table-column label="操作" width="160" align="right" header-align="right">
                      <template #default="{ row }">
                        <el-popconfirm
                          :title="`确定要删除账号 ${row.username} 吗？此操作不可逆。`"
                          confirm-button-text="删除"
                          cancel-button-text="取消"
                          cancel-button-type="default"
                          confirm-button-type="danger"
                          width="260"
                          @confirm="removeManagedUser(row)"
                        >
                          <template #reference>
                            <button
                              type="button"
                              :disabled="usersLoading || usersActionLoading"
                              class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase text-sm disabled:opacity-40"
                            >
                              DEL
                            </button>
                          </template>
                        </el-popconfirm>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="USER 邀请码" name="invites_user">
            <div class="p-6 space-y-6">
              <div class="border border-[#00ff00]/40 p-4">
                <h3 class="text-sm font-bold uppercase mb-4">> 新建 USER 邀请码</h3>
                <el-form
                  ref="userInviteFormRef"
                  :model="userInviteForm"
                  :rules="inviteRules"
                  label-position="top"
                >
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <el-form-item class="md:col-span-6" label="手动邀请码 (可留空自动生成)" prop="code">
                      <el-input
                        v-model="userInviteForm.code"
                        maxlength="9"
                        placeholder="ABCD-1234"
                        :disabled="userInviteLoading || userInviteActionLoading"
                      />
                    </el-form-item>

                    <div class="md:col-span-3 flex items-end">
                      <label class="flex items-center gap-2 text-xs uppercase opacity-80">
                        <input
                          v-model="userInviteForm.enabled"
                          type="checkbox"
                          class="accent-[#00ff00]"
                          :disabled="userInviteLoading || userInviteActionLoading"
                        />
                        启用
                      </label>
                    </div>

                    <div class="md:col-span-3 flex items-end">
                      <el-button
                        type="primary"
                        class="w-full"
                        :loading="userInviteActionLoading"
                        :disabled="userInviteLoading || userInviteActionLoading"
                        @click="createInviteCode('user')"
                      >
                        创建
                      </el-button>
                    </div>
                  </div>
                </el-form>
              </div>

              <div class="border border-[#00ff00]/40">
                <div class="p-4 border-b border-[#00ff00]/40 flex items-center justify-between">
                  <h3 class="text-sm font-bold uppercase">> 邀请码列表</h3>
                </div>

                <div
                  class="w-full"
                  v-loading="userInviteLoading"
                  element-loading-text=">> 正在加载邀请码..."
                  element-loading-background="rgba(0,0,0,0.6)"
                >
                  <el-alert
                    v-if="userInviteError"
                    class="m-4"
                    type="error"
                    show-icon
                    :closable="false"
                    :title="`错误：${userInviteError}`"
                  />

                  <el-table class="terminal-superadmin-table" :data="userInviteCodes" row-key="code" empty-text="暂无邀请码">
                    <el-table-column label="邀请码" min-width="220">
                      <template #default="{ row }">
                        <span class="font-mono text-sm uppercase" :class="{ 'opacity-60': !row.enabled }">
                          {{ row.code }}
                        </span>
                      </template>
                    </el-table-column>

                    <el-table-column label="启用" width="140">
                      <template #default="{ row }">
                        <button
                          type="button"
                          :disabled="userInviteLoading || userInviteActionLoading"
                          @click="toggleInviteCode('user', row)"
                          class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-xs disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#00ff00]"
                        >
                          {{ row.enabled ? 'ON' : 'OFF' }}
                        </button>
                      </template>
                    </el-table-column>

                    <el-table-column label="操作" width="160" align="right" header-align="right">
                      <template #default="{ row }">
                        <el-popconfirm
                          :title="`确定要删除邀请码 ${row.code} 吗？此操作不可逆。`"
                          confirm-button-text="删除"
                          cancel-button-text="取消"
                          cancel-button-type="default"
                          confirm-button-type="danger"
                          width="280"
                          @confirm="removeInviteCode('user', row)"
                        >
                          <template #reference>
                            <button
                              type="button"
                              :disabled="userInviteLoading || userInviteActionLoading"
                              class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase text-sm disabled:opacity-40"
                            >
                              DEL
                            </button>
                          </template>
                        </el-popconfirm>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="ADMIN 邀请码" name="invites_admin">
            <div class="p-6 space-y-6">
              <div class="border border-[#00ff00]/40 p-4">
                <h3 class="text-sm font-bold uppercase mb-4">> 新建 ADMIN 邀请码</h3>
                <el-form
                  ref="adminInviteFormRef"
                  :model="adminInviteForm"
                  :rules="inviteRules"
                  label-position="top"
                >
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <el-form-item class="md:col-span-6" label="手动邀请码 (可留空自动生成)" prop="code">
                      <el-input
                        v-model="adminInviteForm.code"
                        maxlength="9"
                        placeholder="ABCD-1234"
                        :disabled="adminInviteLoading || adminInviteActionLoading"
                      />
                    </el-form-item>

                    <div class="md:col-span-3 flex items-end">
                      <label class="flex items-center gap-2 text-xs uppercase opacity-80">
                        <input
                          v-model="adminInviteForm.enabled"
                          type="checkbox"
                          class="accent-[#00ff00]"
                          :disabled="adminInviteLoading || adminInviteActionLoading"
                        />
                        启用
                      </label>
                    </div>

                    <div class="md:col-span-3 flex items-end">
                      <el-button
                        type="primary"
                        class="w-full"
                        :loading="adminInviteActionLoading"
                        :disabled="adminInviteLoading || adminInviteActionLoading"
                        @click="createInviteCode('admin')"
                      >
                        创建
                      </el-button>
                    </div>
                  </div>
                </el-form>
              </div>

              <div class="border border-[#00ff00]/40">
                <div class="p-4 border-b border-[#00ff00]/40 flex items-center justify-between">
                  <h3 class="text-sm font-bold uppercase">> 邀请码列表</h3>
                </div>

                <div
                  class="w-full"
                  v-loading="adminInviteLoading"
                  element-loading-text=">> 正在加载邀请码..."
                  element-loading-background="rgba(0,0,0,0.6)"
                >
                  <el-alert
                    v-if="adminInviteError"
                    class="m-4"
                    type="error"
                    show-icon
                    :closable="false"
                    :title="`错误：${adminInviteError}`"
                  />

                  <el-table class="terminal-superadmin-table" :data="adminInviteCodes" row-key="code" empty-text="暂无邀请码">
                    <el-table-column label="邀请码" min-width="220">
                      <template #default="{ row }">
                        <span class="font-mono text-sm uppercase" :class="{ 'opacity-60': !row.enabled }">
                          {{ row.code }}
                        </span>
                      </template>
                    </el-table-column>

                    <el-table-column label="启用" width="140">
                      <template #default="{ row }">
                        <button
                          type="button"
                          :disabled="adminInviteLoading || adminInviteActionLoading"
                          @click="toggleInviteCode('admin', row)"
                          class="px-3 py-1 border border-[#00ff00] hover:bg-[#00ff00] hover:text-black transition-colors uppercase text-xs disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#00ff00]"
                        >
                          {{ row.enabled ? 'ON' : 'OFF' }}
                        </button>
                      </template>
                    </el-table-column>

                    <el-table-column label="操作" width="160" align="right" header-align="right">
                      <template #default="{ row }">
                        <el-popconfirm
                          :title="`确定要删除邀请码 ${row.code} 吗？此操作不可逆。`"
                          confirm-button-text="删除"
                          cancel-button-text="取消"
                          cancel-button-type="default"
                          confirm-button-type="danger"
                          width="280"
                          @confirm="removeInviteCode('admin', row)"
                        >
                          <template #reference>
                            <button
                              type="button"
                              :disabled="adminInviteLoading || adminInviteActionLoading"
                              class="text-red-400 hover:bg-red-500 hover:text-black px-2 transition-colors uppercase text-sm disabled:opacity-40"
                            >
                              DEL
                            </button>
                          </template>
                        </el-popconfirm>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>

      <section v-else class="border border-red-500">
        <el-alert class="m-4" type="error" show-icon :closable="false" title="无权限访问超级管理页面" />
      </section>
    </main>

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

:deep(.terminal-superadmin-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-row-hover-bg-color: rgba(0, 255, 0, 0.05);
}

:deep(.terminal-superadmin-table .el-table__cell) {
  border-right: none;
  padding: 0;
  vertical-align: middle;
}

:deep(.terminal-superadmin-table .el-table__cell .cell) {
  padding: 14px 16px;
}

:deep(.terminal-superadmin-table .el-table__header-wrapper .el-table__cell) {
  background: rgba(0, 255, 0, 0.12);
  border-bottom: 1px solid rgba(0, 255, 0, 0.9);
}

:deep(.terminal-superadmin-table .el-table__header-wrapper .el-table__cell .cell) {
  font-weight: 700;
  text-transform: uppercase;
}
</style>
