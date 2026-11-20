import { useResumen } from '../hooks/useResumen';
import EstadosFranja from './EstadosFranja';

/** Franja fina bajo el navbar: todas las personas activas, por estado */
const FranjaGlobal = () => {
  const { data } = useResumen();
  return <EstadosFranja estados={data?.estados} />;
};

export default FranjaGlobal;
