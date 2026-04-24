import React from 'react';
import { X, Save } from 'lucide-react';

export const VariedadModal = ({ isOpen, onClose, onSave, data, setData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Registrar Variedad</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Variedad</label>
            <input required type="text" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none" value={data.nombre} onChange={(e) => setData({...data, nombre: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Días Invernadero</label>
              <input type="number" className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none font-bold" value={data.diasInvernaderoSugeridos} onChange={(e) => setData({...data, diasInvernaderoSugeridos: e.target.value})} />
            </div>
            {/* NUEVO CAMPO CONFIGURABLE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-blue-600">Días en Telas</label>
              <input type="number" className="w-full p-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={data.diasTelasSugeridos} onChange={(e) => setData({...data, diasTelasSugeridos: e.target.value})} />
            </div>
          </div>

          <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <Save size={20} /> Guardar Variedad
          </button>
        </form>
      </div>
    </div>
  );
};