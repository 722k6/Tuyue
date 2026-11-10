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

export interface CarDetail extends CarSummary {
  galleryUrls: string[];
  description: string;
  parameters: CarParameter[];
  configOptions: CarConfigOption[];
  updatedAt: string;
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
