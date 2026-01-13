import './assets/main.css'
import 'element-plus/dist/index.css'
import './assets/element-plus-admin.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { useTelemetryStore } from '@/stores/telemetry'

const PUBLIC_VIEWPORT_FIXED_WIDTH = 1024
const PUBLIC_VIEWPORT_CONTENT = `width=${PUBLIC_VIEWPORT_FIXED_WIDTH}`
const ADMIN_VIEWPORT_CONTENT = 'width=device-width, initial-scale=1.0'

const isAdminPath = (path: string) => path === '/admin' || path.startsWith('/admin/')

const ensureViewportMeta = (): HTMLMetaElement => {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (meta) return meta

  meta = document.createElement('meta')
  meta.name = 'viewport'
  document.head.appendChild(meta)
  return meta
}

const setViewportContent = (content: string) => {
  const meta = ensureViewportMeta()
  if (meta.content !== content) {
    meta.content = content
  }
}

const applyViewportForPath = (path: string) => {
  if (isAdminPath(path)) {
    setViewportContent(ADMIN_VIEWPORT_CONTENT)
  } else {
    setViewportContent(PUBLIC_VIEWPORT_CONTENT)
  }
}

const stripBaseFromPathname = (pathname: string, baseUrl: string) => {
  const safePathname = pathname || '/'
  const safeBaseUrl = baseUrl || '/'
  if (safeBaseUrl === '/' || safeBaseUrl === '') return safePathname

  const baseNoTrailing = safeBaseUrl.endsWith('/') ? safeBaseUrl.slice(0, -1) : safeBaseUrl
  if (!baseNoTrailing) return safePathname

  if (safePathname === baseNoTrailing) return '/'
  if (safePathname.startsWith(`${baseNoTrailing}/`)) {
    const stripped = safePathname.slice(baseNoTrailing.length)
    return stripped || '/'
  }

  return safePathname
}

// Apply once ASAP (before mount) to reduce initial layout flash.
applyViewportForPath(stripBaseFromPathname(window.location.pathname, import.meta.env.BASE_URL))

// Keep viewport in sync when navigating between public pages and /admin/*.
router.afterEach((to) => {
  applyViewportForPath(to.path)
})

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

useAuthStore(pinia).initialize()
useTelemetryStore(pinia).initializeGlobalErrorCapture()

app.mount('#app')
