/**
 * ParkWise seed data.
 *
 * Idempotent: core entities use deterministic UUIDs + upserts, and derived
 * rows (assignments, favorites, availability logs) are re-created within a
 * scope limited to the seeded facilities/drivers. Safe to run repeatedly and
 * is invoked automatically by `prisma migrate reset`.
 *
 * Creates: 1 system admin, 2 facility owners, 4 facilities (2 APPROVED incl.
 * 1 API_INTEGRATED, 1 PENDING, 1 SUSPENDED), 2 registered drivers, 2 parking
 * admins, assignments (with one historical REMOVED record), favorites
 * (including a suspended-facility favorite to prove visibility filtering), and
 * availability logs.
 */
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env';
import { encryptSecret, hashPassword } from '../src/lib/crypto';

const prisma = new PrismaClient();

// Stable UUIDs so re-seeding updates rather than duplicates.
const ID = {
  sysAdminUser: '00000000-0000-4000-8000-000000000001',
  owner1User: '00000000-0000-4000-8000-000000000002',
  owner2User: '00000000-0000-4000-8000-000000000003',
  admin1User: '00000000-0000-4000-8000-000000000004',
  admin2User: '00000000-0000-4000-8000-000000000005',
  driver1User: '00000000-0000-4000-8000-000000000006',
  driver2User: '00000000-0000-4000-8000-000000000007',
  facilityBole: '00000000-0000-4000-8000-000000000101',
  facilityMexico: '00000000-0000-4000-8000-000000000102',
  facilityPiazza: '00000000-0000-4000-8000-000000000103',
  facilityMegenagna: '00000000-0000-4000-8000-000000000104',
} as const;

