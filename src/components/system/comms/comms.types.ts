import type { PostDto } from '@/api/generated/model'
import type { FailureType } from '@/stores/telemetry'

export type StepState = 'idle' | 'loading' | 'ok' | 'error'

export type PingStep = {
  key: 'PING_TOTAL' | 'PING_CATEGORIES'
  state: StepState
  durationMs?: number
  failureType?: FailureType
}

export type SearchLaneState = {
  state: StepState
  durationMs?: number
  failureType?: FailureType
  items: PostDto[]
}

