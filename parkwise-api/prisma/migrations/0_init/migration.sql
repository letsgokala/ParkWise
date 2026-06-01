-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REGISTERED_DRIVER', 'FACILITY_OWNER', 'PARKING_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'REMOVED');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('MANUAL', 'API_INTEGRATED');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "CongestionLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AvailabilitySource" AS ENUM ('MANUAL_UPDATE', 'API_SYNC', 'SEED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'NEVER');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityOwnerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityOwnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingAdminProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "adminStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByOwnerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingAdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAdminProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingFacility" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "totalSpaces" INTEGER NOT NULL,
    "availableSpaces" INTEGER NOT NULL,
    "facilityType" "FacilityType" NOT NULL DEFAULT 'MANUAL',
    "hourlyPrice" DOUBLE PRECISION NOT NULL,
    "congestionLevel" "CongestionLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "FacilityStatus" NOT NULL DEFAULT 'PENDING',
    "approvalNotes" TEXT,
    "approvedBySystemAdminId" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "lastAvailabilityUpdateAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingAdminAssignment" (
    "id" UUID NOT NULL,
    "parkingAdminId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "replacedByAssignmentId" UUID,
    "createdByOwnerId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingAdminAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteParkingFacility" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "notifyOnAvailability" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnPriceDrop" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAvailableSpaces" INTEGER,
    "lastSeenHourlyPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteParkingFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIntegration" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "authToken" TEXT NOT NULL,
    "refreshIntervalSeconds" INTEGER NOT NULL DEFAULT 300,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" "SyncStatus" NOT NULL DEFAULT 'NEVER',
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityLog" (
    "id" UUID NOT NULL,
    "facilityId" UUID NOT NULL,
    "oldAvailableSpaces" INTEGER NOT NULL,
    "newAvailableSpaces" INTEGER NOT NULL,
    "source" "AvailabilitySource" NOT NULL,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRecommendationLog" (
    "id" UUID NOT NULL,
    "driverId" UUID,
    "inputLatitude" DOUBLE PRECISION NOT NULL,
    "inputLongitude" DOUBLE PRECISION NOT NULL,
    "facilityId" UUID NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "priceScore" DOUBLE PRECISION NOT NULL,
    "distanceScore" DOUBLE PRECISION NOT NULL,
    "availabilityScore" DOUBLE PRECISION NOT NULL,
    "congestionScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "rankPosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIRecommendationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityOwnerProfile_userId_key" ON "FacilityOwnerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingAdminProfile_userId_key" ON "ParkingAdminProfile"("userId");

-- CreateIndex
CREATE INDEX "ParkingAdminProfile_createdByOwnerId_idx" ON "ParkingAdminProfile"("createdByOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemAdminProfile_userId_key" ON "SystemAdminProfile"("userId");

-- CreateIndex
CREATE INDEX "ParkingFacility_status_idx" ON "ParkingFacility"("status");

-- CreateIndex
CREATE INDEX "ParkingFacility_facilityType_idx" ON "ParkingFacility"("facilityType");

-- CreateIndex
CREATE INDEX "ParkingFacility_latitude_longitude_idx" ON "ParkingFacility"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ParkingFacility_ownerId_idx" ON "ParkingFacility"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingAdminAssignment_replacedByAssignmentId_key" ON "ParkingAdminAssignment"("replacedByAssignmentId");

-- CreateIndex
CREATE INDEX "ParkingAdminAssignment_parkingAdminId_idx" ON "ParkingAdminAssignment"("parkingAdminId");

-- CreateIndex
CREATE INDEX "ParkingAdminAssignment_facilityId_idx" ON "ParkingAdminAssignment"("facilityId");

-- CreateIndex
CREATE INDEX "ParkingAdminAssignment_status_idx" ON "ParkingAdminAssignment"("status");

-- CreateIndex
CREATE INDEX "FavoriteParkingFacility_driverId_idx" ON "FavoriteParkingFacility"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteParkingFacility_driverId_facilityId_key" ON "FavoriteParkingFacility"("driverId", "facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiIntegration_facilityId_key" ON "ApiIntegration"("facilityId");

-- CreateIndex
CREATE INDEX "ApiIntegration_facilityId_idx" ON "ApiIntegration"("facilityId");

-- CreateIndex
CREATE INDEX "AvailabilityLog_facilityId_idx" ON "AvailabilityLog"("facilityId");

-- CreateIndex
CREATE INDEX "AIRecommendationLog_facilityId_idx" ON "AIRecommendationLog"("facilityId");

-- CreateIndex
CREATE INDEX "AIRecommendationLog_driverId_idx" ON "AIRecommendationLog"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityOwnerProfile" ADD CONSTRAINT "FacilityOwnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAdminProfile" ADD CONSTRAINT "ParkingAdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAdminProfile" ADD CONSTRAINT "ParkingAdminProfile_createdByOwnerId_fkey" FOREIGN KEY ("createdByOwnerId") REFERENCES "FacilityOwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAdminProfile" ADD CONSTRAINT "SystemAdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingFacility" ADD CONSTRAINT "ParkingFacility_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "FacilityOwnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingFacility" ADD CONSTRAINT "ParkingFacility_approvedBySystemAdminId_fkey" FOREIGN KEY ("approvedBySystemAdminId") REFERENCES "SystemAdminProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAdminAssignment" ADD CONSTRAINT "ParkingAdminAssignment_parkingAdminId_fkey" FOREIGN KEY ("parkingAdminId") REFERENCES "ParkingAdminProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAdminAssignment" ADD CONSTRAINT "ParkingAdminAssignment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAdminAssignment" ADD CONSTRAINT "ParkingAdminAssignment_createdByOwnerId_fkey" FOREIGN KEY ("createdByOwnerId") REFERENCES "FacilityOwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingAdminAssignment" ADD CONSTRAINT "ParkingAdminAssignment_replacedByAssignmentId_fkey" FOREIGN KEY ("replacedByAssignmentId") REFERENCES "ParkingAdminAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteParkingFacility" ADD CONSTRAINT "FavoriteParkingFacility_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteParkingFacility" ADD CONSTRAINT "FavoriteParkingFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIntegration" ADD CONSTRAINT "ApiIntegration_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityLog" ADD CONSTRAINT "AvailabilityLog_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityLog" ADD CONSTRAINT "AvailabilityLog_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendationLog" ADD CONSTRAINT "AIRecommendationLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRecommendationLog" ADD CONSTRAINT "AIRecommendationLog_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Business-rule constraint that Prisma's schema cannot express directly:
-- enforce AT MOST ONE ACTIVE assignment per (parkingAdminId, facilityId).
-- Removed/suspended rows are exempt so an admin can be re-assigned later.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "ParkingAdminAssignment_active_unique"
  ON "ParkingAdminAssignment" ("parkingAdminId", "facilityId")
  WHERE "status" = 'ACTIVE';
