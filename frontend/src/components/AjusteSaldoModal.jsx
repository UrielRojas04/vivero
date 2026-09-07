import React, { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';
import { describirSaldo } from '../utils/saldoDisplay';

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

  const saldo = describirSaldo(cliente.balanceDinero);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-paper w-full h-full sm:h-auto max-w-md rounded-none sm:rounded-panel border border-line-strong flex flex-col max-h-screen sm:max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex-none flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft rounded-base">
              <DollarSign className="w-5 h-5 text-accent-ink" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Ajustar Saldo</h2>
              <p className="text-sm text-muted">{cliente.nombreRazonSocial}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-faint hover:text-body hover:bg-canvas rounded-base transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Desde que existe el pago asociado a una venta puntual (dentro de "Cuenta
                Corriente"), éste queda como el camino de excepción: deuda o pago suelto que
                no corresponde a ninguna venta en particular. */}
            <div className="bg-warn-bg border border-warn-line rounded-base px-4 py-3 text-xs text-warn-ink">
              Usá esto sólo para deuda o pago <strong>que no corresponde a ninguna venta puntual</strong>.
              Si el cliente está pagando una venta pendiente, hacelo desde <strong>Cuenta Corriente</strong>: queda asociado a esa venta y no acá, suelto.
            </div>

            <div className="bg-thead p-4 rounded-base">
              <div className="text-xs uppercase tracking-wide font-semibold text-muted mb-1">
                {saldo.etiqueta}
              </div>
              <div className={`text-3xl font-bold font-mono tabular-nums ${saldo.tono.texto}`}>
                $ {saldo.monto}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">
                ¿Qué tipo de movimiento desea registrar?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoAjuste('PAGO')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-base border-2 transition-all cursor-pointer ${
                    tipoAjuste === 'PAGO'
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-muted hover:bg-canvas'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Registrar Pago
                </button>
                <button
                  type="button"
                  onClick={() => setTipoAjuste('DEUDA')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-base border-2 transition-all cursor-pointer ${
                    tipoAjuste === 'DEUDA'
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-muted hover:bg-canvas'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Nueva Deuda
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-body mb-1">
                Monto
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted font-medium">$</span>
                </div>
                <FormattedNumberInput
                  id="monto"
                  required
                  value={monto}
                  onChange={(val) => setMonto(val)}
                  decimales={0}
                  className="w-full pl-8 pr-4 py-2 bg-paper border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all font-mono tabular-nums"
                  placeholder="Ej: 5000"
                />
              </div>
              <p className="text-xs text-muted mt-2">
                {tipoAjuste === 'PAGO'
                  ? 'Este monto se sumará al saldo (reduce deuda).'
                  : 'Este monto se restará del saldo (aumenta deuda).'}
              </p>
            </div>
          </div>

          <div className="flex-none flex gap-3 p-4 px-6 border-t border-line sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-body hover:text-ink hover:bg-canvas rounded-base transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={ajusteMutation.isPending || !monto || parseFloat(monto) <= 0}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-paper bg-accent hover:brightness-95 rounded-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
