import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/shared/context/AuthContext';
import { Button, Field, PasswordInput, ErrorAlert } from '@/shared/components/ui';
import { authService } from '../services/authService';
import AuthCard from '../components/AuthCard';

/** Cambio de clave: obligatorio (primer ingreso / reseteo) o voluntario desde el menú */
const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, patchUser, logout } = useAuthContext();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const obligatorio = Boolean(user?.requiereCambioPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (nueva !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(obligatorio ? undefined : actual, nueva);
      patchUser({ requiereCambioPassword: false });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Cambiar contraseña"
      subtitle={obligatorio ? 'Debes establecer una nueva contraseña para continuar.' : `Usuario: ${user?.usuario}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!obligatorio && (
          <Field label="Contraseña actual">
            <PasswordInput value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
          </Field>
        )}
        <Field label="Nueva contraseña" help="Mínimo 8 caracteres">
          <PasswordInput value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label="Confirmar contraseña">
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </Field>

        <ErrorAlert>{error}</ErrorAlert>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? 'Guardando…' : 'Guardar'}
        </Button>
        <button
          type="button"
          onClick={() => {
            if (!obligatorio) return navigate(-1);
            logout();
            navigate('/login');
          }}
          className="w-full text-sm text-pizarra hover:text-grafito"
        >
          {obligatorio ? 'Cerrar sesión' : 'Cancelar'}
        </button>
      </form>
    </AuthCard>
  );
};

export default ChangePassword;
