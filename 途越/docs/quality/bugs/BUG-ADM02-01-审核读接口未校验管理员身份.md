# BUG-ADM02-01 审核接口未校验管理员身份

按《开发规范》4.3 提交格式登记。

| 字段     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| BUG 编号 | BUG-ADM02-01                                                         |
| 标题     | [车型管理] 审核读接口未校验管理员身份，未带角色头即可读取待审队列与审核意见全文 |
| 严重级别 | S1 严重（越权访问：未携带任何管理员身份即可读取后台审核数据与意见全文） |
| 所属模块 | 车型管理（后台 `/v1/admin/cars` 审核接口 · US-ADM-02）                |
| 环境     | Windows 11 / Microsoft Edge / `pnpm dev`（api :3000、admin :5174）    |
| 被测版本 | main `ef9fabc`（测试执行时；US-ADM-02 已由 PR #9 合并）               |
| 发现人   | 李昱彤（US-ADM-02 交叉测试）                                          |
| 负责人   | 唐轩（US-ADM-02 开发负责人）                                          |
| 关联用例 | US-ADM-02 TC-17（未带角色头不得读取待审队列）、TC-18（未带角色头不得读取审核留痕与意见） |
| 关联缺陷 | 与 Issue #26（后台管理接口未校验 Token）同一根因                      |
| 复现概率 | 必现                                                                 |

## 复现步骤

1. 启动 `pnpm dev`（api :3000、admin :5174）
2. 不携带任何管理员请求头（无 `x-admin-role`、无 `x-admin-user`），发送 `GET http://localhost:3000/api/v1/admin/cars/review/pending`
3. 记录状态码与响应体
4. 改为发送 `GET http://localhost:3000/api/v1/admin/cars/ty-suv-001/review-logs`
5. 检查响应中是否包含审核意见正文

## 预期结果

1. 两个接口均返回 401 / 403 拒绝访问
2. 不返回待审队列数据
3. 不返回审核留痕与意见内容

## 实际结果

两个接口均返回 200，并返回完整数据：待审队列可被列出，审核留痕中的驳回意见全文可被读取。

代码位置：`apps/api/src/car-review.controller.ts` 第 34–37 行 `listPending()` 与第 39–42 行 `listReviewLogs()` 未做任何角色校验，直接返回 `carRepository` 查询结果；同文件第 44–66 行的写接口 `POST :id/review` 才调用 `assertAdminPermission`。读接口与写接口的鉴权不对称。

## 影响范围

- 未授权方可枚举后台待审车型，读取审核留痕与驳回意见全文，属越权数据泄露
- 与 BUG-ADM02-02 叠加后，可进一步伪造操作人写入留痕
- 前端路由守卫只能限制页面访问，无法拦截绕过页面直连接口

## 修复建议

在 `CarReviewController` 层统一加鉴权守卫（或至少为两个读接口补上 `assertAdminPermission`，分别要求 `content:review` 权限），角色从服务端登录态解析，不再信任客户端可伪造的 `x-admin-role` 请求头。与 Issue #26 一并修复可一次覆盖。

## 复测约定

修复合并后由李昱彤复测 TC-17、TC-18，将 `测试用例及跟踪-李昱彤.xlsx`「车型管理」sheet 对应用例结果改为「通过」并清空 BugID，同时在本文件回填修复版本与验证结果。

## 修复记录

| 字段     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| 修复版本 | 分支 `fix/adm02-review-defects`（待评审合并入 main）                  |
| 修复人   | 李昱彤（交叉修复，US-ADM-02 开发负责人唐轩评审）                      |
| 修复文件 | `apps/api/src/car-review.controller.ts`、`apps/api/src/admin-access.ts` |
| 回归用例 | `apps/api/test/car-review.spec.ts`、`e2e/admin/car-review-logs.spec.ts` |

修复内容：`listPending()` 补 `content:review` 权限校验；`listReviewLogs()` 补 `content:edit` / `content:review` 任一权限校验（编辑需要读驳回意见，见 BUG-ADM02-04）；`assertAdminPermission()` 改为只接受 `AdminAuthGuard` 从 JWT 解析出的角色，删除对 `x-admin-role` 请求头的读取。

| 字段     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| 验证结果 | **已修复（2026-11-24，李昱彤自测）**。未登录读待审队列与留痕均返回 401 `AUTH_TOKEN_REQUIRED`；editor 读待审队列返回 403 `FORBIDDEN_ROLE`；editor 读留痕返回 200（为满足 TC-16 展示驳回意见）。`apps/api/test/car-review.spec.ts` 16 passed。 |

复测路径：不登录直接请求 `GET /api/v1/admin/cars/review/pending`，应返回 401；用 editor 账号登录后同请求应返回 403。
