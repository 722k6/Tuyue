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
| GET    | `/api/v1/cars`                           | 车型 Mock 列表             |
| GET    | `/api/v1/cars/:id`                       | 单个车型 Mock 详情         |
| POST   | `/api/v1/auth/mock-login`                | 固定角色 Mock 登录         |
| GET    | `/api/v1/activities`                     | 活动 Mock 列表             |
| GET    | `/api/v1/dealers`                        | 经销商 Mock 列表           |
| GET    | `/api/v1/admin/cars`                     | 后台车型列表（分页/检索）  |
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

- 车型：`ty-suv-001`、`ty-ev-001`、`ty-hybrid-001`
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
