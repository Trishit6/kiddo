import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/ui/spinner';

/** /profile predates public handles; keep the URL working. */
export function MyProfile() {
  const { user, status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="grid place-items-center py-24">
        <Spinner label="Loading your profile" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/@${user.username}`} replace />;
}
