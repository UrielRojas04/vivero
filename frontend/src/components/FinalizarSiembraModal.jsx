import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Package } from 'lucide-react';
import api from '../api/axios';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">
              Finalizar Siembra
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Vas a marcar como "Lista para entregar" la variedad <strong>{siembra.variedad}</strong> (Lote: {siembra.numeroLote}). Selecciona a qué producto del catálogo sumar el stock resultante.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto Destino (Catálogo) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Package className="w-5 h-5" />
                </span>
                <select
                  required
                  value={idProductoSeleccionado}
                  onChange={(e) => setIdProductoSeleccionado(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors appearance-none bg-white"
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} (Stock actual: {p.stock})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad Final Lograda *
              </label>
              <input
                type="number"
                required
                min="1"
                value={cantidadFinal}
                onChange={(e) => setCantidadFinal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                placeholder="Ej: 100"
              />
              <p className="text-xs text-gray-500 mt-1">La cantidad inicial sembrada fue {siembra.cantidad}.</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!idProductoSeleccionado || !cantidadFinal}
              className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
