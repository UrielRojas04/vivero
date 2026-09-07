import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getIconoUnidad } from '../utils/unidadIconos';
import StockPieChart from '../components/StockPieChart';
import AlertaStock from '../components/AlertaStock';
import BandejasDisponiblesList from '../components/BandejasDisponiblesList';

const Dashboard = () => {
  const { unidadNegocioActiva } = useAuthStore();
  const IconoUnidad = getIconoUnidad(unidadNegocioActiva);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Bienvenido al Dashboard</h1>
        {unidadNegocioActiva === '1' && (
          <p className="mt-1 text-sm text-muted">Selecciona una opción del menú lateral para comenzar a gestionar el vivero.</p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-paper rounded-panel border border-line p-8 text-center lg:text-left flex flex-col lg:flex-row items-center gap-6 col-span-1 lg:col-span-2">
          <div className="mx-auto lg:mx-0 w-16 h-16 shrink-0 bg-accent-soft rounded-full flex items-center justify-center">
            <IconoUnidad className="w-8 h-8 text-accent-ink" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-ink">Sesión Unificada Activa</h2>
            <p className="mt-1 text-sm text-muted max-w-3xl mx-auto lg:mx-0">
              Has iniciado sesión correctamente. El sistema filtra los datos automáticamente basado en el negocio activo y tus permisos.
            </p>
          </div>
        </div>

        <StockPieChart unidadNegocioId={unidadNegocioActiva} />
        <AlertaStock unidadNegocioId={unidadNegocioActiva} />

        {unidadNegocioActiva === '1' && (
          <div className="col-span-1">
            <BandejasDisponiblesList />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
