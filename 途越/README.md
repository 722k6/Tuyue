# 途越汽车官网与后台管理系统工程基线

本仓库提供官网、CMS 和 Mock API 的最小可运行基线，让六条责任线在共享类型和稳定 Mock 数据上并行开发。当前不包含正式视觉设计、真实数据库、完整 CRUD、正式权限、Claude 接入、对比、选配、运营业务或生产部署。

## 项目结构

```text
途越/
├─ apps/
│  ├─ web/            # Vue 官网占位应用
│  ├─ admin/          # Vue + Element Plus CMS 占位应用
│  └─ api/            # NestJS Mock API 与 Swagger
├─ packages/
│  ├─ contracts/      # 跨应用 TypeScript 契约
│  ├─ config/         # 共享环境配置助手
│  └─ test-utils/     # 集中 Mock 数据
├─ docs/api/          # 接口契约说明
└─ .github/workflows/ # Pull Request 质量门禁
```

原始需求文档继续保留在 `docs/`，未移动或改写。

## 环境要求与安装

- Node.js 22.12 或更高稳定版本
- pnpm 11 或更高稳定版本

```bash
cd 途越
pnpm install --frozen-lockfile
```

复制 `.env.example` 为 `.env.local` 后可覆盖本地配置；模板不含真实密钥。

## 启动命令与默认地址

```bash
pnpm dev          # 同时启动三个应用
pnpm dev:web      # http://localhost:5173
pnpm dev:admin    # http://localhost:5174
pnpm dev:api      # http://localhost:3000/api
```

- Swagger UI：`http://localhost:3000/api/docs`
- OpenAPI JSON：`http://localhost:3000/api/openapi.json`

## Mock API

- `GET /api/health`
- `GET /api/v1/cars`
- `GET /api/v1/cars/:id`
- `POST /api/v1/auth/mock-login`
- `GET /api/v1/activities`
- `GET /api/v1/dealers`
- `GET /api/v1/admin/cars`（列表：分页、关键词、状态）
- `POST /api/v1/admin/cars`、`PUT /api/v1/admin/cars/:id`、`DELETE /api/v1/admin/cars/:id`
- `PUT /api/v1/admin/cars/:id/parameters`（按分组维护车型参数）
- `POST /api/v1/admin/cars/:id/images`（多图上传）、`PUT /api/v1/admin/cars/:id/images`（排序与主图）、`DELETE /api/v1/admin/cars/:id/images/:imageId`

上传的图片写入 `apps/api/storage/uploads`（已加入 `.gitignore`），通过 `/static/uploads/<文件名>` 访问。车型字段与图片校验规则定义在 `packages/contracts`，后台表单与接口共用同一份校验函数。

请求和响应字段、固定 ID、金额与时间格式见 `docs/api/foundation-contracts.md`。

## 质量命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm format:check
```

GitHub Actions 在 Pull Request 中依次执行冻结 lockfile 安装、lint、typecheck、test 和 build，任一步失败都会阻止工作流成功。

## 新增共享类型

1. 在 `packages/contracts/src/index.ts` 中新增清晰、无 `any` 的类型。
2. 金额使用整数分并以 `Cents` 命名，时间使用 ISO 8601 字符串。
3. 在 `packages/contracts/test/contracts.spec.ts` 增加类型或运行时契约测试。
4. 若接口受影响，同步更新 Swagger、接口测试和 `docs/api/foundation-contracts.md`。
5. 破坏性变更先通知所有消费方并在同一提交中更新调用方。

## 从 Mock API 切换到真实 API

前端只通过各应用的 `src/api.ts` 访问接口。真实 API 保持当前共享契约和统一响应格式时，只需设置：

```dotenv
VITE_API_BASE_URL=https://example.test/api
```

随后将 `apps/api` 控制器中的 `packages/test-utils` 数据读取替换为业务服务；页面、Store 和契约不需要改用 NestJS 内部异常结构。

## 环境变量

| 变量                | 默认值                                        | 说明                  |
| ------------------- | --------------------------------------------- | --------------------- |
| `API_PORT`          | `3000`                                        | NestJS 监听端口       |
| `CORS_ORIGINS`      | `http://localhost:5173,http://localhost:5174` | 逗号分隔的允许来源    |
| `VITE_API_BASE_URL` | `http://localhost:3000/api`                   | web/admin 的 API 基址 |

## 六条责任线接入点

- 林涛：从 `apps/api` 的模块、统一响应、Swagger 和 contracts 继续实现后端公共能力。
- 唐轩：从 `apps/web/src/pages`、路由和 `src/api.ts` 开始官网展示开发。
- 汤毅威：从 `apps/admin/src/layouts`、页面、路由角色元数据开始 CMS 开发。
- 糜昊廷：扩展 `Ai*` 契约后新增独立 API 模块与官网入口，不在前端放密钥。
- 李昱彤：复用 `Compare*`、`ConfigurationSelection`、`QuoteResult`，新增独立 Store 和服务端报价校验。
- 周子涵：复用活动、经销商、埋点和看板契约，扩展 E2E 与 CI，不改变现有质量命令。

优先下一步应先评审并冻结车型字段、权限码和 OpenAPI，再由各责任线分别实现自己的业务闭环。
