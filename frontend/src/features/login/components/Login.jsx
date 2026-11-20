import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/shared/context/AuthContext';
import { Button, Field, Input, ErrorAlert } from '@/shared/components/ui';
import { APP_CONFIG } from '@/app/config';
import AuthCard from '../components/AuthCard';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated } = useAuthContext();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { user } = await login(usuario.trim(), password);
      if (user?.requiereCambioPassword) {
        navigate('/cambiar-contrasena');
        return;
      }
      const redirect = sessionStorage.getItem('redirect_after_login') || '/';
      sessionStorage.removeItem('redirect_after_login');
      navigate(redirect);
    } catch {
      // el error ya está en el estado del hook
    }
  };

  return (
    <AuthCard subtitle={APP_CONFIG.description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Usuario o email">
          <Input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            autoFocus
            autoComplete="username"
            className="py-2.5"
          />
        </Field>
        <Field label="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="py-2.5"
          />
        </Field>

        <ErrorAlert>{error}</ErrorAlert>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthCard>
  );
};

export default Login;
