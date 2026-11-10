# US-CMP-01 加入对比与对比栏 测试记录 · 唐轩

对应用例：`docs/quality/test-cases/US-CMP-01-加入对比与对比栏.md`
负责人：周子涵　测试人：唐轩　测试日期：2026-11-10
被测版本：main（提交 `8a3360e`）

## 执行环境

- Windows 11，仓库按 pnpm 工作区运行（本机 pnpm 走 corepack）
- 服务：`corepack pnpm --filter @tuyue/api dev`（:3000）、`corepack pnpm --filter @tuyue/web dev`（:5173）
- 访客无需登录；每个 Playwright 用例使用独立浏览器上下文，避免对比清单互相污染
- 测试数据：种子车型 `ty-suv-001`（途越远行）、`ty-ev-001`（途越星驰）、`ty-hybrid-001`

## 自动化执行

```bash
corepack pnpm exec vitest run \
  apps/api/test/compare.spec.ts \
  apps/web/test/compare.store.spec.ts
```

结果：接口与服务端/本地双存逻辑全部通过，覆盖加入、重复加入 409、上限 4 台、下架拦截与自动剔除、移除、访客隔离等场景。

```bash
corepack pnpm exec playwright test --project=web e2e/web/compare.spec.ts
```

结果：7 条浏览器用例全部通过（列表页加入、悬浮栏、刷新保留、4 台上限、对比表对齐、移除回退、移动端横向滚动）。

补充执行（临时脚本，未入库，执行后已删除）：

```bash
corepack pnpm exec playwright test --project=web e2e/web/tmp-compare-detail-验证.spec.ts
```

结果：详情页加入对比 → 跨页面累计「对比 2/4」→ 刷新后保留，链路通过；自动化覆盖见 `e2e/web/compare.spec.ts`（7 条）、`apps/api/test/compare.spec.ts`、`apps/web/test/compare.store.spec.ts`。

## 用例执行结果

| 用例      | 结果 | 依据                                              |
| --------- | ---- | ------------------------------------------------- |
| CMP01-01  | 通过 | 正式 E2E「列表页加入两台车后悬浮对比栏出现」      |
| CMP01-02  | 通过 | 临时浏览器脚本（详情页入口）                      |
| CMP01-03  | 通过 | 临时浏览器脚本（跨页面累计）                      |
| CMP01-04  | 通过 | 正式 E2E「对比栏在刷新后仍然保留」                |
| CMP01-05  | 通过 | 正式 E2E「最多 4 台」+ 接口上限用例               |
| CMP01-06  | 通过 | 前端 store 用例 + 接口 409 用例                   |
| CMP01-07  | 通过 | 正式 E2E「移除一台车」+ store 同步用例            |
| CMP01-08  | 通过 | 正式 E2E「回到补齐提示」                          |
| CMP01-09  | 通过 | store 回滚用例 + 接口已下架拒绝用例               |
| CMP01-10  | 通过 | store 断网用例                                    |
| CMP01-11  | 通过 | store 服务端合并去重用例 + 接口清单用例           |
| CMP01-12  | 通过 | 接口不同访客隔离用例                              |
| CMP01-13  | 通过 | 接口重复加入 409 用例                             |
| CMP01-14  | 通过 | 接口下架车型自动剔除用例                          |

## 缺陷

| 编号         | 关联用例 | 描述                                                       | 严重级 | 状态 |
| ------------ | -------- | ---------------------------------------------------------- | ------ | ---- |
| SUG-CMP01-01 | CMP01-02 | 详情页加入对比仅有临时脚本验证，建议补为正式 E2E 纳入 CI | 低     | 建议 |

## 结论

US-CMP-01 验收要点全部满足，未发现阻塞缺陷，**测试通过**。
