import { defineStore } from 'pinia'
import { getMetrics } from '@/api/generated/metrics/metrics'

export const useMetricsStore = defineStore('metrics', {
  state: () => ({
    pageviewsTotal: null as number | null,
    pageviewsLoading: false,
    pageviewsError: null as string | null,

    memoryTotalBytes: null as number | null,
    memoryUsedBytes: null as number | null,
    memoryUsedPercent: null as number | null,
    memoryLoading: false,
    memoryError: null as string | null,
  }),
  actions: {
    async incrementPageviews() {
      this.pageviewsLoading = true
      this.pageviewsError = null
      try {
        const { metricsControllerIncrementPageviews } = getMetrics()
        const response = await metricsControllerIncrementPageviews()
        this.pageviewsTotal = response?.total ?? this.pageviewsTotal ?? 0
      } catch (error) {
        this.pageviewsError = '无法更新访问量'
        console.error('Increment pageviews failed:', error)
      } finally {
        this.pageviewsLoading = false
      }
    },

    async fetchMemoryUsage() {
      this.memoryLoading = true
      this.memoryError = null
      try {
        const { metricsControllerGetMemoryUsage } = getMetrics()
        const response = await metricsControllerGetMemoryUsage()

        const totalBytes = response?.totalBytes
        const usedBytes = response?.usedBytes
        const usedPercent = response?.usedPercent

        this.memoryTotalBytes =
          typeof totalBytes === 'number' && Number.isFinite(totalBytes) ? totalBytes : null
        this.memoryUsedBytes =
          typeof usedBytes === 'number' && Number.isFinite(usedBytes) ? usedBytes : null
        this.memoryUsedPercent =
          typeof usedPercent === 'number' && Number.isFinite(usedPercent) ? usedPercent : null
      } catch (error) {
        this.memoryTotalBytes = null
        this.memoryUsedBytes = null
        this.memoryUsedPercent = null
        this.memoryError = '无法获取内存占用'
        console.error('Fetch memory usage failed:', error)
      } finally {
        this.memoryLoading = false
      }
    },
  },
})