async function main() {
  console.log('🌱 Seeding ParkWise...');

  const [sysAdminHash, ownerHash, adminHash, driverHash] = await Promise.all([
    hashPassword(env.systemAdmin.password),
    hashPassword('Owner123!'),
    hashPassword('Admin123!'),
    hashPassword('Driver123!'),
  ]);

  // --- System administrator ------------------------------------------------
  const sysAdminUser = await prisma.user.upsert({
    where: { email: env.systemAdmin.email },
    update: { name: env.systemAdmin.name, role: 'SYSTEM_ADMIN' },
    create: {
      id: ID.sysAdminUser,
      email: env.systemAdmin.email,
      name: env.systemAdmin.name,
      passwordHash: sysAdminHash,
      role: 'SYSTEM_ADMIN',
      phoneNumber: '+251911000001',
    },
  });
  const sysAdminProfile = await prisma.systemAdminProfile.upsert({
    where: { userId: sysAdminUser.id },
    update: {},
    create: { userId: sysAdminUser.id },
  });

  // --- Facility owners -----------------------------------------------------
  const owner1User = await prisma.user.upsert({
    where: { email: 'owner1@parkwise.local' },
    update: {},
    create: {
      id: ID.owner1User,
      email: 'owner1@parkwise.local',
      name: 'Selam Bekele',
      passwordHash: ownerHash,
      role: 'FACILITY_OWNER',
      phoneNumber: '+251911000002',
    },
  });
  const owner1 = await prisma.facilityOwnerProfile.upsert({
    where: { userId: owner1User.id },
    update: { organizationName: 'Bole Parking Authority' },
    create: { userId: owner1User.id, organizationName: 'Bole Parking Authority' },
  });

  const owner2User = await prisma.user.upsert({
    where: { email: 'owner2@parkwise.local' },
    update: {},
    create: {
      id: ID.owner2User,
      email: 'owner2@parkwise.local',
      name: 'Dawit Tadesse',
      passwordHash: ownerHash,
      role: 'FACILITY_OWNER',
      phoneNumber: '+251911000003',
    },
  });
  const owner2 = await prisma.facilityOwnerProfile.upsert({
    where: { userId: owner2User.id },
    update: { organizationName: 'Addis Smart Parking PLC' },
    create: { userId: owner2User.id, organizationName: 'Addis Smart Parking PLC' },
  });

  // --- Parking admins (created by owner1) ----------------------------------
  const admin1User = await prisma.user.upsert({
    where: { email: 'admin1@parkwise.local' },
    update: {},
    create: {
      id: ID.admin1User,
      email: 'admin1@parkwise.local',
      name: 'Hanna Girma',
      passwordHash: adminHash,
      role: 'PARKING_ADMIN',
      phoneNumber: '+251911000004',
    },
  });
  const admin1 = await prisma.parkingAdminProfile.upsert({
    where: { userId: admin1User.id },
    update: { adminStatus: 'ACTIVE', createdByOwnerId: owner1.id },
    create: { userId: admin1User.id, adminStatus: 'ACTIVE', createdByOwnerId: owner1.id },
  });

  const admin2User = await prisma.user.upsert({
    where: { email: 'admin2@parkwise.local' },
    update: {},
    create: {
      id: ID.admin2User,
      email: 'admin2@parkwise.local',
      name: 'Yonas Alemu',
      passwordHash: adminHash,
      role: 'PARKING_ADMIN',
      phoneNumber: '+251911000005',
    },
  });
  const admin2 = await prisma.parkingAdminProfile.upsert({
    where: { userId: admin2User.id },
    update: { adminStatus: 'ACTIVE', createdByOwnerId: owner1.id },
    create: { userId: admin2User.id, adminStatus: 'ACTIVE', createdByOwnerId: owner1.id },
  });

  // --- Registered drivers --------------------------------------------------
  const driver1User = await prisma.user.upsert({
    where: { email: 'driver1@parkwise.local' },
    update: {},
    create: {
      id: ID.driver1User,
      email: 'driver1@parkwise.local',
      name: 'Meron Tesfaye',
      passwordHash: driverHash,
      role: 'REGISTERED_DRIVER',
      phoneNumber: '+251911000006',
    },
  });
  const driver1 = await prisma.driverProfile.upsert({
    where: { userId: driver1User.id },
    update: { currentLat: 8.9939, currentLng: 38.7878 },
    create: { userId: driver1User.id, currentLat: 8.9939, currentLng: 38.7878 },
  });

  const driver2User = await prisma.user.upsert({
    where: { email: 'driver2@parkwise.local' },
    update: {},
    create: {
      id: ID.driver2User,
      email: 'driver2@parkwise.local',
      name: 'Kebede Worku',
      passwordHash: driverHash,
      role: 'REGISTERED_DRIVER',
      phoneNumber: '+251911000007',
    },
  });
  const driver2 = await prisma.driverProfile.upsert({
    where: { userId: driver2User.id },
    update: {},
    create: { userId: driver2User.id, currentLat: 9.0105, currentLng: 38.7445 },
  });

  // --- Facilities ----------------------------------------------------------
  const facilityBole = await prisma.parkingFacility.upsert({
    where: { id: ID.facilityBole },
    update: {},
    create: {
      id: ID.facilityBole,
      ownerId: owner1.id,
      name: 'Bole Medhanialem Parking',
      address: 'Bole Road, near Medhanialem Mall, Addis Ababa',
      latitude: 8.9948,
      longitude: 38.7885,
      totalSpaces: 150,
      availableSpaces: 45,
      facilityType: 'MANUAL',
      hourlyPrice: 30,
      congestionLevel: 'HIGH',
      status: 'APPROVED',
      approvedBySystemAdminId: sysAdminProfile.id,
      approvedAt: new Date('2026-01-10T08:00:00Z'),
      lastAvailabilityUpdateAt: new Date('2026-01-10T08:00:00Z'),
    },
  });

  const facilityMexico = await prisma.parkingFacility.upsert({
    where: { id: ID.facilityMexico },
    update: {},
    create: {
      id: ID.facilityMexico,
      ownerId: owner1.id,
      name: 'Mexico Square Smart Garage',
      address: 'Lideta, near Mexico Square, Addis Ababa',
      latitude: 9.0105,
      longitude: 38.7445,
      totalSpaces: 200,
      availableSpaces: 85,
      facilityType: 'API_INTEGRATED',
      hourlyPrice: 25,
      congestionLevel: 'MEDIUM',
      status: 'APPROVED',
      approvedBySystemAdminId: sysAdminProfile.id,
      approvedAt: new Date('2026-01-11T09:30:00Z'),
      lastAvailabilityUpdateAt: new Date('2026-01-11T09:30:00Z'),
    },
  });

  const facilityPiazza = await prisma.parkingFacility.upsert({
    where: { id: ID.facilityPiazza },
    update: {},
    create: {
      id: ID.facilityPiazza,
      ownerId: owner2.id,
      name: 'Piazza Central Lot',
      address: 'Arada, near Piazza, Addis Ababa',
      latitude: 9.0358,
      longitude: 38.7524,
      totalSpaces: 80,
      availableSpaces: 12,
      facilityType: 'MANUAL',
      hourlyPrice: 40,
      congestionLevel: 'MEDIUM',
      status: 'PENDING',
    },
  });

  const facilityMegenagna = await prisma.parkingFacility.upsert({
    where: { id: ID.facilityMegenagna },
    update: {},
    create: {
      id: ID.facilityMegenagna,
      ownerId: owner2.id,
      name: 'Megenagna Hub Parking',
      address: 'Yeka, near Megenagna roundabout, Addis Ababa',
      latitude: 9.0195,
      longitude: 38.8015,
      totalSpaces: 120,
      availableSpaces: 0,
      facilityType: 'MANUAL',
      hourlyPrice: 35,
      congestionLevel: 'HIGH',
      status: 'SUSPENDED',
      suspendedAt: new Date('2026-02-01T12:00:00Z'),
      approvalNotes: 'Suspended pending re-inspection of capacity declarations.',
    },
  });

  // --- API integration for the smart garage --------------------------------
  await prisma.apiIntegration.upsert({
    where: { facilityId: facilityMexico.id },
    update: {},
    create: {
      facilityId: facilityMexico.id,
      endpointUrl: `${env.apiUrl}/api/mock-external-parking/${facilityMexico.id}/availability`,
      authToken: encryptSecret('mock-secret-token-mexico'),
      refreshIntervalSeconds: 120,
      isEnabled: true,
      lastSyncStatus: 'NEVER',
    },
  });

  // --- Assignments (re-created idempotently) -------------------------------
  const seededFacilityIds = [
    facilityBole.id,
    facilityMexico.id,
    facilityPiazza.id,
    facilityMegenagna.id,
  ];
  await prisma.parkingAdminAssignment.deleteMany({ where: { facilityId: { in: seededFacilityIds } } });

  // admin1 actively runs the Bole (MANUAL) facility.
  await prisma.parkingAdminAssignment.create({
    data: {
      parkingAdminId: admin1.id,
      facilityId: facilityBole.id,
      status: 'ACTIVE',
      createdByOwnerId: owner1.id,
      notes: 'Primary on-site administrator.',
    },
  });
  // admin2 actively runs the Mexico (API_INTEGRATED) facility — price only.
  await prisma.parkingAdminAssignment.create({
    data: {
      parkingAdminId: admin2.id,
      facilityId: facilityMexico.id,
      status: 'ACTIVE',
      createdByOwnerId: owner1.id,
      notes: 'Manages pricing for the smart garage.',
    },
  });
  // Historical record: admin2 previously ran Bole, then was removed/replaced.
  await prisma.parkingAdminAssignment.create({
    data: {
      parkingAdminId: admin2.id,
      facilityId: facilityBole.id,
      status: 'REMOVED',
      assignedAt: new Date('2025-12-01T08:00:00Z'),
      removedAt: new Date('2026-01-05T08:00:00Z'),
      createdByOwnerId: owner1.id,
      notes: 'Replaced by Hanna Girma.',
    },
  });

  // --- Favorites -----------------------------------------------------------
  const seededDriverIds = [driver1.id, driver2.id];
  await prisma.favoriteParkingFacility.deleteMany({ where: { driverId: { in: seededDriverIds } } });
  await prisma.favoriteParkingFacility.createMany({
    data: [
      // Approved → visible in active favorites.
      { driverId: driver1.id, facilityId: facilityBole.id, lastSeenAvailableSpaces: 45, lastSeenHourlyPrice: 30 },
      // Suspended → record exists but hidden from active favorites.
      { driverId: driver1.id, facilityId: facilityMegenagna.id },
      { driverId: driver2.id, facilityId: facilityMexico.id, lastSeenAvailableSpaces: 85, lastSeenHourlyPrice: 25 },
    ],
  });

  // --- Availability logs ---------------------------------------------------
  await prisma.availabilityLog.deleteMany({ where: { facilityId: { in: seededFacilityIds } } });
  await prisma.availabilityLog.createMany({
    data: [
      { facilityId: facilityBole.id, oldAvailableSpaces: 0, newAvailableSpaces: 45, source: 'SEED' },
      { facilityId: facilityMexico.id, oldAvailableSpaces: 0, newAvailableSpaces: 85, source: 'SEED' },
      { facilityId: facilityPiazza.id, oldAvailableSpaces: 0, newAvailableSpaces: 12, source: 'SEED' },
      { facilityId: facilityMegenagna.id, oldAvailableSpaces: 0, newAvailableSpaces: 0, source: 'SEED' },
      // Example of an admin manual update on the Bole facility.
      {
        facilityId: facilityBole.id,
        oldAvailableSpaces: 60,
        newAvailableSpaces: 45,
        source: 'MANUAL_UPDATE',
        updatedByUserId: admin1User.id,
      },
    ],
  });

  console.log('✅ Seed complete.');
  console.log('   System admin:', env.systemAdmin.email);
  console.log('   Owners: owner1@parkwise.local / owner2@parkwise.local (Owner123!)');
  console.log('   Admins: admin1@parkwise.local / admin2@parkwise.local (Admin123!)');
  console.log('   Drivers: driver1@parkwise.local / driver2@parkwise.local (Driver123!)');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
