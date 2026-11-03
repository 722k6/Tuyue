import {
  AdminRole,
  EnergyType,
  PublishStatus,
  type ActivityDto,
  type AuthUser,
  type CarDetail,
  type DealerDto,
} from '@tuyue/contracts';

export const mockCars: CarDetail[] = [
  {
    id: 'ty-suv-001',
    name: '途越远行',
    series: '远行系列',
    energyType: EnergyType.GASOLINE,
    tagline: '从容应对每一段旅程',
    thumbnailUrl: '/mock/cars/ty-suv-001.webp',
    priceMinCents: 18_990_000,
    priceMaxCents: 23_990_000,
    publishStatus: PublishStatus.PUBLISHED,
    galleryUrls: ['/mock/cars/ty-suv-001-1.webp', '/mock/cars/ty-suv-001-2.webp'],
    images: [
      { id: 'ty-suv-001-img-1', url: '/mock/cars/ty-suv-001-1.webp', isCover: true },
      { id: 'ty-suv-001-img-2', url: '/mock/cars/ty-suv-001-2.webp', isCover: false },
    ],
    description: '稳定的演示车型数据，供前后端并行联调。',
    parameters: [{ code: 'length', label: '车长', value: '4780', unit: 'mm' }],
    configOptions: [],
    updatedAt: '2026-10-27T00:00:00.000Z',
  },
  {
    id: 'ty-ev-001',
    name: '途越星驰',
    series: '星驰系列',
    energyType: EnergyType.ELECTRIC,
    tagline: '安静而高效的城市出行',
    thumbnailUrl: '/mock/cars/ty-ev-001.webp',
    priceMinCents: 21_990_000,
    priceMaxCents: 27_990_000,
    publishStatus: PublishStatus.PUBLISHED,
    galleryUrls: ['/mock/cars/ty-ev-001-1.webp', '/mock/cars/ty-ev-001-2.webp'],
    images: [
      { id: 'ty-ev-001-img-1', url: '/mock/cars/ty-ev-001-1.webp', isCover: true },
      { id: 'ty-ev-001-img-2', url: '/mock/cars/ty-ev-001-2.webp', isCover: false },
    ],
    description: '纯电演示车型。',
    parameters: [{ code: 'range', label: 'CLTC 续航', value: '620', unit: 'km' }],
    configOptions: [],
    updatedAt: '2026-10-27T00:00:00.000Z',
  },
  {
    id: 'ty-hybrid-001',
    name: '途越云境',
    series: '云境系列',
    energyType: EnergyType.HYBRID,
    tagline: '兼顾效率与远途续航',
    thumbnailUrl: '/mock/cars/ty-hybrid-001.webp',
    priceMinCents: 25_990_000,
    priceMaxCents: 31_990_000,
    publishStatus: PublishStatus.PUBLISHED,
    galleryUrls: ['/mock/cars/ty-hybrid-001-1.webp'],
    images: [{ id: 'ty-hybrid-001-img-1', url: '/mock/cars/ty-hybrid-001-1.webp', isCover: true }],
    description: '混动演示车型。',
    parameters: [{ code: 'combinedRange', label: '综合续航', value: '1200', unit: 'km' }],
    configOptions: [],
    updatedAt: '2026-10-27T00:00:00.000Z',
  },
];

export const mockActivities: ActivityDto[] = [
  {
    id: 'activity-001',
    name: '秋日探索季',
    coverImageUrl: '/mock/activities/activity-001.webp',
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-11-30T23:59:59.000Z',
    summary: '用于联调的固定活动数据。',
    published: true,
  },
];

export const mockDealers: DealerDto[] = [
  {
    id: 'dealer-sh-001',
    name: '途越上海体验中心',
    address: '上海市示例路 100 号',
    longitude: 121.4737,
    latitude: 31.2304,
    phone: '400-000-0001',
    businessHours: '09:00-18:00',
  },
  {
    id: 'dealer-bj-001',
    name: '途越北京体验中心',
    address: '北京市示例路 200 号',
    longitude: 116.4074,
    latitude: 39.9042,
    phone: '400-000-0002',
    businessHours: '09:00-18:00',
  },
];

const rolePermissions: Record<AdminRole, AuthUser['permissions']> = {
  editor: ['content:edit'],
  reviewer: ['content:review', 'content:publish'],
  super_admin: ['content:edit', 'content:review', 'content:publish', 'admin:manage'],
};

export const mockAdminUsers: AuthUser[] = Object.values(AdminRole).map((role, index) => ({
  id: `mock-admin-${index + 1}`,
  username: `mock_${role}`,
  displayName: `Mock ${role}`,
  role,
  permissions: rolePermissions[role],
}));

export function findMockAdmin(role: AdminRole): AuthUser {
  return mockAdminUsers.find((user) => user.role === role) ?? mockAdminUsers[0]!;
}
