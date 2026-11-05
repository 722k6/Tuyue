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

export interface CarDetail extends CarSummary {
  galleryUrls: string[];
  description: string;
  parameters: CarParameter[];
  configOptions: CarConfigOption[];
  updatedAt: string;
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

export const AdminRole = {
  EDITOR: 'editor',
  REVIEWER: 'reviewer',
  SUPER_ADMIN: 'super_admin',
} as const;
export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export type PermissionCode = 'content:edit' | 'content:review' | 'content:publish' | 'admin:manage';

export interface MockLoginRequest {
  username: string;
  role?: AdminRole;
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
