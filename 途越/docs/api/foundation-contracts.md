# 途越第一版基础契约

本文固定六条责任线并行开发使用的第一版 TypeScript 契约、Mock API 和 Mock ID。它只描述工程基线，不代表完整业务规则已经确认。

## 共享契约

`packages/contracts/src/index.ts` 是唯一共享类型入口：

- 公共：`ApiResponse<T>`、`ApiError`、`PaginationQuery`、`PaginatedResponse<T>`、`SortDirection`
- 车型：`CarSummary`、`CarDetail`、`CarImage`、`CarDraftInput`、`CarImageInput`、`CarParameter`、`CarConfigOption`、`EnergyType`、`PublishStatus`、`CAR_LIMITS`、`CAR_IMAGE_TYPES`、`validateCarDraft`、`normalizeCarImages`
- 权限：`AdminRole`、`PermissionCode`、`MockLoginRequest`、`AuthUser`、`AuthResponse`
- AI：`AiChatRequest`、`AiStreamEvent`、`AiRecommendation`
- 对比选配：`CompareItem`、`CompareParameterRow`、`ConfigurationSelection`、`QuoteResult`
- 运营：`ActivityDto`、`DealerDto`、`AnalyticsEvent`、`DashboardMetrics`

角色固定为 `editor`、`reviewer`、`super_admin`。当前仅提供类型与 mock 登录，不实现鉴权守卫。

## 接口列表

| 方法   | 路径                                     | 用途                       |
| ------ | ---------------------------------------- | -------------------------- |
| GET    | `/api/health`                            | 健康检查                   |
| GET    | `/api/v1/cars`                           | 车型列表（**只含已上架**） |
| GET    | `/api/v1/cars/:id`                       | 车型详情（**已下架返回 404**） |
| POST   | `/api/v1/auth/mock-login`                | 固定角色 Mock 登录         |
| GET    | `/api/v1/activities`                     | 活动 Mock 列表             |
| GET    | `/api/v1/dealers`                        | 经销商 Mock 列表           |
| GET    | `/api/v1/admin/cars`                     | 后台车型列表（含已下线、带留痕条数，US-CAR-13） |
| GET    | `/api/v1/admin/cars/search`              | 后台车型分页检索（keyword/status，US-CAR-10） |
| GET    | `/api/v1/admin/cars/:id`                 | 后台车型详情               |
| POST   | `/api/v1/admin/cars`                     | 新增车型                   |
| PUT    | `/api/v1/admin/cars/:id`                 | 编辑车型                   |
| DELETE | `/api/v1/admin/cars/:id`                 | 删除车型                   |
| POST   | `/api/v1/admin/cars/:id/images`          | 多图上传（multipart）      |
| PUT    | `/api/v1/admin/cars/:id/images`          | 保存图片顺序与主图         |
| DELETE | `/api/v1/admin/cars/:id/images/:imageId` | 删除单张图片               |
| GET    | `/static/uploads/*`                      | 已上传图片静态访问         |
| GET    | `/api/docs`                              | Swagger UI                 |
| GET    | `/api/openapi.json`                      | OpenAPI JSON               |

成功响应统一为 `{ success: true, data, requestId }`。失败响应统一为 `{ success: false, error: { code, message, details? }, requestId }`。不存在的车型返回 HTTP 404 和 `CAR_NOT_FOUND`。

### 后台车型接口细则

- 列表查询参数：`keyword`（匹配名称/系列/卖点）、`status`（`PublishStatus`）、`page`（默认 1）、`pageSize`（默认 10，上限 50），返回 `PaginatedResponse<CarSummary>`。
- 新增与编辑使用同一份 `CarDraftInput`；校验规则在 `packages/contracts` 的 `validateCarDraft` 中，前端表单与接口共用，不重复实现。
- 图片上传字段名为 `files`，支持 JPG/PNG/WebP，单张 ≤ 5MB，每个车型最多 9 张，落盘到 `apps/api/storage/uploads`，通过 `/static/uploads/<文件名>` 访问。
- 图片顺序与主图由前端提交完整数组（`PUT /images`）覆盖；服务端保证有且仅有一张 `isCover`，未指定时取第一张；保存 `images` 时同步刷新 `galleryUrls` 与 `thumbnailUrl`。

