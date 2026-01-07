<script setup lang="ts">
import { ref } from 'vue'

type FriendLinkIcon = { src: string; alt?: string }
type FriendLink = { name: string; href: string; icon?: FriendLinkIcon }

const withBase = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const FRIEND_LINKS: FriendLink[] = [
  {
    name: 'B站账号',
    href: 'https://space.bilibili.com/194579862',
    icon: { src: withBase('friend-icons/bilibili.svg') },
  },
  {
    name: '原仿猫',
    href: 'http://www.yuanfangmao.com/',
    icon: { src: withBase('friend-icons/blog.svg') },
  },
]

const failedIcons = ref<Record<string, boolean>>({})
const isIconFailed = (link: FriendLink) => Boolean(failedIcons.value[link.href])
const markIconFailed = (link: FriendLink) => {
  failedIcons.value[link.href] = true
}
</script>

<template>

  <section
    class="block h-full border-2 border-[#2d2d30] bg-white p-6 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,0.1)] overflow-y-auto">
    <h2 class="text-3xl font-bold uppercase mb-8 pb-4 border-b-4 border-[#2d2d30] flex justify-between items-end">
      <span style="font-weight: 700">关于此站</span>
      <span class="text-sm font-normal font-vt323 text-[#666]">REF_ID: 9007</span>
    </h2>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div class="border-2 border-[#2d2d30] p-6 bg-[#f9f9fa]">
        <h3 class="uppercase font-bold mb-4 border-b border-[#ccc] pb-2 text-[#ff8800]">站点介绍</h3>
        <div class="text-sm text-[#555] leading-relaxed font-sharetech space-y-2 content-bold">
          <p>此站采用磁带未来主义的视觉风格——如果你刚好喜欢这种风格，欢迎随便逛逛。</p>
          <p>这种风格在美学上吸引了我，至于其背后的思潮，我无意深究，只是喜欢。</p>
          <p>如果你仔细摸索的话，就能发现一个不显眼的页面入口，但不会对外开放。</p>
        </div>
      </div>

      <div class="border-2 border-[#2d2d30] p-6 bg-[#f9f9fa]">
        <h3 class="uppercase font-bold mb-4 text-[#e62e2e] border-b border-[#ccc] pb-2">技术栈</h3>
        <div class="flex flex-wrap gap-2 text-xs font-bold">
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">VUE 3</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">Element plus</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">NestJS</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">TypeScript</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">NodeJS</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">PostgreSQL · pgvector</span>
          <span class="px-2 py-1 border-2 border-[#2d2d30] bg-white">Docker</span>
        </div>
      </div>

      <div class="border-2 border-[#2d2d30] p-6 bg-[#f9f9fa] lg:col-span-2">
        <h3 class="uppercase font-bold mb-4 text-[#00a3cc] border-b border-[#ccc] pb-2">友情链接</h3>
        <div class="flex flex-wrap gap-3">
          <a
            v-for="(link, idx) in FRIEND_LINKS"
            :key="`${link.href}-${idx}`"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="group flex items-center justify-center gap-4 px-5 py-4 min-w-[130px] border-2 border-[#2d2d30] bg-white text-[#2d2d30] transition-colors hover:bg-[#2d2d30] hover:text-white"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                v-if="!link.icon?.src || isIconFailed(link)"
                class="w-6 h-6 shrink-0 bg-[#ccc]"
                aria-hidden="true"
              ></div>
              <img
                v-else
                class="w-6 h-6 shrink-0"
                :src="link.icon.src"
                :alt="link.icon.alt ?? link.name"
                width="24"
                height="24"
                loading="lazy"
                decoding="async"
                @error="markIconFailed(link)"
              />
              <span class="font-bold truncate">{{ link.name }}</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
  .content-bold p {
      font-weight: 700; /* 或者使用600、800等数值调整粗细程度 */
  }
  </style>