import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getIconoUnidad } from '../utils/unidadIconos';

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

      <div className="bg-paper rounded-panel border border-line p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center mb-4">
          <IconoUnidad className="w-8 h-8 text-accent-ink" />
        </div>
        <h2 className="text-lg font-medium text-ink">Sesión Unificada Activa</h2>
        <p className="mt-2 text-sm text-muted max-w-md mx-auto">
          Has iniciado sesión correctamente. Ya no es necesario seleccionar una unidad de negocio, el sistema filtrará los accesos automáticamente basado en tus permisos.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
