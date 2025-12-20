<template>
  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto"
  >
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30]">建立_链路</h2>

    <div class="flex flex-col lg:flex-row gap-12">
      <!-- 表单 -->
      <div class="flex-1 space-y-6">
        <p class="text-[#666] font-vt323 text-lg mb-6">请输入传输参数以发起上行链路。</p>

        <div class="group">
          <label class="block text-xs font-bold uppercase text-[#ff8800] mb-1">协议 ID [姓名]</label>
          <input
            type="text"
            class="w-full bg-[#f4f4f6] border-b-2 border-[#ccc] p-3 outline-none focus:border-[#ff8800] focus:bg-white transition-colors font-sharetech"
            placeholder="Guest_User"
          />
        </div>

        <div class="group">
          <label class="block text-xs font-bold uppercase text-[#00a3cc] mb-1">频率 [邮箱]</label>
          <input
            type="email"
            class="w-full bg-[#f4f4f6] border-b-2 border-[#ccc] p-3 outline-none focus:border-[#00a3cc] focus:bg-white transition-colors font-sharetech"
            placeholder="user@net.link"
          />
        </div>

        <div class="group">
          <label class="block text-xs font-bold uppercase text-[#e62e2e] mb-1">数据包 [消息]</label>
          <textarea
            rows="5"
            class="w-full bg-[#f4f4f6] border-b-2 border-[#ccc] p-3 outline-none focus:border-[#e62e2e] focus:bg-white transition-colors font-sharetech"
            placeholder="输入加密信息..."
          ></textarea>
        </div>

        <button
          class="bg-[#2d2d30] text-white px-8 py-3 uppercase tracking-widest hover:bg-[#ff8800] transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.2)] font-bold w-full md:w-auto"
        >
          发送_传输
        </button>
      </div>

      <!-- 装饰侧边 -->
      <div class="w-full lg:w-72 border-2 border-[#ccc] p-6 bg-[#f9f9fa] flex flex-col gap-4">
        <h3 class="font-bold text-[#2d2d30] uppercase text-sm border-b border-[#ccc] pb-2">加密状态</h3>
        <div class="font-vt323 text-[#666] space-y-2 text-sm">
          <p>>> 握手协议... <span class="text-[#00a3cc]">完成</span></p>
          <p>>> 密钥交换... <span class="text-[#00a3cc]">完成</span></p>
          <p>>> 通道稳定度... <span class="text-[#ff8800]">98%</span></p>
        </div>

        <div class="mt-auto h-32 bg-[#2d2d30] p-2 relative overflow-hidden">
          <div
            class="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#00ff00_3px)]"
          ></div>
          <div class="text-[#00ff00] font-vt323 text-xs leading-none break-all opacity-70">
            01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111 01110010
            01101100 01100100
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

