import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { AppLayout } from '@/features/layout';
import { APP_CONFIG } from '@/app/config';

// Páginas: solo desde app/views/<ruta> (ver AGENTS.md → "Dónde va cada cosa")
import NotFound from '@/app/views/not-found';
import Login from '@/app/views/login';
import CambiarContrasena from '@/app/views/cambiar-contrasena';
import Calendario from '@/app/views/calendario';
import Expedientes from '@/app/views/expedientes';
import Reportes from '@/app/views/reportes';
import Config from '@/app/views/config';

const App = () => {
  useEffect(() => {
    document.title = APP_CONFIG.name;
    document.querySelector('meta[name="description"]')?.setAttribute('content', APP_CONFIG.description);
  }, []);

  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/cambiar-contrasena" element={<CambiarContrasena />} />

      {/* Protegidas, dentro del layout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/expedientes" replace />} />
        <Route path="/expedientes" element={<Expedientes />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/config/:seccion" element={<Config />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
