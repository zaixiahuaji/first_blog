import { defineStore } from 'pinia'
import { getMetrics } from '@/api/generated/metrics/metrics'

export const useMetricsStore = defineStore('metrics', {
  state: () => ({
    pageviewsTotal: null as number | null,
    loading: false,
    error: null as string | null,
  }),
  actions: {
    async incrementPageviews() {
      this.loading = true
      this.error = null
      try {
        const { metricsControllerIncrementPageviews } = getMetrics()
        const response = await metricsControllerIncrementPageviews()
        this.pageviewsTotal = response?.total ?? this.pageviewsTotal ?? 0
      } catch (error) {
        this.error = '无法更新访问量'
        console.error('Increment pageviews failed:', error)
      } finally {
        this.loading = false
      }
    },
  },
})
