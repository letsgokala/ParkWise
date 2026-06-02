import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { MapPage } from './pages/MapPage';
import { FacilityDetailPage } from './pages/FacilityDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterDriverPage } from './pages/RegisterDriverPage';
import { RegisterOwnerPage } from './pages/RegisterOwnerPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { NotFoundPage, UnauthorizedPage } from './pages/StatusPages';

import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { OwnerFacilitiesPage } from './pages/owner/OwnerFacilitiesPage';
import { OwnerFacilityNewPage } from './pages/owner/OwnerFacilityNewPage';
import { OwnerFacilityDetailPage } from './pages/owner/OwnerFacilityDetailPage';
import { OwnerParkingAdminsPage } from './pages/owner/OwnerParkingAdminsPage';
import { OwnerAssignmentsPage } from './pages/owner/OwnerAssignmentsPage';

import { ParkingAdminDashboardPage } from './pages/admin/ParkingAdminDashboardPage';
import { ParkingAdminOperationsPage } from './pages/admin/ParkingAdminOperationsPage';

import { SysAdminDashboardPage } from './pages/sysadmin/SysAdminDashboardPage';
import { SysAdminPendingPage } from './pages/sysadmin/SysAdminPendingPage';
import { SysAdminFacilitiesPage } from './pages/sysadmin/SysAdminFacilitiesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth (no chrome) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/driver" element={<RegisterDriverPage />} />
        <Route path="/register/facility-owner" element={<RegisterOwnerPage />} />

        {/* Public + driver (top navigation) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/facilities/:id" element={<FacilityDetailPage />} />
          <Route
            path="/driver/dashboard"
            element={
              <ProtectedRoute allow={['REGISTERED_DRIVER']}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/recommendations"
            element={
              <ProtectedRoute allow={['REGISTERED_DRIVER']}>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/driver/favorites"
            element={
              <ProtectedRoute allow={['REGISTERED_DRIVER']}>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>

        {/* Facility owner (sidebar) */}
        <Route
          element={
            <ProtectedRoute allow={['FACILITY_OWNER']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
          <Route path="/owner/facilities" element={<OwnerFacilitiesPage />} />
          <Route path="/owner/facilities/new" element={<OwnerFacilityNewPage />} />
          <Route path="/owner/facilities/:id" element={<OwnerFacilityDetailPage />} />
          <Route path="/owner/parking-admins" element={<OwnerParkingAdminsPage />} />
          <Route path="/owner/assignments" element={<OwnerAssignmentsPage />} />
        </Route>

        {/* Parking admin (sidebar) */}
        <Route
          element={
            <ProtectedRoute allow={['PARKING_ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/parking-admin/dashboard" element={<ParkingAdminDashboardPage />} />
          <Route
            path="/parking-admin/facilities/:id/operations"
            element={<ParkingAdminOperationsPage />}
          />
        </Route>

        {/* System admin (sidebar) */}
        <Route
          element={
            <ProtectedRoute allow={['SYSTEM_ADMIN']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/system-admin/dashboard" element={<SysAdminDashboardPage />} />
          <Route path="/system-admin/facilities" element={<SysAdminFacilitiesPage />} />
          <Route path="/system-admin/facilities/pending" element={<SysAdminPendingPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
