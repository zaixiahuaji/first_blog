# first_blog（Vue3 前端）

一个基于 `Vue 3 + Vite + TypeScript` 的个人博客前端：前台展示文章列表与详情（Markdown 渲染），后台提供登录与文章管理（CRUD）。

## 技术栈
- Vue 3、Vite、TypeScript
- Vue Router、Pinia
- TailwindCSS
- Axios + Orval（基于 `openapi.json` 生成请求代码）
- marked（Markdown 渲染）

## 功能概览
- 文章列表：分页加载、分类过滤、关键词搜索 / 语义搜索（`q` / `vectorQ`）
- 文章详情：弹窗查看，支持 Markdown
- 管理端：登录/注册、文章新建/编辑/删除

## 快速开始
> 需要 Node.js：`^20.19.0 || >=22.12.0`

1) 安装依赖
```bash
npm install
```

2) 配置环境变量（编辑 `.env`）
- `VITE_API_BASE_URL`：后端 API 基础地址
  - 推荐：`/`（本地开发依赖 Vite proxy 转发 `/api` 和 `/uploads`，生产同域也使用 `/`）
  - 可选：`http://localhost:3000/`（直连后端，不推荐；可能需要后端 CORS 配置）

3) 启动开发服务
```bash
npm run dev
```

## 常用命令
- 开发：`npm run dev`
- 类型检查：`npm run type-check`
- 构建：`npm run build`
- 本地预览构建产物：`npm run preview`

## 路由
- `/`：前台首页
- `/admin/login`：管理端登录/注册
- `/admin/dashboard`：管理端控制台（需要登录）

## API 代码生成（Orval）
- OpenAPI：`openapi.json`
- Orval 配置：`orval.config.ts`
- 生成目录：`src/api/generated`

重新生成（当 `openapi.json` 更新后）：
```bash
npx orval --config orval.config.ts
```

## 目录结构（简要）
- `src/views`：页面（前台/管理端）
- `src/components`：组件（layout/blog/admin）
- `src/stores`：Pinia 状态（auth/posts）
- `src/api`：Axios 实例与 Orval 生成代码
