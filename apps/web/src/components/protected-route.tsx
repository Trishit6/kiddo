import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth-provider';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="text-muted-foreground">Loading your session…</p>;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
