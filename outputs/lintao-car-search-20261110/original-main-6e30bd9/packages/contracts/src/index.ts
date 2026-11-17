export const SortDirection = { ASC: 'asc', DESC: 'desc' } as const;
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

export interface ApiResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  requestId: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const EnergyType = {
  GASOLINE: 'gasoline',
  HYBRID: 'hybrid',
  ELECTRIC: 'electric',
} as const;
export type EnergyType = (typeof EnergyType)[keyof typeof EnergyType];

export const PublishStatus = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  OFFLINE: 'offline',
} as const;
export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus];

/**
 * 参数分组（US-CAR-12 维护分组，US-CMP-02 按分组对齐渲染）。
 * `group` 在 CarParameter 上是可选字段：未分组的历史数据由对比模块按 code 兜底归类，
 * 因此本字段属于向后兼容的新增项。
 */
export const CarParameterGroup = {
  POWER: 'power',
  SIZE: 'size',
  SAFETY: 'safety',
  SMART: 'smart',
  OTHER: 'other',
} as const;
export type CarParameterGroup = (typeof CarParameterGroup)[keyof typeof CarParameterGroup];

export const CarParameterGroupLabel: Record<CarParameterGroup, string> = {
  power: '动力',
  size: '尺寸',
  safety: '安全',
  smart: '智能',
  other: '其他',
};

/** 对比表的固定分组顺序，避免不同车企参数顺序不一致。 */
export const CarParameterGroupOrder: CarParameterGroup[] = [
  CarParameterGroup.POWER,
  CarParameterGroup.SIZE,
  CarParameterGroup.SAFETY,
  CarParameterGroup.SMART,
  CarParameterGroup.OTHER,
];

export interface CarParameter {
  code: string;
  label: string;
  value: string;
  unit?: string;
  group?: CarParameterGroup;
}

export interface CarConfigOption {
  id: string;
  type: 'color' | 'interior' | 'package';
  name: string;
  priceCents: number;
  previewImageUrl?: string;
}

export interface CarSummary {
  id: string;
  name: string;
  series: string;
  energyType: EnergyType;
  tagline: string;
  thumbnailUrl: string;
  priceMinCents: number;
  priceMaxCents: number;
  publishStatus: PublishStatus;
}

export interface CarImage {
  id: string;
  url: string;
  isCover: boolean;
}

export interface CarDetail extends CarSummary {
  galleryUrls: string[];
  images: CarImage[];
  description: string;
  parameters: CarParameter[];
  configOptions: CarConfigOption[];
  updatedAt: string;
}

export const CAR_LIMITS = {
  name: { min: 2, max: 20 },
  series: { min: 2, max: 20 },
  tagline: { min: 4, max: 30 },
  description: { min: 10, max: 500 },
  priceCents: { min: 0, max: 100_000_000 },
  images: { max: 9 },
  imageBytes: 5 * 1024 * 1024,
} as const;

export const CAR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface CarDraftInput {
  name: string;
  series: string;
  energyType: EnergyType;
  tagline: string;
  description: string;
  priceMinCents: number;
  priceMaxCents: number;
  publishStatus: PublishStatus;
}

export interface CarImageInput {
  id?: string;
  url: string;
  isCover: boolean;
}

export interface CarFieldError {
  field: string;
  message: string;
}

function checkText(
  field: string,
  label: string,
  value: string,
  limit: { min: number; max: number },
): CarFieldError[] {
  const text = value.trim();
  if (!text) return [{ field, message: `${label}不能为空` }];
  if (text.length < limit.min || text.length > limit.max) {
    return [{ field, message: `${label}长度需为 ${limit.min}-${limit.max} 个字符` }];
  }
  return [];
}

export function validateCarDraft(input: CarDraftInput): CarFieldError[] {
  const errors: CarFieldError[] = [
    ...checkText('name', '车型名称', input.name, CAR_LIMITS.name),
    ...checkText('series', '所属系列', input.series, CAR_LIMITS.series),
    ...checkText('tagline', '一句话卖点', input.tagline, CAR_LIMITS.tagline),
    ...checkText('description', '车型描述', input.description, CAR_LIMITS.description),
  ];

  if (!Object.values(EnergyType).includes(input.energyType)) {
    errors.push({ field: 'energyType', message: '请选择有效的能源类型' });
  }
  if (!Object.values(PublishStatus).includes(input.publishStatus)) {
    errors.push({ field: 'publishStatus', message: '请选择有效的发布状态' });
  }

  const { min, max } = CAR_LIMITS.priceCents;
  const checkPrice = (field: string, label: string, value: number): void => {
    if (!Number.isInteger(value) || value < min || value > max) {
      errors.push({ field, message: `${label}需为 ${min / 100}-${max / 100} 万元之间的整数分` });
    }
  };
  checkPrice('priceMinCents', '最低价', input.priceMinCents);
  checkPrice('priceMaxCents', '最高价', input.priceMaxCents);
  if (input.priceMaxCents < input.priceMinCents) {
    errors.push({ field: 'priceMaxCents', message: '最高价不能低于最低价' });
  }
  return errors;
}

