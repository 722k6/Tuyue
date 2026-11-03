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

export interface CarParameter {
  code: string;
  label: string;
  value: string;
  unit?: string;
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
