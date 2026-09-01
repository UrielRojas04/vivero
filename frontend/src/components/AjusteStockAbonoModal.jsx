import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { abonoApi } from '../api/abono.api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errorMessage';
import { X, Check, AlertCircle } from 'lucide-react';

const AjusteStockAbonoModal = ({ isOpen, onClose, producto }) => {
  const [cantidad, setCantidad] = useState('');
  const [tipo, setTipo] = useState('RESTA'); // SUMA o RESTA

  const { pushToast } = useUIStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const ajusteMutation = useMutation({
    mutationFn: (data) => abonoApi.registrarAjuste(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abono', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['abono', 'historial'] });
      pushToast('success', 'Ajuste registrado exitosamente');
      resetForm();
      onClose();
    },
    onError: (err) => {
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al registrar el ajuste.'));
    },
  });

  const resetForm = () => {
    setCantidad('');
    setTipo('RESTA');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!producto || !cantidad || isNaN(cantidad)) {
      pushToast('error', 'Por favor completá los campos correctamente.');
      return;
    }

    const isJefe = user?.username?.includes('jefe');
    const valorAjuste = tipo === 'RESTA' ? -Math.abs(parseInt(cantidad)) : Math.abs(parseInt(cantidad));
    
    // Validar stock negativo en frontend
    const stockActual = isJefe ? producto.stockInvernadero : producto.stockColega;
    if (tipo === 'RESTA' && Math.abs(parseInt(cantidad)) > stockActual) {
      pushToast('error', `No podés restar más del stock actual (${stockActual} unidades).`);
      return;
    }

    ajusteMutation.mutate({
      productoId: producto.id,
      cantidad: valorAjuste,
      cuenta: isJefe ? 'JEFE' : 'COLEGA'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-paper rounded-panel shadow-lg w-full max-w-md overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="text-lg font-bold text-ink">Ajustar Stock</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-canvas p-3 rounded-base flex items-start gap-2 border border-line">
            <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-body">
              Usá esta opción para corregir diferencias en el depósito (ej: bolsas rotas o errores al cargar la producción).
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1">Producto</label>
            <div className="w-full px-3 py-2 bg-canvas border border-line rounded-base text-ink font-semibold">
              {producto?.nombre}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1">Depósito a afectar</label>
            <div className="w-full px-3 py-2 bg-canvas border border-line rounded-base text-ink font-semibold">
              {user?.username?.includes('jefe') ? 'Invernadero' : 'Depósito Colega'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1">Ajuste de Stock</label>
            <div className="flex items-stretch bg-paper border border-line rounded-base overflow-hidden focus-within:ring-2 focus-within:ring-accent">
              <button
                type="button"
                onClick={() => setTipo('RESTA')}
                className={`px-5 py-2 text-xl font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  tipo === 'RESTA' ? 'bg-danger-bg text-danger-ink border-r border-danger-line' : 'text-muted hover:bg-canvas border-r border-line'
                }`}
                title="Restar (Merma / Rotura)"
              >
                -
              </button>
              
              <input
                type="number"
                min="1"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 text-center text-ink text-lg font-semibold focus:outline-none font-mono tabular-nums bg-transparent"
                placeholder={`Cant. a ${tipo === 'RESTA' ? 'restar' : 'sumar'}`}
                required
              />

              <button
                type="button"
                onClick={() => setTipo('SUMA')}
                className={`px-5 py-2 text-xl font-bold flex items-center justify-center transition-colors cursor-pointer ${
                  tipo === 'SUMA' ? 'bg-ok-bg text-ok-ink border-l border-ok-line' : 'text-muted hover:bg-canvas border-l border-line'
                }`}
                title="Sumar (Sobrante)"
              >
                +
              </button>
            </div>
            <p className="text-xs text-muted mt-1.5 text-center">
              {tipo === 'RESTA' ? 'Usar para registrar mermas o roturas.' : 'Usar para registrar sobrantes de stock.'}
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-muted hover:text-ink cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={ajusteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-paper font-semibold rounded-base hover:brightness-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {ajusteMutation.isPending ? 'Guardando...' : <><Check className="w-4 h-4" /> Confirmar Ajuste</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AjusteStockAbonoModal;
