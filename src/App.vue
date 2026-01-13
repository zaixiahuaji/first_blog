<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const route = useRoute()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('huaji-admin', isAdminRoute.value)
})
</script>

<template>
  <el-config-provider :locale="zhCn" :z-index="50">
    <RouterView />
  </el-config-provider>
</template>
