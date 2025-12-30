<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { getPosts } from '@/api/generated/posts/posts'
  import { getMetrics } from '@/api/generated/metrics/metrics'
  import type { PostsCategoryStatsItemDto } from '@/api/generated/model'
  import { useMetricsStore } from '@/stores/metrics'
  
  type ChartItem = {
    slug: string
    label: string
    color: string
    count: number
    percent: number
    isActive: boolean
  }

  type PieSegment = ChartItem & {
    path: string
    midAngle: number
  }
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const totalPosts = ref(0)
  const categories = ref<PostsCategoryStatsItemDto[]>([])

  const metricsStore = useMetricsStore()
  const { pageviewsTotal } = storeToRefs(metricsStore)
  const storageUsedPercent = ref<number | null>(null)
  const storageError = ref<string | null>(null)

  const hoveredSlug = ref<string | null>(null)

  const sortedCategories = computed(() =>
    [...categories.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  )

  const denominator = computed(() => {
    if (totalPosts.value > 0) return totalPosts.value
    return sortedCategories.value.reduce((acc, c) => acc + (c.count ?? 0), 0)
  })

  const chartItems = computed<ChartItem[]>(() => {
    const total = denominator.value
    return sortedCategories.value.map((c) => {
      const count = c.count ?? 0
      const percent = total > 0 ? Math.min(1, Math.max(0, count / total)) : 0
      return {
        slug: c.slug,
        label: c.name,
        color: c.color,
        count,
        percent,
        isActive: c.isActive,
      }
    })
  })

  const hoveredItem = computed<ChartItem | null>(() => {
    if (!hoveredSlug.value) return null
    return chartItems.value.find((i) => i.slug === hoveredSlug.value) ?? null
  })

  const TAU = Math.PI * 2
  const PIE_VIEW_BOX = '-50 -50 100 100'
  const PIE_OUTER_R = 50
  const PIE_INNER_R = 38
  const PIE_HOVER_OFFSET_PX = 3

  const polarToCartesian = (radius: number, angle: number) => ({
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  })

  const toFixed = (value: number) => Number(value.toFixed(3))

  const donutPath = (startAngle: number, endAngle: number) => {
    const angle = Math.max(0, endAngle - startAngle)

    const fullCircle = angle >= TAU - 1e-6
    if (fullCircle) {
      const a0 = startAngle
      const a1 = startAngle + Math.PI
      const outer0 = polarToCartesian(PIE_OUTER_R, a0)
      const outer1 = polarToCartesian(PIE_OUTER_R, a1)
      const inner0 = polarToCartesian(PIE_INNER_R, a0)
      const inner1 = polarToCartesian(PIE_INNER_R, a1)

      return [
        `M ${toFixed(outer0.x)} ${toFixed(outer0.y)}`,
        `A ${PIE_OUTER_R} ${PIE_OUTER_R} 0 1 1 ${toFixed(outer1.x)} ${toFixed(outer1.y)}`,
        `A ${PIE_OUTER_R} ${PIE_OUTER_R} 0 1 1 ${toFixed(outer0.x)} ${toFixed(outer0.y)}`,
        `L ${toFixed(inner0.x)} ${toFixed(inner0.y)}`,
        `A ${PIE_INNER_R} ${PIE_INNER_R} 0 1 0 ${toFixed(inner1.x)} ${toFixed(inner1.y)}`,
        `A ${PIE_INNER_R} ${PIE_INNER_R} 0 1 0 ${toFixed(inner0.x)} ${toFixed(inner0.y)}`,
        'Z',
      ].join(' ')
    }

    const startOuter = polarToCartesian(PIE_OUTER_R, startAngle)
    const endOuter = polarToCartesian(PIE_OUTER_R, endAngle)
    const startInner = polarToCartesian(PIE_INNER_R, startAngle)
    const endInner = polarToCartesian(PIE_INNER_R, endAngle)

    const largeArc = angle > Math.PI ? 1 : 0

    return [
      `M ${toFixed(startOuter.x)} ${toFixed(startOuter.y)}`,
      `A ${PIE_OUTER_R} ${PIE_OUTER_R} 0 ${largeArc} 1 ${toFixed(endOuter.x)} ${toFixed(endOuter.y)}`,
      `L ${toFixed(endInner.x)} ${toFixed(endInner.y)}`,
      `A ${PIE_INNER_R} ${PIE_INNER_R} 0 ${largeArc} 0 ${toFixed(startInner.x)} ${toFixed(startInner.y)}`,
      'Z',
    ].join(' ')
  }

  const pieSegments = computed<PieSegment[]>(() => {
    const items = chartItems.value.filter((i) => i.percent > 0)
    if (items.length === 0) return []

    let cursor = -Math.PI / 2
    const start = cursor

    return items.map((item, idx) => {
      const isLast = idx === items.length - 1
      const delta = item.percent * TAU
      const startAngle = cursor
      const endAngle = isLast ? start + TAU : cursor + delta
      cursor = endAngle

      return {
        ...item,
        path: donutPath(startAngle, endAngle),
        midAngle: (startAngle + endAngle) / 2,
      }
    })
  })

  const pieSegmentStyle = (segment: PieSegment) => {
    const isHovered = hoveredSlug.value === segment.slug
    const shouldDim = hoveredSlug.value != null && !isHovered

    const baseOpacity = segment.isActive ? 1 : 0.35
    const opacity = shouldDim ? baseOpacity * 0.5 : baseOpacity

    if (!isHovered) {
      return {
        opacity,
        transform: 'translate(0px, 0px) scale(1)',
        transformBox: 'view-box',
        transformOrigin: 'center',
        transition: 'transform 160ms ease, opacity 160ms ease',
      } as const
    }

    const dx = Math.cos(segment.midAngle) * PIE_HOVER_OFFSET_PX
    const dy = Math.sin(segment.midAngle) * PIE_HOVER_OFFSET_PX

    return {
      opacity: 1,
      transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(1.03)`,
      transformBox: 'view-box',
      transformOrigin: 'center',
      transition: 'transform 160ms ease, opacity 160ms ease',
    } as const
  }

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`

  const formatCount = (value: number | null) => {
    if (value == null) return '--'
    return value.toLocaleString()
  }

  const formatStoragePercent = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return '--%'
    return `${value.toFixed(1)}%`
  }
  
  const fetchStats = async () => {
    loading.value = true
    error.value = null
  
    try {
      const { postsControllerGetTotal, postsControllerGetCategoriesStats } = getPosts()
      const [totalResult, categoriesResult] = await Promise.all([
        postsControllerGetTotal(),
        postsControllerGetCategoriesStats(),
      ])
  
      totalPosts.value = totalResult?.total ?? 0
      categories.value = categoriesResult?.categories ?? []
    } catch (e) {
      error.value = '无法加载统计数据'
      console.error('Failed to load dashboard stats:', e)
      totalPosts.value = 0
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  const fetchStorageUsage = async () => {
    storageError.value = null
    try {
      const { metricsControllerGetStorageUsage } = getMetrics()
      const response = await metricsControllerGetStorageUsage()
      const usedPercent = response?.usedPercent
      storageUsedPercent.value =
        typeof usedPercent === 'number' && Number.isFinite(usedPercent) ? usedPercent : null
    } catch (e) {
      storageUsedPercent.value = null
      storageError.value = 'æ— æ³•èŽ·å–å­˜å‚¨å ç”¨'
      console.error('Failed to load storage usage:', e)
    }
  }
  
  onMounted(() => {
    fetchStats()
    fetchStorageUsage()
  })
  </script>
  
  <template>
    <section
      class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
    >
      <h2
        class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30] flex justify-between items-end"
      >
        <span>数据_可视化</span>
        <span class="text-sm font-normal font-vt323 text-[#666]">REF_ID: 9002</span>
      </h2>
  
      <!-- 顶部统计卡 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div
          class="border-2 border-[#ccc] bg-[#f9f9fa] p-4 flex flex-col items-center justify-center gap-2"
        >
          <span class="text-xs uppercase tracking-widest text-[#999]">总访问量</span>
          <span class="text-4xl font-bold text-[#ff8800] font-vt323">{{ formatCount(pageviewsTotal) }}</span>
        </div>
        <div
          class="border-2 border-[#ccc] bg-[#f9f9fa] p-4 flex flex-col items-center justify-center gap-2"
        >
          <span class="text-xs uppercase tracking-widest text-[#999]">存储占用</span>
          <span class="text-4xl font-bold text-[#00a3cc] font-vt323">
            {{ formatStoragePercent(storageUsedPercent) }}
          </span>
        </div>
        <div
          class="border-2 border-[#ccc] bg-[#f9f9fa] p-4 flex flex-col items-center justify-center gap-2"
        >
          <span class="text-xs uppercase tracking-widest text-[#999]">系统核心</span>
          <span class="text-4xl font-bold text-[#e62e2e] font-vt323">STABLE</span>
        </div>
      </div>

      <div
        v-if="storageError"
        class="-mt-8 mb-8 border border-red-600 bg-red-50 px-3 py-2 text-xs font-sharetech text-red-600"
      >
        å­˜å‚¨å ç”¨è¯»å–å¤±è´¥
      </div>
  
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- 柱状图 -->
        <div class="border-2 border-[#2d2d30] p-6">
          <h3 class="uppercase font-bold mb-6 text-[#2d2d30] border-b border-[#ccc] pb-2">
            内容分布矩阵
          </h3>
  
          <div
            v-if="loading"
            class="h-48 flex items-center justify-center text-sm font-vt323 text-[#666] animate-pulse"
          >
            >> 正在读取统计...
          </div>
          <div
            v-else-if="error"
            class="h-48 flex items-center justify-center text-sm font-sharetech text-red-600 border border-red-600 bg-red-50 p-4"
          >
            错误: {{ error }}
          </div>
          <template v-else>
            <div class="flex items-end h-48 gap-4 px-4 border-l border-b border-[#999]">
              <div v-for="item in chartItems" :key="item.slug" class="flex-1 h-full relative group flex items-end">
                <div
                  class="w-full relative"
                  :style="{ height: `${(item.percent * 100).toFixed(2)}%`, backgroundColor: item.color }"
                ></div>
                <span
                  class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {{ formatPercent(item.percent) }} ({{ item.count }})
                </span>
              </div>
            </div>
            <div class="flex mt-2 text-xs font-bold text-[#666] uppercase px-4">
              <span
                v-for="item in chartItems"
                :key="item.slug"
                class="flex-1 text-center"
                :class="{ 'opacity-40': !item.isActive }"
              >
                {{ item.label }}
              </span>
            </div>
          </template>
        </div>
  
        <!-- 饼图 -->
        <div class="border-2 border-[#2d2d30] p-6 flex flex-col items-center">
          <h3 class="uppercase font-bold mb-6 text-[#2d2d30] w-full border-b border-[#ccc] pb-2">
            扇区完整度
          </h3>
  
          <div
            v-if="loading"
            class="h-64 w-full flex items-center justify-center text-sm font-vt323 text-[#666] animate-pulse"
          >
            >> 正在读取统计...
          </div>
          <div
            v-else-if="error"
            class="h-64 w-full flex items-center justify-center text-sm font-sharetech text-red-600 border border-red-600 bg-red-50 p-4"
          >
            错误: {{ error }}
          </div>
          <template v-else>
            <div
              class="w-48 h-48 rounded-full border-4 border-[#fff] shadow-[0_0_0_4px_#2d2d30] relative"
              @mouseleave="hoveredSlug = null"
            >
              <svg
                class="absolute inset-0 overflow-visible"
                :viewBox="PIE_VIEW_BOX"
                role="img"
                aria-label="Categories pie chart"
              >
                <circle r="46" fill="#ccc" />
                <path
                  v-for="segment in pieSegments"
                  :key="segment.slug"
                  :d="segment.path"
                  :fill="segment.color"
                  :stroke="hoveredSlug === segment.slug ? '#2d2d30' : '#fff'"
                  :stroke-width="hoveredSlug === segment.slug ? 2 : 1"
                  class="cursor-pointer"
                  :style="pieSegmentStyle(segment)"
                  @mouseenter="hoveredSlug = segment.slug"
                >
                  <title>{{ segment.label }} · {{ segment.count }} · {{ formatPercent(segment.percent) }}</title>
                </path>
              </svg>

              <div
                class="absolute inset-4 bg-white rounded-full flex items-center justify-center border-2 border-[#ccc] pointer-events-none"
              >
                <div class="text-center">
                  <div class="text-xs text-[#999] uppercase">
                    {{ hoveredItem ? '类别' : '总量' }}
                  </div>
                  <div v-if="hoveredItem" class="text-lg font-bold font-vt323">
                    {{ hoveredItem.label }}
                  </div>
                  <div v-else class="text-2xl font-bold font-vt323">{{ totalPosts }}</div>
                  <div v-if="hoveredItem" class="text-sm font-vt323 text-[#666]">
                    {{ hoveredItem.count }} · {{ formatPercent(hoveredItem.percent) }}
                  </div>
                </div>
              </div>
            </div>
            <div
              class="mt-6 w-full max-h-[260px] space-y-2 overflow-y-auto overscroll-contain pr-1 text-xs font-bold"
              @mouseleave="hoveredSlug = null"
            >
              <div
                v-for="item in chartItems"
                :key="item.slug"
                class="flex items-center justify-between border bg-[#f9f9fa] px-3 py-2 cursor-pointer transition-colors"
                :class="{
                  'opacity-40': !item.isActive,
                  'border-[#2d2d30] bg-white': hoveredSlug === item.slug,
                  'border-[#ccc]': hoveredSlug !== item.slug,
                }"
                @mouseenter="hoveredSlug = item.slug"
              >
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3" :style="{ backgroundColor: item.color }"></div>
                  <span class="uppercase">{{ item.label }}</span>
                </div>
                <div class="font-vt323 text-[#666]">{{ item.count }} · {{ formatPercent(item.percent) }}</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>
  </template>
  
