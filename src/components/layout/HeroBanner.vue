<template>
  <div class="border-2 border-[#2d2d30] bg-white p-1 relative group shadow-[6px_6px_0px_rgba(0,0,0,0.1)]">
    <div class="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[#2d2d30]"></div>
    <div class="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[#2d2d30]"></div>
    <div class="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[#2d2d30]"></div>
    <div class="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[#2d2d30]"></div>

    <div class="h-64 bg-[#f0f0f2] relative overflow-hidden flex items-center justify-center border border-[#ccc]">
      <div class="absolute inset-0 bg-[repeating-linear-gradient(45deg,#ddd_0px,#ddd_1px,transparent_1px,transparent_10px)] opacity-30"></div>
      <h2 class="text-6xl md:text-9xl font-black text-[#ccc] opacity-50 transform -rotate-6 select-none absolute">
        未来
      </h2>
      <div class="z-10 text-center p-6 bg-white border-2 border-[#2d2d30] max-w-lg shadow-[4px_4px_0px_#ff8800]">
        <h3 class="text-2xl md:text-3xl text-[#2d2d30] mb-2 font-bold uppercase">欢迎来到实验室</h3>
        <p class="text-[#555] font-vt323 text-xl">正在初始化明亮协议... 加载无菌美学...</p>
      </div>
    </div>
    <div class="p-4 flex justify-between items-center bg-white border-t-2 border-[#2d2d30]">
      <span class="text-xs uppercase bg-[#ff8800] text-white px-2 py-0.5 font-bold">精选</span>
      <span class="text-xs font-vt323 text-[#666]">日期: 1984-10-24</span>
    </div>
  </div>
</template>

