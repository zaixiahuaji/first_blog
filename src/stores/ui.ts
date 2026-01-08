import { defineStore } from 'pinia'
import { useTelemetryStore } from '@/stores/telemetry'

export type MainView =
  | 'archive'
  | 'dashboard'
  | 'comms'
  | 'downloads'
  | 'logs'
  | 'settings'
  | 'about'

export type SimFailureMode = 'SERVER_ERROR' | 'TIMEOUT' | 'NETWORK' | 'RANDOM'

const toggleBodyClass = (className: string, enabled: boolean) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle(className, !enabled)
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeView: 'archive' as MainView,
    crtEnabled: true,
    simulateFailureEnabled: false,
    simulateFailureMode: 'SERVER_ERROR' as SimFailureMode,
  }),
  actions: {
    setActiveView(view: MainView) {
      this.activeView = view
      useTelemetryStore().logUi('VIEW_SWITCH', view)
    },
    setCrtEnabled(enabled: boolean) {
      this.crtEnabled = enabled
      toggleBodyClass('no-crt', enabled)
    },
    toggleCrt() {
      this.setCrtEnabled(!this.crtEnabled)
    },
    syncFromBody() {
      if (typeof document === 'undefined') return
      this.crtEnabled = !document.body.classList.contains('no-crt')
    },
    applyToBody() {
      if (typeof document !== 'undefined') document.body.classList.remove('no-grid')
      toggleBodyClass('no-crt', this.crtEnabled)
    },
    setSimulateFailureEnabled(enabled: boolean) {
      this.simulateFailureEnabled = enabled
    },
    toggleSimulateFailure() {
      this.simulateFailureEnabled = !this.simulateFailureEnabled
    },
    setSimulateFailureMode(mode: SimFailureMode) {
      this.simulateFailureMode = mode
    },
  },
})
