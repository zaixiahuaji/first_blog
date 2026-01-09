<script setup lang="ts">
type Props = {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const close = () => emit('close')
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 text-[#00ff00] font-vt323"
      @click.self="close"
    >
      <div class="w-full max-w-md border-2 border-[#00ff00] bg-black p-6 shadow-[0_0_30px_rgba(0,255,0,0.25)]">
        <div class="flex items-start justify-between gap-4 border-b border-[#00ff00] pb-3">
          <div>
            <h3 class="text-2xl uppercase tracking-widest">注册成功</h3>
            <p class="text-sm opacity-70 mt-1">权限已写入，请使用新凭证登录</p>
          </div>
          <button
            type="button"
            class="text-[#00ff00] hover:text-white transition-colors text-2xl leading-none"
            @click="close"
          >
            ×
          </button>
        </div>

        <div class="mt-4 text-sm leading-6 opacity-80 font-sharetech">
          <p>下一步：</p>
          <p>- 返回登录界面</p>
          <p>- 输入用户名与密码</p>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            class="border border-[#00ff00] px-4 py-2 hover:bg-[#00ff00] hover:text-black transition-colors font-bold uppercase tracking-widest"
            @click="close"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
