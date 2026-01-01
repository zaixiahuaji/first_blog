<script setup lang="ts"></script>

<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30] flex justify-between items-end">
      <span>关于此站</span>
      <span class="text-sm font-normal font-vt323 text-[#666]">REF_ID: 9007</span>
    </h2>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="border-2 border-[#2d2d30] p-6 bg-[#f9f9fa]">
        <h3 class="uppercase font-bold mb-4 text-[#2d2d30] border-b border-[#ccc] pb-2">站点介绍</h3>
        <p class="text-sm text-[#555] leading-relaxed font-sharetech">
          这里将展示站点介绍与站点信息（内容待补充）。
        </p>
      </div>

      <div class="border-2 border-[#2d2d30] p-6 bg-[#f9f9fa]">
        <h3 class="uppercase font-bold mb-4 text-[#2d2d30] border-b border-[#ccc] pb-2">技术栈</h3>
        <div class="flex flex-wrap gap-2 text-xs font-bold">
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">NestJS</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">PostgreSQL · pgvector</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">Vue 3</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">Docker / 1Panel</span>
        </div>
      </div>

      <div class="border-2 border-[#2d2d30] p-6 bg-[#f9f9fa] lg:col-span-2">
        <h3 class="uppercase font-bold mb-4 text-[#2d2d30] border-b border-[#ccc] pb-2">提示</h3>
        <p class="text-sm text-[#555] leading-relaxed font-sharetech">
          这个页面当前以观赏性为主，后续再一起讨论要展示的具体内容。
        </p>
      </div>
    </div>
  </section>
</template>