| 错误码                       | HTTP | 含义                       |
| ---------------------------- | ---- | -------------------------- |
| `CAR_NOT_FOUND`              | 404  | 车型不存在                 |
| `CAR_VALIDATION_FAILED`      | 400  | 字段校验失败，`details` 为字段级错误列表 |
| `CAR_STATUS_INVALID`         | 400  | 发布状态取值无效           |
| `CAR_IMAGE_REQUIRED`         | 400  | 未选择图片                 |
| `CAR_IMAGE_TYPE_UNSUPPORTED` | 400  | 图片格式不支持             |
| `CAR_IMAGE_LIMIT_EXCEEDED`   | 400  | 图片数量超过 9 张          |
| `CAR_IMAGE_NOT_FOUND`        | 404  | 图片不存在                 |
| `CAR_IMAGE_PAYLOAD_INVALID`  | 400  | 图片顺序请求体格式错误     |

## 稳定 Mock ID

- 车型：`ty-suv-001`、`ty-ev-001`、`ty-hybrid-001`、`ty-mpv-001`（均已上架）、`ty-legacy-001`（初始已下线，用于上下架回归）
- 活动：`activity-001`
- 经销商：`dealer-sh-001`、`dealer-bj-001`
- 管理员：`mock-admin-1`、`mock-admin-2`、`mock-admin-3`

Mock 数据集中在 `packages/test-utils/src/index.ts`，页面不得复制一套独立数据。

## 字段约定

- 金额：字段名以 `Cents` 结尾，使用人民币分的整数值。
- 时间：使用带时区的 ISO 8601 字符串。
- 经纬度：`longitude` 与 `latitude` 都是十进制度数值。
- 缺失对比参数：使用 `null`，不能用 `0` 代替。

## 待确认项

- 车型参数固定模板与对比字段清单。
- 配置项互斥、必选和计价规则。
- 管理角色的最终权限码矩阵。
- 地图服务商、坐标系和 Key 管理方式。
- AI 预算、模型、上下文字段和对话留存策略。
- 品牌视觉规范和正式静态资源。

这些字段在确认前应保持可选或通过适配层接入，不把临时假设固化为业务规则。

## 破坏性变更规则

删除字段、改名、改变单位、缩窄枚举或改变响应结构均属于破坏性变更。提交此类改动前必须同时更新共享契约、OpenAPI、相关测试和本文档，并通知所有受影响责任人。新增可选字段通常可向后兼容，但仍需更新文档。

## Sprint 3 增量（2026-11-04 · 周子涵 · US-CAR-13 / US-CMP-01 / US-CMP-02）

本节记录新增能力与它们对已有责任线的影响。**没有删除或改名任何既有字段**，全部为增量。

### 新增接口

| 方法   | 路径                                | 用途                       | 归属      |
| ------ | ----------------------------------- | -------------------------- | --------- |
| GET    | `/api/v1/admin/cars`                | 后台车型列表（含已下线、带留痕条数） | US-CAR-13 |
| GET    | `/api/v1/admin/cars/:id/audit-logs` | 上下架操作留痕（时间倒序） | US-CAR-13 |
| POST   | `/api/v1/admin/cars/:id/status`     | 上架 / 下架                | US-CAR-13 |
| GET    | `/api/v1/compare`                   | 读取对比清单（按 visitorId） | US-CMP-01 |
| POST   | `/api/v1/compare/items`             | 加入对比                   | US-CMP-01 |
| DELETE | `/api/v1/compare/items/:carId`      | 移除对比项                 | US-CMP-01 |
| DELETE | `/api/v1/compare`                   | 清空对比清单               | US-CMP-01 |
| GET    | `/api/v1/compare/matrix`            | 多车参数并集对齐矩阵       | US-CMP-02 |

### 行为变更（非破坏性，但会影响前台页面）

- `GET /api/v1/cars` 现在**强制只返回已上架车型**（原样返回全部 Mock 数据）。
- `GET /api/v1/cars/:id` 对已下线车型返回 404 `CAR_NOT_FOUND`，用于前台走「不存在 / 已下架」占位页。
- 影响：US-CAR-01（前台列表）、US-CAR-02（前台详情）无需自己再判断 `publishStatus`，拿到即可渲染；但不要期望列表里出现下架车型。

### 新增状态码

