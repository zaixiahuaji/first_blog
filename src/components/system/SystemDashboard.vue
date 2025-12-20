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
      <!-- 柱状图模拟 -->
      <div class="border-2 border-[#2d2d30] p-6">
        <h3 class="uppercase font-bold mb-6 text-[#2d2d30] border-b border-[#ccc] pb-2">
          内容分布矩阵
        </h3>
        <div class="flex items-end h-48 gap-4 px-4 border-l border-b border-[#999]">
          <div class="w-1/3 bg-[#ff8800] h-[80%] relative group">
            <span
              class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >80%</span
            >
          </div>
          <div class="w-1/3 bg-[#00a3cc] h-[45%] relative group">
            <span
              class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >45%</span
            >
          </div>
          <div class="w-1/3 bg-[#e62e2e] h-[60%] relative group">
            <span
              class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              >60%</span
            >
          </div>
        </div>
        <div class="flex justify-between mt-2 text-xs font-bold text-[#666] uppercase px-4">
          <span>技术</span>
          <span>视觉</span>
          <span>音乐</span>
        </div>
      </div>

      <!-- 饼图模拟 (CSS Conic Gradient) -->
      <div class="border-2 border-[#2d2d30] p-6 flex flex-col items-center">
        <h3 class="uppercase font-bold mb-6 text-[#2d2d30] w-full border-b border-[#ccc] pb-2">
          扇区完整度
        </h3>
        <div
          class="w-48 h-48 rounded-full border-4 border-[#fff] shadow-[0_0_0_4px_#2d2d30] relative"
          style="background: conic-gradient(#ff8800 0% 35%, #00a3cc 35% 60%, #e62e2e 60% 100%)"
        >
          <div
            class="absolute inset-4 bg-white rounded-full flex items-center justify-center border-2 border-[#ccc]"
          >
            <div class="text-center">
              <div class="text-xs text-[#999] uppercase">总量</div>
              <div class="text-2xl font-bold font-vt323">100%</div>
            </div>
          </div>
        </div>
        <div class="mt-6 flex gap-4 text-xs font-bold">
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 bg-[#ff8800]"></div>
            A区
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 bg-[#00a3cc]"></div>
            B区
          </div>
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 bg-[#e62e2e]"></div>
            C区
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

