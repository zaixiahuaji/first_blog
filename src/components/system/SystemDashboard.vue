<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { getPosts } from '@/api/generated/posts/posts'
  import { categoryAccentMap, categoryLabelMap, type PostCategory } from '@/stores/posts'
  
  type ChartItem = {
    category: PostCategory | 'other'
    label: string
    color: string
    count: number
    percent: number
  }
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const totalPosts = ref(0)
  const categoryCounts = ref<Record<PostCategory, number>>({
    tech: 0,
    music: 0,
    visuals: 0,
  })
  
  const CATEGORY_ORDER: PostCategory[] = ['tech', 'visuals', 'music']
  
  const knownCountsTotal = computed(() =>
    CATEGORY_ORDER.reduce((acc, category) => acc + (categoryCounts.value[category] ?? 0), 0),
  )
  
  const denominator = computed(() => (totalPosts.value > 0 ? totalPosts.value : knownCountsTotal.value))
  
  const primaryItems = computed<ChartItem[]>(() => {
    const total = denominator.value
    return CATEGORY_ORDER.map((category) => {
      const count = categoryCounts.value[category] ?? 0
      const percent = total > 0 ? Math.min(1, Math.max(0, count / total)) : 0
      return {
        category,
        label: categoryLabelMap[category],
        color: categoryAccentMap[category],
        count,
        percent,
      }
    })
  })
  
  const otherItem = computed<ChartItem | null>(() => {
    if (totalPosts.value <= 0) return null
    const otherCount = Math.max(0, totalPosts.value - knownCountsTotal.value)
    if (otherCount <= 0) return null
    return {
      category: 'other',
      label: '其他',
      color: '#ccc',
      count: otherCount,
      percent: Math.min(1, Math.max(0, otherCount / totalPosts.value)),
    }
  })
  
  const pieItems = computed<ChartItem[]>(() => {
    const items = [...primaryItems.value]
    if (otherItem.value) items.push(otherItem.value)
    return items
  })
  
  const pieBackground = computed(() => {
    const items = pieItems.value
    if (denominator.value <= 0 || items.length === 0) return 'conic-gradient(#ccc 0% 100%)'
  
    let start = 0
    const parts = items.map((item, idx) => {
      const isLast = idx === items.length - 1
      const end = isLast ? 100 : start + item.percent * 100
      const part = `${item.color} ${start}% ${end}%`
      start = end
      return part
    })
  
    return `conic-gradient(${parts.join(', ')})`
  })
  
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`
  
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
  
      const nextCounts: Record<PostCategory, number> = { tech: 0, music: 0, visuals: 0 }
      for (const entry of categoriesResult?.categories ?? []) {
        const category = entry.category as PostCategory
        if (category in nextCounts) {
          nextCounts[category] = entry.count ?? 0
        }
      }
      categoryCounts.value = nextCounts
    } catch (e) {
      error.value = '无法加载统计数据'
      console.error('Failed to load dashboard stats:', e)
      totalPosts.value = 0
      categoryCounts.value = { tech: 0, music: 0, visuals: 0 }
    } finally {
      loading.value = false
    }
  }
  
  onMounted(fetchStats)
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
          <span class="text-xs uppercase tracking-widest text-[#999]">日访问量</span>
          <span class="text-4xl font-bold text-[#ff8800] font-vt323">8,402</span>
        </div>
        <div
          class="border-2 border-[#ccc] bg-[#f9f9fa] p-4 flex flex-col items-center justify-center gap-2"
        >
          <span class="text-xs uppercase tracking-widest text-[#999]">存储占用</span>
          <span class="text-4xl font-bold text-[#00a3cc] font-vt323">64.5%</span>
        </div>
        <div
          class="border-2 border-[#ccc] bg-[#f9f9fa] p-4 flex flex-col items-center justify-center gap-2"
        >
          <span class="text-xs uppercase tracking-widest text-[#999]">系统核心</span>
          <span class="text-4xl font-bold text-[#e62e2e] font-vt323">STABLE</span>
        </div>
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
              <div v-for="item in primaryItems" :key="item.category" class="flex-1 h-full relative group flex items-end">
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
              <span v-for="item in primaryItems" :key="item.category" class="flex-1 text-center">
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
              :style="{ background: pieBackground }"
            >
              <div
                class="absolute inset-4 bg-white rounded-full flex items-center justify-center border-2 border-[#ccc]"
              >
                <div class="text-center">
                  <div class="text-xs text-[#999] uppercase">总量</div>
                  <div class="text-2xl font-bold font-vt323">{{ totalPosts }}</div>
                </div>
              </div>
            </div>
            <div class="mt-6 w-full space-y-2 text-xs font-bold">
              <div
                v-for="item in pieItems"
                :key="item.category"
                class="flex items-center justify-between border border-[#ccc] bg-[#f9f9fa] px-3 py-2"
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
  