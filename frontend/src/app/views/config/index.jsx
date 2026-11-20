import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { ConfigSeccion } from '@/features/config';

/** /config/:seccion — permiso exclusivo de esta página: solo admin */
const ConfigPage = () => (
  <ProtectedRoute soloAdmin>
    <ConfigSeccion />
  </ProtectedRoute>
);

export default ConfigPage;
