<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore, type MainView } from '@/stores/ui'
import { usePostsStore, type PostFilter } from '@/stores/posts'
import { useCategoriesStore } from '@/stores/categories'

const uiStore = useUiStore()
const { activeView } = storeToRefs(uiStore)

const archiveDirOpen = ref(true)
const ARCHIVE_DIR_TRANSITION_MS = 200
const ARCHIVE_DIR_TRANSITION = `height ${ARCHIVE_DIR_TRANSITION_MS}ms ease, opacity ${ARCHIVE_DIR_TRANSITION_MS}ms ease`

const postsStore = usePostsStore()
const { filter } = storeToRefs(postsStore)

const categoriesStore = useCategoriesStore()
const { activeCategories } = storeToRefs(categoriesStore)

const isViewActive = (view: MainView) => activeView.value === view
const setView = (view: MainView) => uiStore.setActiveView(view)

watch(
  activeView,
  (view) => {
    archiveDirOpen.value = view === 'archive'
  },
  { immediate: true },
)

const filterItems = computed<Array<{ label: string; value: PostFilter; accent: string }>>(() => {
  const items: Array<{ label: string; value: PostFilter; accent: string }> = [
    { label: '根目录', value: 'all', accent: '#ff8800' },
  ]

  for (const category of activeCategories.value) {
    items.push({
      label: category.name,
      value: category.slug,
      accent: category.color,
    })
  }

  return items
})

const handleArchiveClick = () => {
  if (activeView.value === 'archive') {
    archiveDirOpen.value = !archiveDirOpen.value
    return
  }

  setView('archive')
  archiveDirOpen.value = true
}

const resetArchiveDirTransition = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = ''
  element.style.opacity = ''
  element.style.overflow = ''
  element.style.transition = ''
}

const onArchiveDirBeforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = '0'
  element.style.opacity = '0'
  element.style.overflow = 'hidden'
}

const onArchiveDirEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  const targetHeight = element.scrollHeight

  element.style.transition = ARCHIVE_DIR_TRANSITION
  void element.offsetHeight

  let timeout: number | undefined
  const finish = () => {
    element.removeEventListener('transitionend', onEnd)
    if (timeout) window.clearTimeout(timeout)
    done()
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.target !== element) return
    if (event.propertyName !== 'height') return
    finish()
  }

  element.addEventListener('transitionend', onEnd)
  timeout = window.setTimeout(finish, ARCHIVE_DIR_TRANSITION_MS + 50)

  requestAnimationFrame(() => {
    element.style.height = `${targetHeight}px`
    element.style.opacity = '1'
  })
}

const onArchiveDirAfterEnter = (el: Element) => {
  resetArchiveDirTransition(el)
}

const onArchiveDirEnterCancelled = (el: Element) => {
  resetArchiveDirTransition(el)
}

const onArchiveDirBeforeLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.height = `${element.scrollHeight}px`
  element.style.opacity = '1'
  element.style.overflow = 'hidden'
}

const onArchiveDirLeave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  element.style.transition = ARCHIVE_DIR_TRANSITION
  void element.offsetHeight

  let timeout: number | undefined
  const finish = () => {
    element.removeEventListener('transitionend', onEnd)
    if (timeout) window.clearTimeout(timeout)
    done()
  }
  const onEnd = (event: TransitionEvent) => {
    if (event.target !== element) return
    if (event.propertyName !== 'height') return
    finish()
  }

  element.addEventListener('transitionend', onEnd)
  timeout = window.setTimeout(finish, ARCHIVE_DIR_TRANSITION_MS + 50)

  requestAnimationFrame(() => {
    element.style.height = '0'
    element.style.opacity = '0'
  })
}

const onArchiveDirAfterLeave = (el: Element) => {
  resetArchiveDirTransition(el)
}

const onArchiveDirLeaveCancelled = (el: Element) => {
  resetArchiveDirTransition(el)
}

const setFilter = (value: PostFilter) => {
  if (activeView.value !== 'archive') uiStore.setActiveView('archive')
  postsStore.setFilter(value)
}

const isFilterActive = (value: PostFilter) => filter.value === value
</script>