/* ------------------------------------------------------------------ *
 * US-CAR-12 车型参数管理
 * ------------------------------------------------------------------ */

export const CAR_PARAMETER_LIMITS = {
  max: 60,
  code: { min: 1, max: 40 },
  label: { min: 1, max: 20 },
  value: { min: 1, max: 40 },
  unit: { max: 12 },
} as const;

export interface CarParametersUpdateRequest {
  parameters: CarParameter[];
}

/**
 * 参数由后台整体覆盖保存。这里返回字段级错误，前端按 `parameters[i].field`
 * 定位到具体行，避免只提示「保存失败」却不知道是哪一条参数有问题。
 */
export function validateCarParameters(parameters: CarParameter[]): CarFieldError[] {
  const errors: CarFieldError[] = [];
  if (parameters.length > CAR_PARAMETER_LIMITS.max) {
    errors.push({
      field: 'parameters',
      message: `每个车型最多维护 ${CAR_PARAMETER_LIMITS.max} 条参数`,
    });
  }

  const seen = new Map<string, number>();
  parameters.forEach((parameter, index) => {
    const item = parameter as CarParameter | null;
    const prefix = `parameters[${index}]`;
    const code = item?.code?.trim() ?? '';
    const label = item?.label?.trim() ?? '';
    const value = item?.value?.trim() ?? '';
    const unit = item?.unit?.trim() ?? '';

    if (!code) {
      errors.push({ field: `${prefix}.code`, message: '参数代码不能为空' });
    } else if (code.length > CAR_PARAMETER_LIMITS.code.max) {
      errors.push({
        field: `${prefix}.code`,
        message: `参数代码不能超过 ${CAR_PARAMETER_LIMITS.code.max} 个字符`,
      });
    } else {
      const key = code.toLowerCase();
      const firstIndex = seen.get(key);
      if (firstIndex === undefined) {
        seen.set(key, index);
      } else {
        errors.push({
          field: `${prefix}.code`,
          message: `参数代码与第 ${firstIndex + 1} 条重复`,
        });
      }
    }

    if (!label) {
      errors.push({ field: `${prefix}.label`, message: '参数名称不能为空' });
    } else if (label.length > CAR_PARAMETER_LIMITS.label.max) {
      errors.push({
        field: `${prefix}.label`,
        message: `参数名称不能超过 ${CAR_PARAMETER_LIMITS.label.max} 个字符`,
      });
    }

    if (!value) {
      errors.push({ field: `${prefix}.value`, message: '参数值不能为空' });
    } else if (value.length > CAR_PARAMETER_LIMITS.value.max) {
      errors.push({
        field: `${prefix}.value`,
        message: `参数值不能超过 ${CAR_PARAMETER_LIMITS.value.max} 个字符`,
      });
    }

    if (unit.length > CAR_PARAMETER_LIMITS.unit.max) {
      errors.push({
        field: `${prefix}.unit`,
        message: `单位不能超过 ${CAR_PARAMETER_LIMITS.unit.max} 个字符`,
      });
    }

    if (
      item?.group !== undefined &&
      !Object.values(CarParameterGroup).includes(item.group)
    ) {
      errors.push({ field: `${prefix}.group`, message: '请选择有效的参数分组' });
    }
  });

  return errors;
}

