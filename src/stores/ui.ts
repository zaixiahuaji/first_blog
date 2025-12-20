import { defineStore } from 'pinia'

export type MainView = 'archive' | 'dashboard' | 'comms' | 'downloads' | 'logs' | 'settings'

const toggleBodyClass = (className: string, enabled: boolean) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle(className, !enabled)
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeView: 'archive' as MainView,
    crtEnabled: true,
    gridEnabled: true,
  }),
  actions: {
    setActiveView(view: MainView) {
      this.activeView = view
    },
    setCrtEnabled(enabled: boolean) {
      this.crtEnabled = enabled
      toggleBodyClass('no-crt', enabled)
    },
    setGridEnabled(enabled: boolean) {
      this.gridEnabled = enabled
      toggleBodyClass('no-grid', enabled)
    },
    toggleCrt() {
      this.setCrtEnabled(!this.crtEnabled)
    },
    toggleGrid() {
      this.setGridEnabled(!this.gridEnabled)
    },
    syncFromBody() {
      if (typeof document === 'undefined') return
      this.crtEnabled = !document.body.classList.contains('no-crt')
      this.gridEnabled = !document.body.classList.contains('no-grid')
    },
    applyToBody() {
      toggleBodyClass('no-crt', this.crtEnabled)
      toggleBodyClass('no-grid', this.gridEnabled)
    },
  },
})

