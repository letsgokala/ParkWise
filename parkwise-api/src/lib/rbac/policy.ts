/**
 * Centralized, pure authorization & business-rule decisions.
 *
 * These functions encode the §10 business rules and the SRS access-control
 * matrix (Table 3.9). They are deliberately free of Express/Prisma imports so
 * they can be unit-tested in isolation and reused by every service. String
 * literals mirror the Prisma enums exactly.
 */
import type { SubjectRole } from './roles';

export type FacilityStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type FacilityType = 'MANUAL' | 'API_INTEGRATED';
export type AssignmentStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'REMOVED';

// --- Facility visibility (business rules 1 & 2) ----------------------------

/** Only APPROVED facilities are ever exposed to drivers (map/search/rank/nav). */
export function isPubliclyVisible(status: FacilityStatus): boolean {
  return status === 'APPROVED';
}

/** A saved favorite is shown only while its facility remains APPROVED. */
export function isFavoriteActive(status: FacilityStatus): boolean {
  return status === 'APPROVED';
}

// --- Driver capabilities ----------------------------------------------------

/** Business rule 8: only logged-in registered drivers can save favorites. */
export function canSaveFavorites(role: SubjectRole): boolean {
  return role === 'REGISTERED_DRIVER';
}

// --- Facility owner capabilities -------------------------------------------

/** Business rule 3: an owner manages only their own facilities. */
export function ownerOwnsFacility(ownerProfileId: string, facilityOwnerId: string): boolean {
  return ownerProfileId === facilityOwnerId;
}

// --- System admin capabilities ---------------------------------------------

/** Business rule 10: only the System Admin approves/rejects/suspends. */
export function canReviewFacilities(role: SubjectRole): boolean {
  return role === 'SYSTEM_ADMIN';
}

// --- Parking admin operations ----------------------------------------------

/**
 * Business rules 4 & 15: an admin may operate a facility only if their account
 * is ACTIVE and they hold an ACTIVE assignment to that facility.
 */
export function assignmentIsOperational(
  assignmentStatus: AssignmentStatus,
  adminStatus: AccountStatus,
): boolean {
  return assignmentStatus === 'ACTIVE' && adminStatus === 'ACTIVE';
}

/**
 * Business rules 5 & 6: availability may be set manually only for MANUAL
 * facilities. API_INTEGRATED availability comes from the sync service.
 */
export function canManuallyUpdateAvailability(type: FacilityType): boolean {
  return type === 'MANUAL';
}

/** Price can be updated by an assigned admin regardless of facility type. */
export function canUpdatePrice(_type: FacilityType): boolean {
  return true;
}
