# BUG-ADM02-02 审核操作人可被请求体伪造

按《开发规范》4.3 提交格式登记。

| 字段     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| BUG 编号 | BUG-ADM02-02                                                         |
| 标题     | [车型管理] 审核操作人取自请求体，可冒充他人写入审核留痕               |
| 严重级别 | S1 严重（审计留痕可被伪造，审核记录失去追责价值）                    |
| 所属模块 | 车型管理（后台 `/v1/admin/cars/:id/review` · US-ADM-02）              |
| 环境     | Windows 11 / Microsoft Edge / `pnpm dev`（api :3000、admin :5174）    |
| 被测版本 | main `ef9fabc`（测试执行时；US-ADM-02 已由 PR #9 合并）               |
| 发现人   | 李昱彤（US-ADM-02 交叉测试）                                          |
| 负责人   | 唐轩（US-ADM-02 开发负责人）                                          |
| 关联用例 | US-ADM-02 TC-19（操作人以服务端登录态为准）                          |
| 复现概率 | 必现                                                                 |

## 复现步骤

1. 启动 `pnpm dev`
2. 以编辑身份发送 `POST http://localhost:3000/api/v1/admin/cars/ty-suv-001/review`
   - 请求头：`x-admin-role: editor`、`x-admin-user: %E5%BC%A0%E4%B8%89`（张三）
   - 请求体：`{ "action": "submit", "actor": "李四" }`
3. 发送 `GET http://localhost:3000/api/v1/admin/cars/ty-suv-001/review-logs`
4. 对照留痕中该条记录的操作人

## 预期结果

1. 留痕操作人为真实编辑（服务端登录态，即请求头解码后的「张三」）
2. 请求体不能覆盖操作人

## 实际结果

留痕操作人显示为请求体传入的「李四」，请求体优先级高于服务端身份。

代码位置：`apps/api/src/car-review.controller.ts` 第 57 行 `const actor = body?.actor?.trim() || decodeHeaderUser(username);`——`body.actor` 在前，只有其为空时才回退到请求头身份。

## 影响范围

- 审核与提交动作可被记到他人名下，审核留痕不再可作为追责依据
- 与 BUG-ADM02-01 叠加时，未授权方也能以任意姓名写入留痕
- 同源问题：US-SYS-01/US-SYS-02 的登录态尚未接入，当前身份完全由客户端请求头与请求体决定

## 修复建议

删除请求体 `actor` 分支，操作人只从服务端登录态解析（当前阶段退化为仅取 `x-admin-user` 解码值）；同步从 `CarReviewRequest` 契约中移除 `actor` 字段，避免调用方继续依赖该入口。

## 复测约定

修复合并后由李昱彤复测 TC-19：请求体传 `actor` 时应被忽略，留痕操作人与服务端身份一致。通过后将 `测试用例及跟踪-李昱彤.xlsx` 对应结果改为「通过」，并在本文件回填修复版本与验证结果。
