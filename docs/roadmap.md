# 项目路线图（前端 + NestJS + PostgreSQL）

## 目标与范围
- 打造可演进的个人博客：先完善前端体验，再接入 NestJS 后端与 PostgreSQL（Docker 中运行）。
- 覆盖内容：前端功能完善、接口/数据模型初步规划、部署与环境占位、质量保障与运维关注点。
- 原则：小步快跑、保持可观测性、随时可部署。

## 阶段与里程碑（草案）
- Phase 0：前端打磨
  - 补充文章详情页、标签/搜索占位、分页或“加载更多”。
  - 保持当前白色磁带未来主义主题，完善基础 SEO 元数据。
- Phase 1：后端基础（NestJS）
  - 建立项目骨架、模块拆分（Posts/Auth/Tags/Files）。
  - 设计基础 API：文章列表、详情、分类/标签、搜索，占位 Swagger。
- Phase 2：数据与存储
  - PostgreSQL 容器化（Docker Compose），初版表结构（posts/tags/users/sessions or tokens）。
  - 数据迁移工具（TypeORM/Prisma 2 选 1，占位）。
- Phase 3：集成与部署
  - 前后端联调，区分本地/测试/生产环境变量。
  - 部署占位：Vercel/Netlify（前端），自托管或云容器（后端+DB）。
- Phase 4：质量与可观测
  - 测试（单测/集成/E2E 占位）、日志/监控方案占位。

## 前端演进要点
- 路由与页面：新增文章详情页；About/其他页面可延伸。
- 数据流：从 Pinia 静态数据迁移到 API 拉取；保留本地 Mock 以便开发。
- UI/UX：移动端筛选、可访问性（键盘/对比度）、动画与性能（懒加载）。
- 样式体系：Tailwind 主题扩展（色板、间距、字体），组件化设计模式。

## 后端（NestJS）规划草稿
- 模块建议：Auth、Posts、Tags、Files（上传/静态资源）、Health。
- API 占位：
  - `GET /api/posts`（分页/过滤/搜索）
  - `GET /api/posts/:id`
  - `POST /api/posts`（需鉴权）
  - `GET /api/tags`
  - 预留 `/auth`（登录/刷新/登出，策略待定：JWT/Session）
- 架构注意：DTO + ValidationPipe，统一异常过滤器，日志拦截器，Swagger 文档。

## 数据库与模型（PostgreSQL，草稿占位）
- 基础表（初版）：`posts`、`tags`、`post_tags`、`users`、`sessions/tokens`。
- 迁移与 ORM：TypeORM 或 Prisma（二选一，后续确定）；需要版本化迁移。
- 索引与性能：为 slug/created_at/category 建索引；搜索可先用 ILIKE，后续可加全文。

## 环境与部署占位
- Docker Compose 草稿：`frontend`、`api`、`db(postgres)`、`adminer/pgadmin`（可选）。
- 环境变量约定占位：`DATABASE_URL`、`JWT_SECRET`、`API_BASE_URL`、`NODE_ENV` 等。
- 构建与启动命令占位：前端 `npm run build`，后端 `npm run start:dev/start:prod`。

## 集成与数据流（占位）
- 本地：前端 `.env.local` 指向 `http://localhost:3000/api`；后端连接本地 Docker PostgreSQL。
- 预生产/生产：区分 API 域名与 CORS 白名单；静态资源托管策略待定。

## 测试与质量（占位）
- 前端：单测（Vitest + Testing Library）、E2E（Cypress/Playwright 占位）。
- 后端：单测（Jest）、集成测试（带 Test DB 容器）、契约测试（可选）。
- CI 占位：lint、type-check、test、build；可在 GitHub Actions/自托管 CI 落地。

## 风险与决策记录（模板）
- 例：ORM 选择（TypeORM vs Prisma）——决策点、利弊、结论、日期。
- 例：鉴权模式（JWT vs Session）——兼容性、部署复杂度、前端适配。
- 例：存储与备份策略——数据库快照频率、日志保留、恢复演练。

## 后续可补充内容
- 接口契约详情（请求/响应示例、错误码）。
- 表结构细化（字段、索引、约束、关系）。
- 部署脚本与监控告警清单。
- 性能基线与容量规划。

