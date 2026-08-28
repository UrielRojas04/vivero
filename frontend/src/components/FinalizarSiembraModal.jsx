import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Package } from 'lucide-react';
import api from '../api/axios';
import FormattedNumberInput from './FormattedNumberInput';

const FinalizarSiembraModal = ({ isOpen, siembra, onFinalizar, onCancel }) => {
  const [productos, setProductos] = useState([]);
  const [idProductoSeleccionado, setIdProductoSeleccionado] = useState('');
  const [cantidadFinal, setCantidadFinal] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCantidadFinal(siembra?.cantidad?.toString() || '');
      setIdProductoSeleccionado('');
      
      const fetchProductos = async () => {
        try {
          const res = await api.get('/productos');
          setProductos(res.data);
        } catch (error) {
          console.error("Error fetching productos", error);
        }
      };
      fetchProductos();
    }
  }, [isOpen, siembra]);

  if (!isOpen || !siembra) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!idProductoSeleccionado || !cantidadFinal) return;
    onFinalizar(idProductoSeleccionado, parseInt(cantidadFinal, 10));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      <div className="bg-paper border border-line-strong rounded-none sm:rounded-panel w-full h-full sm:h-auto max-h-screen sm:max-h-[90vh] max-w-md overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-accent-soft shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-paper rounded-base flex items-center justify-center text-accent-ink">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-accent-ink">
              Finalizar Siembra
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-accent-ink hover:brightness-90 hover:bg-paper rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto flex flex-col">
          <p className="text-sm text-muted mb-6">
            Vas a marcar como "Lista para entregar" la variedad <strong>{siembra.variedad}</strong> (Siembra: {siembra.numeroSiembra || '-'}{siembra.codigoLote ? ` • Lote: ${siembra.codigoLote}` : ''}). Selecciona a qué producto del catálogo sumar el stock resultante.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Producto Destino (Catálogo) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-faint">
                  <Package className="w-5 h-5" />
                </span>
                <select
                  required
                  value={idProductoSeleccionado}
                  onChange={(e) => setIdProductoSeleccionado(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors appearance-none bg-paper"
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock actual: {p.stock})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Cantidad Final Lograda *
              </label>
              <FormattedNumberInput
                required
                value={cantidadFinal}
                onChange={setCantidadFinal}
                className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                placeholder="Ej: 100"
              />
              <p className="text-xs text-muted mt-1">La cantidad inicial sembrada fue {siembra.cantidad}.</p>
            </div>
          </div>

          <div className="mt-auto pt-8 flex justify-end gap-3 border-t border-line">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!idProductoSeleccionado || !cantidadFinal}
              className="px-5 py-2.5 text-sm font-medium text-paper bg-accent border border-transparent rounded-base hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ingresar Stock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinalizarSiembraModal;
