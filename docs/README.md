# 个人博客（Vue 3 + Vite）开发文档

## 项目简介
- 这是一个赛博复古风格的个人博客原型，当前以静态数据展示文章卡片，尚未接入真实后端。
- 首页包含英雄横幅、分类筛选（技术 / 音乐 / 视觉）和文章卡片瀑布布局，移动端具备单独的筛选入口。
- 路由暂含首页 `/` 与 About 占位页，整体样式保持白色磁带未来主义基调，并结合 Tailwind 实用类与自定义效果（CRT 叠加、扫描线）。

## 当前特性
- 文章数据与分类筛选由 Pinia 存储 `src/stores/posts.ts` 提供，支持 `all`/`tech`/`music`/`visuals` 过滤。
- 组件化布局：`AppHeader`、`SidebarNav`、`HeroBanner`、`BlogGrid`、`AppFooter` 等模块化组合。
- 样式：Tailwind 实用类 + `src/assets/main.css` 中的全局样式（字体、背景网格、选区高亮、CRT/scan-line 叠层）。
- 构建与类型：Vite + TypeScript，`vue-tsc` 进行类型检查。

## 计划特性占位（可按需填写）
- 文章详情页与路由；Markdown 渲染；草稿与发布流转。
- 标签/搜索/分页；RSS；归档时间轴；阅读统计。
- 主题：保持当前白色磁带未来主义风格（不做多主题切换）；多语言（i18n）。
- 评论与互动（待定第三方/自建）；SEO/OG 元数据。
- 部署脚本（Vercel/Netlify/自托管）、CI/CD、监控与日志。

## 技术栈
- Vue 3 + TypeScript，状态管理使用 Pinia，路由使用 Vue Router。
- 样式：Tailwind CSS 3（`tailwind.config.js` 已指向 `index.html` 与 `src/**/*`），PostCSS + Autoprefixer。
- 构建/开发：Vite 7，`npm-run-all2` 组织复合脚本。

## 环境要求
- Node.js：`^20.19.0 || >=22.12.0`（见 `package.json`）。
- 包管理器：npm（已生成 `package-lock.json`，如切换 pnpm/yarn 请先清理锁文件）。

## 安装与运行
1) 安装依赖  
`npm install`
2) 本地开发（默认 http://localhost:5173 ）  
`npm run dev`
3) 生产构建  
`npm run build`
4) 预览构建产物  
`npm run preview`
5) 类型检查（不含单测）  
`npm run type-check`

## 目录结构
```
.
├─ src/
│  ├─ assets/          # 全局样式、字体、图标
│  ├─ components/
│  │  ├─ layout/       # Header/Sidebar/Hero/Footer 等
│  │  └─ blog/         # BlogGrid、过滤导航等
│  ├─ router/          # 路由定义
│  ├─ stores/          # Pinia 状态（posts）
│  └─ views/           # 页面级视图（Home/About）
├─ public/             # 静态资源
├─ tailwind.config.js
├─ postcss.config.js
├─ vite.config.ts
└─ package.json
```

## 开发指南
- 启动与热更新：执行 `npm run dev`，Vite 提供 HMR。
- 样式与设计系统
  - Tailwind 已启用，常用间距类（如 `mb-12`）可直接使用；全局入口在 `src/assets/main.css`。
  - 若扩展主题，请在 `tailwind.config.js` 的 `theme.extend` 中追加色板/间距/字体等。
- 数据与分类
  - 文章数据位于 `src/stores/posts.ts`，新增分类时需同时更新 `categoryLabelMap` 与 `categoryAccentMap`。
  - 筛选逻辑通过 `filteredPosts` getter；若改为后端分页，可替换为异步 actions。
- 路由与页面
  - 入口在 `src/main.ts`（注册 Pinia 与路由），当前路由：`/`、`/about`。
  - 新页面请在 `src/views` 创建并在 `src/router/index.ts` 注册；如需代码分割可使用动态导入。

## 扩展模板（按需复制填写）
- 功能说明模板  
  - 背景/目标：  
  - 交互与状态：  
  - 数据来源/API：  
  - 组件与路由：  
  - 样式/响应式注意：  
  - 验收标准：
- 测试策略占位  
  - 单元：建议引入 Vitest + Testing Library；  
  - 端到端：可选 Cypress；  
  - 类型：`npm run type-check`。
- 部署说明占位  
  - 目标环境（Vercel/Netlify/自托管）；  
  - 构建命令：`npm run build`；  
  - 产物：`dist/`。
- 版本/迭代记录占位  
  - v0.1.0：...  
  - v0.2.0：...（示例）

## Roadmap（草案，可持续更新）
- 短期：接入真实文章数据源，完善文章详情与标签筛选。
- 中期：增加主题切换、i18n、RSS、基本 SEO 元数据。
- 长期：评论系统、部署流水线、性能监测与可观测性。

