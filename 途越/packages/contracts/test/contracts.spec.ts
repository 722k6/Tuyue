import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  AdminRole,
  EnergyType,
  PublishStatus,
  type ApiResponse,
  type CarSummary,
} from '../src/index';

describe('shared contracts', () => {
  it('exposes stable enum values used across applications', () => {
    expect(AdminRole).toEqual({ EDITOR: 'editor', REVIEWER: 'reviewer', SUPER_ADMIN: 'super_admin' });
    expect(Object.values(EnergyType)).toContain('electric');
    expect(PublishStatus.PUBLISHED).toBe('published');
  });

  it('types a successful car response without any', () => {
    expectTypeOf<ApiResponse<CarSummary[]>>().toMatchTypeOf<{
      success: boolean;
      data: CarSummary[];
      requestId: string;
    }>();
  });
});