export function normalizeCarImages(images: CarImageInput[]): CarImage[] {
  const seen = new Set<string>();
  const picked = images
    .filter((image) => {
      const url = image.url.trim();
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .slice(0, CAR_LIMITS.images.max);
  const coverIndex = Math.max(
    0,
    picked.findIndex((image) => image.isCover),
  );
  return picked.map((image, index) => ({
    id: image.id ?? `img-${index + 1}`,
    url: image.url.trim(),
    isCover: index === coverIndex,
  }));
}

/* ------------------------------------------------------------------ *
 * US-CAR-13 车型上下架
 * ------------------------------------------------------------------ */

export const CarStatusAction = {
  PUBLISH: 'publish',
  OFFLINE: 'offline',
} as const;
export type CarStatusAction = (typeof CarStatusAction)[keyof typeof CarStatusAction];

export interface CarStatusChangeRequest {
  action: CarStatusAction;
  /** 操作人标识；缺省时由服务端记为 system。US-SYS-01 接入真实登录后可换成 Token 中的用户名。 */
  actor?: string;
  /** 下架原因，写入操作留痕，便于排查「为什么官网看不到这台车」。 */
  reason?: string;
}

export interface CarStatusAuditLog {
  id: string;
  carId: string;
  carName: string;
  action: CarStatusAction;
  fromStatus: PublishStatus;
  toStatus: PublishStatus;
  actor: string;
  reason: string | null;
  occurredAt: string;
}

/** 后台车型条目：比前台 CarSummary 多出留痕条数与更新时间。 */
export interface AdminCarListItem extends CarSummary {
  updatedAt: string;
  auditLogCount: number;
}

export interface CarStatusChangeResponse {
  car: AdminCarListItem;
  log: CarStatusAuditLog;
}

/* ------------------------------------------------------------------ *
 * US-ADM-02 内容审核发布
 * ------------------------------------------------------------------ */

export const CarReviewAction = {
  SUBMIT: 'submit',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;
export type CarReviewAction = (typeof CarReviewAction)[keyof typeof CarReviewAction];

export interface CarReviewRequest {
  action: CarReviewAction;
  /** 驳回时必填；通过和提交时可选。 */
  comment?: string;
  /** 操作人标识；缺省时优先取请求头 x-admin-user，再缺省为 system。 */
  actor?: string;
}

export interface CarReviewLog {
  id: string;
  carId: string;
  carName: string;
  action: CarReviewAction;
  fromStatus: PublishStatus;
  toStatus: PublishStatus;
  actor: string;
  comment: string | null;
  occurredAt: string;
}

export interface CarReviewResponse {
  car: AdminCarListItem;
  log: CarReviewLog;
}

export const AdminRole = {
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  SUPER_ADMIN: 'super_admin',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export type PermissionCode = 'content:edit' | 'content:review' | 'content:publish' | 'admin:manage';

/** 固定三角色的权限矩阵；US-SYS-01 接入真实鉴权后应由服务端 Token 解析复用。 */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, PermissionCode[]> = {
  editor: ['content:edit'],
  reviewer: ['content:review', 'content:publish'],
  super_admin: ['content:edit', 'content:review', 'content:publish', 'admin:manage'],
};

export interface MockLoginRequest {
  username: string;
  role?: AdminRole;
}
export interface LoginRequest {
  username: string;
  password: string;
}
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  permissions: PermissionCode[];
}
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  expiresAt: string;
}

export interface AiChatRequest {
  message: string;
  conversationId?: string;
}
export type AiStreamEvent =
  | { type: 'message'; content: string }
  | { type: 'recommendation'; recommendation: AiRecommendation }
  | { type: 'done' }
  | { type: 'error'; code: string; message: string };
export interface AiRecommendation {
  carIds: string[];
  reasons: string[];
  matchedConditions: string[];
  missingConditions: string[];
}

export interface CompareItem {
  carId: string;
  addedAt: string;
}
export interface CompareParameterRow {
  code: string;
  label: string;
  valuesByCarId: Record<string, string | null>;
  different: boolean;
  unit?: string;
  group?: CarParameterGroup;
}

/* ------------------------------------------------------------------ *
 * US-CMP-01 加入对比与对比栏 / US-CMP-02 对比表对齐渲染
 * ------------------------------------------------------------------ */

/** 对比上限：最多 4 台（PRD F-04 与用户故事验收要点）。 */
export const COMPARE_MAX_SIZE = 4;

/** 服务端保存的对比项，附带车型摘要，前端对比栏可直接渲染而无需二次请求。 */
export interface CompareSelectionItem extends CompareItem {
  car: CarSummary;
}

export interface CompareListResponse {
  visitorId: string;
  maxSize: number;
  items: CompareSelectionItem[];
}

export interface CompareAddRequest {
  carId: string;
}

export interface CompareMatrixColumn {
  carId: string;
  name: string;
  series: string;
  energyType: EnergyType;
  thumbnailUrl: string;
  priceMinCents: number;
  priceMaxCents: number;
}

export interface CompareParameterGroupDto {
  group: CarParameterGroup;
  label: string;
  rows: CompareParameterRow[];
}

export interface CompareMatrixResponse {
  carIds: string[];
  columns: CompareMatrixColumn[];
  groups: CompareParameterGroupDto[];
  /** 并集参数总行数（含全部车型都没有值的空分组已剔除后的行数）。 */
  totalRows: number;
  /** 存在差异的行数，用于「差异高亮」与移动端默认只看差异。 */
  differentRows: number;
  /** 缺失单元格数量，即被渲染成占位符的格子个数。 */
  missingCells: number;
}

export interface ConfigurationSelection {
  carId: string;
  optionIds: string[];
}
export interface QuoteResult {
  carId: string;
  basePriceCents: number;
  optionsPriceCents: number;
  totalPriceCents: number;
  currency: 'CNY';
}

export interface ActivityDto {
  id: string;
  name: string;
  coverImageUrl: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  published: boolean;
}
export interface DealerDto {
  id: string;
  name: string;
  address: string;
  longitude: number;
  latitude: number;
  phone: string;
  businessHours: string;
}
export interface AnalyticsEvent {
  id: string;
  name: string;
  occurredAt: string;
  properties: Record<string, string | number | boolean | null>;
}
export interface DashboardMetrics {
  periodStart: string;
  periodEnd: string;
  totalVisits: number;
  aiUsageCount: number;
  comparisonCount: number;
  activityImpressions: number;
  popularCars: Array<{ carId: string; views: number }>;
}
