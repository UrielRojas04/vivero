import React, { useState } from 'react';
import { X, PackageMinus } from 'lucide-react';
import api from '../api/axios';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm">
      <div className="bg-paper border border-line-strong w-full h-full sm:h-auto max-w-md rounded-none sm:rounded-panel overflow-hidden animate-fade-in-up flex flex-col max-h-screen sm:max-h-[95vh]">
        <div className="flex-none flex justify-between items-center p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft text-accent-ink rounded-base">
              <PackageMinus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">Devolución de Bandejas</h2>
          </div>
          <button onClick={onClose} className="text-faint hover:text-body transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-muted mb-6">
              Cliente: <span className="font-bold text-ink">{cliente.nombreRazonSocial}</span><br/>
              Deuda actual: <span className="font-bold text-warn-ink font-mono tabular-nums">{cliente.balanceBandejas || 0} bandejas</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Cantidad a devolver
                </label>
                <FormattedNumberInput
                  id="cantidadBandejas"
                  required
                  value={cantidad}
                  onChange={(val) => setCantidad(val)}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all bg-canvas hover:bg-paper focus:bg-paper text-lg font-semibold"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div className="flex-none flex gap-3 p-4 px-6 border-t border-line sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-body hover:bg-canvas rounded-base transition-colors font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-accent text-paper rounded-base hover:brightness-95 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
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
