import React, { useState } from 'react';
import { X, PackageMinus } from 'lucide-react';
import api from '../api/axios';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

const DevolucionBandejasModal = ({ isOpen, onClose, cliente, onSuccess }) => {
  const { pushToast } = useUIStore();
  const [cantidad, setCantidad] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !cliente) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cant = parseInt(cantidad);
    if (!cant || cant <= 0) {
      pushToast('error', 'Ingrese una cantidad válida mayor a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/clientes/${cliente.id}/bandejas/devolucion`, { cantidad: cant });
      pushToast('success', 'Devolución registrada correctamente.');
      setCantidad('');
      onSuccess();
      onClose();
    } catch (error) {
      pushToast('error', getErrorMessage(error, 'Error al registrar devolución.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-fade-in-up">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <PackageMinus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Devolución de Bandejas</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-gray-600 mb-6">
            Cliente: <span className="font-bold text-gray-900">{cliente.nombreRazonSocial}</span><br/>
            Deuda actual: <span className="font-bold text-orange-600">{cliente.balanceBandejas || 0} bandejas</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a devolver
              </label>
              <input
                type="number"
                min="1"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-gray-50 hover:bg-white focus:bg-white text-lg font-semibold"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors shadow-sm font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Registrar Devolución'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DevolucionBandejasModal;
