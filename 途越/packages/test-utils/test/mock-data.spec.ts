import { describe, expect, it } from 'vitest';
import { mockAdminUsers, mockCars, mockDealers } from '../src/index';

describe('central mock data', () => {
  it('keeps stable IDs and required coverage', () => {
    expect(mockCars.map((car) => car.id)).toEqual([
      'ty-suv-001',
      'ty-ev-001',
      'ty-hybrid-001',
      'ty-mpv-001',
      'ty-legacy-001',
    ]);
    expect(new Set(mockCars.map((car) => car.energyType)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(mockCars.map((car) => car.bodyStyle))).toEqual(new Set(['suv', 'sedan', 'mpv']));
    expect(mockCars.every((car) => (car.aliases?.length ?? 0) > 0)).toBe(true);
    expect(mockCars.every((car) => (car.popularityScore ?? 0) > 0)).toBe(true);
    expect(mockDealers).toHaveLength(2);
    expect(mockAdminUsers.map((user) => user.role)).toEqual(['editor', 'reviewer', 'super_admin']);
  });
});
