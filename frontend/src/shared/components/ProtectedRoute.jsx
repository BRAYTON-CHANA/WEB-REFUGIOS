import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/shared/context/AuthContext';

/** Exige sesión; con soloAdmin, además rol admin */
const ProtectedRoute = ({ children, soloAdmin = false }) => {
  const { isAuthenticated, isAdmin, user } = useAuthContext();
  const location = useLocation();

  if (!isAuthenticated) {
    sessionStorage.setItem('redirect_after_login', location.pathname);
    return <Navigate to="/login" replace />;
  }
  if (user?.requiereCambioPassword) return <Navigate to="/cambiar-contrasena" replace />;
  if (soloAdmin && !isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
