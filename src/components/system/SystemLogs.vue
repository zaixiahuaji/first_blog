<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

type LogItem = {
  time: string
  message: string
  level?: 'warning'
}

const logs = ref<LogItem[]>([
  { time: '00:00:01', message: '系统初始化...' },
  { time: '00:00:02', message: '加载核心模块... 完成' },
  { time: '00:00:02', message: '连接网格... 成功 (Ping: 12ms)' },
  { time: '00:00:03', message: '渲染引擎就绪' },
  { time: '00:00:05', message: '警告: 检测到非标准分辨率', level: 'warning' },
  { time: '00:00:06', message: '调整视口... 完成' },
  { time: '00:00:08', message: '监听用户输入...' },
])

let timer: number | undefined

const addRandomLog = () => {
  if (Math.random() <= 0.7) return
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const msgs = ['清理缓存碎片...', '同步数据流...', '检测到信号干扰...', '更新显示矩阵...']
  logs.value.unshift({ time, message: msgs[Math.floor(Math.random() * msgs.length)] ?? '...' })
  if (logs.value.length > 20) logs.value.pop()
}

onMounted(() => {
  timer = window.setInterval(addRandomLog, 2000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-[#2d2d30] p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto text-green-500 font-vt323"
  >
    <h2 class="text-3xl font-bold uppercase mb-4 text-white border-b-2 border-white/20 pb-4">系统_日志</h2>
    <div class="space-y-1 text-lg opacity-80">
      <p v-for="(log, idx) in logs" :key="idx">
        [{{ log.time }}]
        <span v-if="log.level === 'warning'" class="text-[#ff8800]">{{ log.message }}</span>
        <template v-else>{{ log.message }}</template>
      </p>
    </div>
  </section>
</template>