| code                     | HTTP | 场景                                 |
| ------------------------ | ---- | ------------------------------------ |
| `INVALID_STATUS_ACTION`  | 400  | 上下架动作不是 `publish` / `offline` |
| `CAR_ALREADY_PUBLISHED`  | 409  | 对已上架车型再次上架                 |
| `CAR_NOT_PUBLISHED`      | 409  | 对未上架车型下架；把下架车型加入对比 |
| `COMPARE_LIMIT_EXCEEDED` | 409 / 400 | 超过 4 台对比上限              |
| `CAR_ALREADY_IN_COMPARE` | 409  | 重复加入同一台车                     |
| `CAR_NOT_IN_COMPARE`     | 404  | 移除不在清单里的车型                 |
| `VISITOR_ID_REQUIRED`    | 400  | 对比接口缺少 `visitorId`             |
| `COMPARE_EMPTY`          | 400  | 对比矩阵没有任何车型                 |

### 契约新增（`packages/contracts`）

- 车型：`CarParameterGroup`、`CarParameterGroupLabel`、`CarParameterGroupOrder`、`CarStatusAction`、`CarStatusChangeRequest`、`CarStatusAuditLog`、`CarStatusChangeResponse`、`AdminCarListItem`
- 对比：`COMPARE_MAX_SIZE`、`CompareSelectionItem`、`CompareListResponse`、`CompareAddRequest`、`CompareMatrixColumn`、`CompareParameterGroupDto`、`CompareMatrixResponse`
- `CarParameter` 新增**可选**字段 `group?: CarParameterGroup`（US-CAR-12 负责录入）；未录入时对比模块按 `code` 关键字兜底归类，不会整块落进「其他」。`CompareParameterRow` 同样新增可选 `unit` / `group`。

### 参数与对比的约定

- 参数并集：任何一台车独有的参数都会成行，不做交集。
- 缺失值：一律 `null`，前端渲染「—」；**不允许用 `0` 或空串代替**。
- 分组顺序固定：动力 → 尺寸 → 安全 → 智能 → 其他；组内按首次出现顺序。
- 对比上限 4 台，服务端与前端各自校验；前端 localStore 只是副本，冲突以服务端业务错误为准。

### 操作留痕

每次成功上架/下架写入一条 `CarStatusAuditLog`：`action`、`fromStatus`、`toStatus`、`actor`、`reason`、`occurredAt`。`actor` 目前由后台页面从 `localStorage['tuyue.admin.username']` 取，缺省 `web-admin`；**US-SYS-01 落地后应改为从 Token 解析**。

## Sprint 3 增量（2026-11-05 · 唐轩 · US-CAR-12）

本节只新增能力，没有删除或改名既有字段。

### 新增接口

| 方法 | 路径                                     | 用途                         |
| ---- | ---------------------------------------- | ---------------------------- |
| PUT  | `/api/v1/admin/cars/:id/parameters`      | 整体覆盖保存车型参数（后台） |

请求体：

```json
{
  "parameters": [
    { "code": "power", "label": "最大功率", "value": "185", "unit": "kW", "group": "power" }
  ]
}
```

成功后返回更新后的 `CarDetail`。参数由前端提交完整数组，服务端整体覆盖，不做增量合并。

### 参数规则

- `code` 必填、trim 后不能为空、不区分大小写唯一，最长 40 字符。
- `label` 必填，最长 20 字符；`value` 必填，最长 40 字符；`unit` 可选，最长 12 字符。
- `group` 可选；缺省时服务端补为 `other`。允许值固定为 `power` / `size` / `safety` / `smart` / `other`。
- 每个车型最多 60 条参数。
- 校验函数为 `packages/contracts` 的 `validateCarParameters`，后台表单与接口共用同一份规则。
- 参数模板尚未确认，因此本次不固化字段清单，只保证分组、代码唯一和缺失值约定。

### 新增错误码

| code                    | HTTP | 含义                                   |
| ----------------------- | ---- | -------------------------------------- |
| `CAR_PARAMETER_INVALID` | 400  | 参数校验失败，`details` 为字段级错误列表 |

### 数据同步

后台编辑使用 `CarStore`，前台详情、对比与审核队列使用 `carRepository`。本次新增最小同步桥：

- 后台新增、编辑、删除车型，保存图片和参数后，同步写入 `carRepository`。
- 删除车型时同时移除该车型的状态留痕。
- 不合并两个内存 Store，避免影响已有责任线；后续接入真实数据库时应统一为一个数据源。

### 展示约定

- 后台参数编辑按「动力 → 尺寸 → 安全 → 智能 → 其他」分组展示与保存。
- 前端提交时保持分组顺序与组内顺序；服务端按提交顺序原样保存。
- 对比矩阵继续按 `group` 分组，未分组数据仍由 `code` 关键字兜底归类。
