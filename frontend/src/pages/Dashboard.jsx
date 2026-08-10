import React from 'react';
import { Leaf } from 'lucide-react';

const Dashboard = () => {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido al Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Selecciona una opción del menú lateral para comenzar a gestionar el vivero.</p>
      </header>

      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
        <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <Leaf className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-medium text-gray-900">Sesión Unificada Activa</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Has iniciado sesión correctamente. Ya no es necesario seleccionar una unidad de negocio, el sistema filtrará los accesos automáticamente basado en tus permisos.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
