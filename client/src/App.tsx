import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isAuthenticated } from "./api/auth";
import { api } from "./api/client";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import PosPage from "./pages/PosPage";
import KitchenPage from "./pages/KitchenPage";
import BillingPage from "./pages/BillingPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function useLayoutProfile() {
  const [restaurantName, setRestaurantName] = useState<string>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then((me) => {
        setRestaurantName(me.restaurantName);
        setIsAdmin(me.role === "admin");
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { restaurantName, isAdmin, loading };
}

function PosLayout() {
  const { restaurantName, isAdmin } = useLayoutProfile();

  return (
    <AppLayout active="pos" restaurantName={restaurantName} isAdmin={isAdmin}>
      <PosPage />
    </AppLayout>
  );
}

function KitchenLayout() {
  const { restaurantName, isAdmin } = useLayoutProfile();

  return (
    <AppLayout active="kitchen" restaurantName={restaurantName} isAdmin={isAdmin}>
      <KitchenPage />
    </AppLayout>
  );
}

function BillingLayout() {
  const { restaurantName, isAdmin } = useLayoutProfile();

  return (
    <AppLayout active="billing" restaurantName={restaurantName} isAdmin={isAdmin}>
      <BillingPage />
    </AppLayout>
  );
}

function AdminLayout() {
  const { restaurantName, isAdmin } = useLayoutProfile();

  return (
    <AppLayout active="admin" restaurantName={restaurantName} isAdmin={isAdmin}>
      <AdminPage />
    </AppLayout>
  );
}

function DashboardLayout() {
  const { restaurantName, isAdmin, loading } = useLayoutProfile();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-on-surface-variant">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/pos" replace />;
  }

  return (
    <AppLayout active="dashboard" restaurantName={restaurantName} isAdmin={isAdmin}>
      <DashboardPage />
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/pos" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <PosLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute>
              <KitchenLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <BillingLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/billing/:orderId"
          element={
            <ProtectedRoute>
              <BillingLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
