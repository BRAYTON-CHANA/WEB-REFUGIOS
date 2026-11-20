import { useParams, Navigate } from 'react-router-dom';
import GenericCrud from '../components/GenericCrud';
import { configSections } from '../configs';
import Usuarios from './Usuarios';
import Roles from './Roles';

const CUSTOM = { usuarios: Usuarios, roles: Roles };

/** /config/:seccion → vista personalizada o CRUD genérico (la ruta ya exige admin) */
const ConfigSeccion = () => {
  const { seccion } = useParams();

  const Custom = CUSTOM[seccion];
  if (Custom) return <Custom />;

  const config = configSections[seccion];
  if (!config) return <Navigate to="/" replace />;

  return <GenericCrud key={seccion} config={config} />;
};

export default ConfigSeccion;
