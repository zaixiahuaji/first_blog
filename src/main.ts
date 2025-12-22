import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { useTelemetryStore } from '@/stores/telemetry'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

useAuthStore(pinia).initialize()
useTelemetryStore(pinia).initializeGlobalErrorCapture()

app.mount('#app')