<template>
  <aside
    class="w-64 bg-[#f4f4f6] border-r-2 border-[#2d2d30] hidden md:flex flex-col p-6 gap-6 h-full overflow-y-auto"
  >
    <!-- 滚动提示 -->
    <div class="text-[10px] text-center text-[#999] uppercase tracking-widest border-b border-[#ccc] pb-2 mb-2">
      :: 系统导航 ::
    </div>

    <!-- 系统模块选择 -->
    <div class="flex-1">
      <h3 class="text-[#555] text-xs uppercase mb-3 font-bold flex justify-between">
        <span>主模块</span>
        <span class="text-[#ff8800] animate-pulse">●在线</span>
      </h3>
      <div class="flex flex-col gap-3">
        <div>
          <button
            type="button"
            class="sys-btn w-full py-3 px-4 text-left border-2 border-[#2d2d30] font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-x-1 transition-transform"
            :class="isViewActive('archive') ? 'bg-[#2d2d30] text-white' : 'bg-white text-[#2d2d30]'"
            @click="handleArchiveClick"
          >
            [ 数据库_日志 ]
          </button>

          <Transition
            :css="false"
            @before-enter="onArchiveDirBeforeEnter"
            @enter="onArchiveDirEnter"
            @after-enter="onArchiveDirAfterEnter"
            @enter-cancelled="onArchiveDirEnterCancelled"
            @before-leave="onArchiveDirBeforeLeave"
            @leave="onArchiveDirLeave"
            @after-leave="onArchiveDirAfterLeave"
            @leave-cancelled="onArchiveDirLeaveCancelled"
          >
            <!-- 目录 (仅 Archive) -->
            <div v-if="activeView === 'archive' && archiveDirOpen">
              <div class="pt-3">
                <div
                  class="border-2 border-[#2d2d30] p-1 bg-white shadow-[4px_4px_0px_rgba(0,0,0,0.1)]"
                >
                  <div class="bg-[#f0f0f2] p-3">
                    <h3
                      class="text-[#2d2d30] uppercase text-sm mb-4 border-b border-[#ccc] pb-1 font-bold"
                    >
                      :: 目录
                    </h3>
                    <nav class="flex flex-col gap-3">
                      <button
                        v-for="item in filterItems"
                        :key="item.value"
                        type="button"
                        class="group text-left text-lg transition-colors flex items-center gap-2 font-bold"
                        :style="{ color: isFilterActive(item.value) ? item.accent : '#555' }"
                        @click="setFilter(item.value)"
                      >
                        <span
                          class="opacity-0 group-hover:opacity-100 transition-opacity"
                          :style="{ color: item.accent, opacity: isFilterActive(item.value) ? 1 : undefined }"
                        >
                          >
                        </span>
                        {{ item.label }}
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
        <button
          type="button"
          class="sys-btn w-full py-3 px-4 text-left border-2 border-[#2d2d30] font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-x-1 transition-transform"
          :class="isViewActive('dashboard') ? 'bg-[#2d2d30] text-white' : 'bg-white text-[#2d2d30]'"
          @click="setView('dashboard')"
        >
          [ 数据_可视化 ]
        </button>
        <button
          type="button"
          class="sys-btn w-full py-3 px-4 text-left border-2 border-[#2d2d30] font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-x-1 transition-transform"
          :class="isViewActive('comms') ? 'bg-[#2d2d30] text-white' : 'bg-white text-[#2d2d30]'"
          @click="setView('comms')"
        >
          [ 通讯_链路 ]
        </button>
      </div>

      <h3 class="text-[#555] text-xs uppercase my-3 font-bold">扩展资源</h3>
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="sys-btn w-full py-3 px-4 text-left border-2 border-[#2d2d30] font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-x-1 transition-transform"
          :class="isViewActive('downloads') ? 'bg-[#2d2d30] text-white' : 'bg-white text-[#2d2d30]'"
          @click="setView('downloads')"
        >
          [ 数据_存档 ]
        </button>
        <button
          type="button"
          class="sys-btn w-full py-3 px-4 text-left border-2 border-[#2d2d30] font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-x-1 transition-transform"
          :class="isViewActive('logs') ? 'bg-[#2d2d30] text-white' : 'bg-white text-[#2d2d30]'"
          @click="setView('logs')"
        >
          [ 系统_日志 ]
        </button>
      </div>

      <div class="h-px bg-[#ccc] my-6"></div>

      <h3 class="text-[#555] text-xs uppercase mb-3 font-bold">配置</h3>
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="sys-btn w-full py-3 px-4 text-left border-2 border-[#2d2d30] font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:translate-x-1 transition-transform"
          :class="isViewActive('settings') ? 'bg-[#2d2d30] text-white' : 'bg-white text-[#2d2d30]'"
          @click="setView('settings')"
        >
          [ 控制_面板 ]
        </button>
      </div>
    </div>

    <!-- 系统状态 -->
    <div class="mt-6 border-t-2 border-[#ccc] pt-4 shrink-0">
      <h4 class="text-[#555] text-xs uppercase mb-2 font-bold">硬件状态</h4>
      <div class="text-xs font-vt323 text-[#666] leading-tight space-y-1">
        <div class="w-full bg-[#ccc] h-1 mb-1">
          <div class="bg-[#ff8800] h-full w-[45%]"></div>
        </div>
        <p class="flex justify-between"><span>RAM:</span> <span>128KB [OK]</span></p>
        <p class="flex justify-between"><span>NET:</span> <span>已连接</span></p>
      </div>
    </div>
  </aside>
</template>
