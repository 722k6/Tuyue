# 途越最小工程基础实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可启动、可测试、可供六条责任线并行开发的 pnpm monorepo 基线。

**Architecture:** `apps/web` 与 `apps/admin` 使用 Vue 3/Vite，共享 `packages/contracts`；`apps/api` 使用 NestJS 提供固定 Mock API 和 OpenAPI。Mock 数据集中在 `packages/test-utils`，根目录统一执行质量命令。

**Tech Stack:** pnpm workspace、TypeScript、Vue 3、Vite、Vue Router、Pinia、Element Plus、NestJS、Swagger、Vitest、ESLint、Prettier、GitHub Actions。

**Spec:** `docs/superpowers/plans/2026-10-27-tuyue-six-person-allocation.md`，并以本次用户请求的“只做最小工程基础”范围为最高约束。

## Global Constraints

- 不实现真实数据库、完整 CRUD、完整权限、Claude、车型对比、选配、活动/经销商/看板业务。
- 所有金额使用整数分，时间使用 ISO 8601 字符串，经纬度使用明确数值类型。
- Mock 数据集中、ID 稳定、无真实个人信息或密钥。
- 每个行为先写失败测试，再实现最小代码；阶段验证后提交。

## Review Focus

- API 成功与失败响应均带 requestId，前端不依赖 NestJS 异常结构。
- 未知车型稳定返回 `CAR_NOT_FOUND` 和 404。
- 三种管理员角色均可通过 mock 登录返回。
- web/admin 的 API 基址可配置，默认本地 API。
- 根命令、CI 命令和 README 完全一致。

---

### Task 1: Workspace、共享契约与 Mock 数据
- [ ] 建立根 workspace 与质量配置。
- [ ] 先写 contracts/test-utils 失败测试并运行 RED。
- [ ] 实现共享类型与集中 Mock 数据并运行 GREEN。
- [ ] 验证并提交。

### Task 2: NestJS Mock API 与 OpenAPI
- [ ] 先写健康、车型、错误、登录接口测试并运行 RED。
- [ ] 实现控制器、中间件、拦截器、异常过滤器和 Swagger。
- [ ] 运行单元/接口测试并提交。

### Task 3: Web 应用
- [ ] 先写共享类型与健康状态 Store 测试并运行 RED。
- [ ] 实现路由、占位页面、Pinia 和 Mock API 调用。
- [ ] 验证测试、类型和构建并提交。

### Task 4: Admin 应用
- [ ] 先写共享角色与健康状态 Store 测试并运行 RED。
- [ ] 实现 Element Plus、路由元数据、CMS 布局和占位页面。
- [ ] 验证测试、类型和构建并提交。

### Task 5: CI、文档与最终验证
- [ ] 建立 GitHub Actions、README、接口契约文档和 smoke 测试。
- [ ] 运行 lint、typecheck、test、test:e2e、build。
- [ ] 检查密钥、Git diff 和启动探针，修复全部失败。
- [ ] 进行整分支代码审查并提交修复。
