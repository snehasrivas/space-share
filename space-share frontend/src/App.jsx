import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import HomePage from './pages/public/HomePage';
import BrowseVenuesPage from './pages/public/BrowseVenuesPage';
import VenueDetailPage from './pages/public/VenueDetailPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Renter Pages
import BookingSummaryPage from './pages/renter/BookingSummaryPage';
import MyBookingsPage from './pages/renter/MyBookingsPage';

// Owner Pages
import OwnerDashboardPage from './pages/owner/OwnerDashboardPage';
import VenueFormPage from './pages/owner/VenueFormPage';
import VenueVerificationPage from './pages/owner/VenueVerificationPage';
import OwnerBookingsPage from './pages/owner/OwnerBookingsPage';

// Admin Pages
import AdminVerificationPage from './pages/admin/AdminVerificationPage';

const App = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      <Navbar />

      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/venues" element={<BrowseVenuesPage />} />
          <Route path="/venues/:id" element={<VenueDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Renter Protected Routes */}
          <Route
            path="/bookings/:id/summary"
            element={
              <ProtectedRoute allowedRoles={['renter', 'owner', 'admin']}>
                <BookingSummaryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRoles={['renter', 'owner', 'admin']}>
                <MyBookingsPage />
              </ProtectedRoute>
            }
          />

          {/* Owner Protected Routes */}
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/venues/new"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <VenueFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/venues/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <VenueFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/venues/:id/verify"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <VenueVerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/bookings"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <OwnerBookingsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/verifications"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminVerificationPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
