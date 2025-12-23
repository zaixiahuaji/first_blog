import { defineStore } from 'pinia'

export type TelemetryKind = 'ui' | 'network' | 'error'

export type FailureType = 'TIMEOUT' | 'NETWORK' | 'SERVER_ERROR'

export type TelemetryKey =
  | 'VIEW_SWITCH'
  | 'SELF_CHECK'
  | 'SEARCH_TRIGGER'
  | 'COPY_SUMMARY'
  | 'DOWNLOAD_EXPORT'
  | 'PING_TOTAL'
  | 'PING_CATEGORIES'
  | 'SEARCH_KEYWORD'
  | 'SEARCH_SEMANTIC'

export const TELEMETRY_LABELS: Record<TelemetryKey, string> = {
  VIEW_SWITCH: '视图切换',
  SELF_CHECK: '链路自检',
  SEARCH_TRIGGER: '搜索触发',
  COPY_SUMMARY: '复制摘要',
  DOWNLOAD_EXPORT: '导出下载',
  PING_TOTAL: '文章总量',
  PING_CATEGORIES: '类别列表',
  SEARCH_KEYWORD: '关键词搜索',
  SEARCH_SEMANTIC: '语义搜索',
}

export type TelemetryEntry =
  | {
      id: string
      ts: number
      kind: 'ui'
      key: TelemetryKey
      detail?: string
    }
  | {
      id: string
      ts: number
      kind: 'network'
      key: TelemetryKey
      ok: boolean
      durationMs: number
      failureType?: FailureType
    }
  | {
      id: string
      ts: number
      kind: 'error'
      errorType: string
    }

const MAX_ENTRIES = 200

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const classifyFailureType = (error: unknown): FailureType => {
  const anyError = error as any

  if (anyError?.code === 'ECONNABORTED') return 'TIMEOUT'
  if (typeof anyError?.message === 'string' && anyError.message.toLowerCase().includes('timeout')) {
    return 'TIMEOUT'
  }

  if (anyError?.response) return 'SERVER_ERROR'

  return 'NETWORK'
}

const formatFailureType = (failureType?: FailureType) => {
  const code = failureType ?? 'SERVER_ERROR'
  if (code === 'TIMEOUT') return '超时(TIMEOUT)'
  if (code === 'NETWORK') return '网络(NETWORK)'
  return '服务器错误(SERVER_ERROR)'
}

export const formatTelemetryEntry = (entry: TelemetryEntry): string => {
  if (entry.kind === 'error') return `错误 | ${entry.errorType}`

  const label = TELEMETRY_LABELS[(entry as any).key as TelemetryKey] ?? (entry as any).key

  if (entry.kind === 'ui') return entry.detail ? `${label} | ${entry.detail}` : label

  if (entry.ok) return `${label} | 成功 | ${Math.round(entry.durationMs)}ms`
  return `${label} | 失败(${formatFailureType(entry.failureType)}) | ${Math.round(entry.durationMs)}ms`
}

export const useTelemetryStore = defineStore('telemetry', {
  state: () => ({
    entries: [] as TelemetryEntry[],
    captureInitialized: false,
  }),
  actions: {
    push(entry: TelemetryEntry) {
      this.entries.push(entry)
      if (this.entries.length > MAX_ENTRIES) {
        this.entries.splice(0, this.entries.length - MAX_ENTRIES)
      }
    },
    clear() {
      this.entries = []
    },
    logUi(key: TelemetryKey, detail?: string) {
      this.push({ id: makeId(), ts: Date.now(), kind: 'ui', key, detail })
    },
    logNetwork(key: TelemetryKey, payload: { ok: boolean; durationMs: number; failureType?: FailureType }) {
      this.push({ id: makeId(), ts: Date.now(), kind: 'network', key, ...payload })
    },
    logError(errorType: string) {
      this.push({ id: makeId(), ts: Date.now(), kind: 'error', errorType })
    },
    initializeGlobalErrorCapture() {
      if (this.captureInitialized || typeof window === 'undefined') return
      this.captureInitialized = true

      window.addEventListener('error', (event) => {
        const errorType = (event as ErrorEvent).error?.name ?? 'Error'
        this.logError(errorType)
      })

      window.addEventListener('unhandledrejection', (event) => {
        const reason = (event as PromiseRejectionEvent).reason
        const errorType =
          (reason && typeof reason === 'object' && 'name' in reason && typeof reason.name === 'string'
            ? reason.name
            : null) ?? 'UnhandledRejection'

        this.logError(errorType)
      })
    },
  },
})
