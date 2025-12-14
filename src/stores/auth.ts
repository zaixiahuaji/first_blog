import { defineStore } from 'pinia'
import { getAuth } from '@/api/generated/auth/auth'
import type { LoginDto, RegisterDto } from '@/api/generated/model'
import { AXIOS_INSTANCE } from '@/api/axios-instance'

// Simple JWT decode function to avoid extra dependency
function jwtDecode<T>(token: string): T {
  try {
    const parts = token.split('.')
    const base64Url = parts[1]
    if (!base64Url) {
      throw new Error('Invalid token structure')
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch (e) {
    throw new Error('Invalid token')
  }
}

interface UserPayload {
  sub: number | string
  email: string
  role: string
  username?: string
  iat?: number
  exp?: number
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || '',
    user: null as UserPayload | null,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role || '',
  },
  actions: {
    initialize() {
      if (this.token) {
        this.decodeToken(this.token)
        this.setupInterceptor()
      }
    },
    decodeToken(token: string) {
      try {
        const decoded = jwtDecode<UserPayload>(token)
        this.user = decoded
      } catch (e) {
        console.error('Invalid token', e)
        this.logout()
      }
    },
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
        this.decodeToken(token)
        this.setupInterceptor()
      } catch (e: any) {
        this.error = e.response?.data?.message || 'Login failed'
        throw e
      } finally {
        this.loading = false
      }
    },
    async register(data: RegisterDto) {
      this.loading = true
      this.error = null
      try {
        const { authControllerRegister } = getAuth()
        await authControllerRegister(data)
        // Registration successful
      } catch (e: any) {
        this.error = e.response?.data?.message || 'Registration failed'
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
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
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

