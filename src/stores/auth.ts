import { defineStore } from 'pinia'
import { getAuth } from '@/api/generated/auth/auth'
import type { LoginDto } from '@/api/generated/model'
import { AXIOS_INSTANCE } from '@/api/axios-instance'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || '',
    user: null as any | null,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {
    async login(credentials: LoginDto) {
      this.loading = true
      this.error = null
      try {
        const { authControllerLogin } = getAuth()
        const response = await authControllerLogin(credentials)
        // Adjust this based on your actual API response structure
        // Assuming response is { access_token: string }
        const token = (response as any).access_token
        
        this.token = token
        localStorage.setItem('auth_token', token)
        this.setupInterceptor()
      } catch (e: any) {
        this.error = e.response?.data?.message || 'Login failed'
        throw e
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('auth_token')
      // Optional: Clear interceptor or reload page
      window.location.href = '/admin/login'
    },
    setupInterceptor() {
      if (!this.token) return

      AXIOS_INSTANCE.interceptors.request.use((config) => {
        config.headers.Authorization = `Bearer ${this.token}`
        return config
      })

      AXIOS_INSTANCE.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401) {
            this.logout()
          }
          return Promise.reject(error)
        },
      )
    },
  },
})

