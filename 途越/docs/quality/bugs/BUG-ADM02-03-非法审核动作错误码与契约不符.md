# BUG-ADM02-03 非法审核动作错误码与契约不符

按《开发规范》4.3 提交格式登记。

| 字段     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| BUG 编号 | BUG-ADM02-03                                                         |
| 标题     | [车型管理] 非法审核动作返回 403 FORBIDDEN_ROLE，契约要求 400 INVALID_REVIEW_ACTION |
| 严重级别 | S3 轻微（错误码与接口契约不符；审核状态机未被破坏，仅影响按错误码分支的客户端与用例） |
| 所属模块 | 车型管理（后台 `/v1/admin/cars/:id/review` · US-ADM-02）              |
| 环境     | Windows 11 / Microsoft Edge / `pnpm dev`（api :3000、admin :5174）    |
| 被测版本 | main `ef9fabc`（测试执行时；US-ADM-02 已由 PR #9 合并）               |
| 发现人   | 李昱彤（US-ADM-02 交叉测试）                                          |
| 负责人   | 唐轩（US-ADM-02 开发负责人）                                          |
| 关联用例 | US-ADM-02 TC-13（editor 发送非法动作的错误码）                        |
| 复现概率 | 必现                                                                 |

## 复现步骤

1. 启动 `pnpm dev`
2. 以编辑角色发送 `POST http://localhost:3000/api/v1/admin/cars/ty-suv-001/review`
   - 请求头：`x-admin-role: editor`
   - 请求体：`{ "action": "publish" }`（`publish` 不在合法动作集合 `submit / approve / reject` 内）
3. 对照 `docs/api/foundation-contracts.md`「内容审核发布」约定的错误码
4. 记录实际状态码与错误码

## 预期结果

1. 返回 400 `INVALID_REVIEW_ACTION`——参数校验应优先于权限判断
2. 不执行任何状态迁移

## 实际结果

返回 403 `FORBIDDEN_ROLE`，错误语义为「当前角色无权执行该操作」，把非法动作误判成权限不足。

代码位置：`apps/api/src/car-review.controller.ts` 第 51–55 行先取 `action` 并立即调用 `assertAdminPermission`，未先校验 `action` 是否属于合法动作集合；`assertAdminPermission`（`apps/api/src/admin-access.ts` 第 21–26 行）在角色缺少 `content:review` 权限时抛出 403。

## 影响范围

- 非法动作与权限不足两类错误无法区分，调用方无法据此给出正确提示
- 按契约断言错误码的自动化用例会失败（本用例即因此判为不通过）
- 审核状态机本身未被破坏：请求被拒绝，未发生状态迁移

## 修复建议

在 `assertAdminPermission` 之前先校验 `action` 取值，非法值抛 400 `INVALID_REVIEW_ACTION`；校验顺序固定为「动作合法 → 角色权限 → 状态机前置条件」。

## 复测约定

修复合并后由李昱彤复测 TC-13：`action=publish` 应返回 400 `INVALID_REVIEW_ACTION`。通过后将 `测试用例及跟踪-李昱彤.xlsx` 对应结果改为「通过」并清空 BugID，在本文件回填修复版本与验证结果。
