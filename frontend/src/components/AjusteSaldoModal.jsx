import React, { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';

const AjusteSaldoModal = ({ isOpen, onClose, cliente }) => {
  const [monto, setMonto] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState('PAGO'); // 'PAGO' o 'DEUDA'
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();

  const ajusteMutation = useMutation({
    mutationFn: (montoAjuste) => clientesApi.ajustarSaldoCliente(cliente.id, montoAjuste),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
      pushToast('success', 'Saldo ajustado correctamente.');
      onClose();
    },
    onError: (error) => {
      pushToast('error', getErrorMessage(error, 'Error al ajustar el saldo.'));
    }
  });

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setTipoAjuste('PAGO');
    }
  }, [isOpen]);

  if (!isOpen || !cliente) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) return;
    
    // PAGO suma al balance (reduce la deuda o aumenta el saldo a favor)
    // DEUDA resta al balance (aumenta la deuda o reduce el saldo a favor)
    const valorAjuste = tipoAjuste === 'PAGO' ? parseFloat(monto) : -parseFloat(monto);
    
    ajusteMutation.mutate(valorAjuste);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ajustar Saldo</h2>
              <p className="text-sm text-gray-500">{cliente.nombreRazonSocial}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-sm text-gray-500 mb-1">Saldo Actual</div>
              <div className={`text-2xl font-bold ${cliente.balanceDinero < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                $ {cliente.balanceDinero ? cliente.balanceDinero.toLocaleString('es-AR') : '0'}
              </div>
              {cliente.balanceDinero < 0 && (
                <div className="text-xs text-red-500 mt-1">El cliente tiene deuda.</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué tipo de movimiento desea registrar?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAjuste('PAGO')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    tipoAjuste === 'PAGO'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Registrar Pago
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste('DEUDA')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    tipoAjuste === 'DEUDA'
                      ? 'border-red-500 bg-red-50 text-red-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Nueva Deuda
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">
                Monto
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">$</span>
                </div>
                <FormattedNumberInput
                  id="monto"
                  required
                  value={monto}
                  onChange={(val) => setMonto(val)}
                  className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ej: 5000"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {tipoAjuste === 'PAGO' 
                  ? 'Este monto se sumará al saldo (reduce deuda).' 
                  : 'Este monto se restará del saldo (aumenta deuda).'}
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={ajusteMutation.isPending || !monto || parseFloat(monto) <= 0}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {ajusteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar {tipoAjuste === 'PAGO' ? 'Pago' : 'Deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjusteSaldoModal;
