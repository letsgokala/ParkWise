import { describe, it, expect } from 'vitest';
import {
  assignmentIsOperational,
  canManuallyUpdateAvailability,
  canReviewFacilities,
  canSaveFavorites,
  isFavoriteActive,
  isPubliclyVisible,
  ownerOwnsFacility,
} from '../../src/lib/rbac/policy';

describe('facility visibility rules', () => {
  it('only APPROVED facilities are publicly visible', () => {
    expect(isPubliclyVisible('APPROVED')).toBe(true);
    expect(isPubliclyVisible('PENDING')).toBe(false);
    expect(isPubliclyVisible('REJECTED')).toBe(false);
    expect(isPubliclyVisible('SUSPENDED')).toBe(false);
  });

  it('a favorite is only active while its facility is APPROVED', () => {
    expect(isFavoriteActive('APPROVED')).toBe(true);
    expect(isFavoriteActive('SUSPENDED')).toBe(false);
  });
});

describe('role capabilities', () => {
  it('only registered drivers can save favorites', () => {
    expect(canSaveFavorites('REGISTERED_DRIVER')).toBe(true);
    expect(canSaveFavorites('GUEST_DRIVER')).toBe(false);
    expect(canSaveFavorites('FACILITY_OWNER')).toBe(false);
  });

  it('only the system admin can review facilities', () => {
    expect(canReviewFacilities('SYSTEM_ADMIN')).toBe(true);
    expect(canReviewFacilities('FACILITY_OWNER')).toBe(false);
  });

  it('an owner only owns matching facilities', () => {
    expect(ownerOwnsFacility('owner-1', 'owner-1')).toBe(true);
    expect(ownerOwnsFacility('owner-1', 'owner-2')).toBe(false);
  });
});

describe('parking admin operation rules', () => {
  it('availability is editable only for MANUAL facilities', () => {
    expect(canManuallyUpdateAvailability('MANUAL')).toBe(true);
    expect(canManuallyUpdateAvailability('API_INTEGRATED')).toBe(false);
  });

  it('an assignment is operational only when both assignment and admin are ACTIVE', () => {
    expect(assignmentIsOperational('ACTIVE', 'ACTIVE')).toBe(true);
    expect(assignmentIsOperational('SUSPENDED', 'ACTIVE')).toBe(false);
    expect(assignmentIsOperational('ACTIVE', 'SUSPENDED')).toBe(false);
    expect(assignmentIsOperational('REMOVED', 'ACTIVE')).toBe(false);
  });
});
