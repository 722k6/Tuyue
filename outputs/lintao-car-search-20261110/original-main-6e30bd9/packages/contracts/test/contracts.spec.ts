import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ADMIN_ROLE_PERMISSIONS,
  AdminRole,
  CarReviewAction,
  EnergyType,
  PublishStatus,
  type ApiResponse,
  type CarSummary,
} from '../src/index';

describe('shared contracts', () => {
  it('exposes stable enum values used across applications', () => {
    expect(AdminRole).toEqual({
      EDITOR: 'editor',
      REVIEWER: 'reviewer',
      SUPER_ADMIN: 'super_admin',
    });
    expect(Object.values(EnergyType)).toContain('electric');
    expect(PublishStatus.PUBLISHED).toBe('published');
  });

  it('exposes the fixed role permission matrix for content review', () => {
    expect(ADMIN_ROLE_PERMISSIONS.editor).toEqual(['content:edit']);
    expect(ADMIN_ROLE_PERMISSIONS.reviewer).toContain('content:review');
    expect(ADMIN_ROLE_PERMISSIONS.super_admin).toContain('admin:manage');
    expect(CarReviewAction).toEqual({
      SUBMIT: 'submit',
      APPROVE: 'approve',
      REJECT: 'reject',
    });
  });

  it('types a successful car response without any', () => {
    expectTypeOf<ApiResponse<CarSummary[]>>().toMatchTypeOf<{
      success: boolean;
      data: CarSummary[];
      requestId: string;
    }>();
  });
});
