import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, PackagePlus, Search, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import FormattedNumberInput from './FormattedNumberInput';
import { proveedoresApi } from '../api/proveedores.api';
import { productosApi } from '../api/productos.api';
import { useUIStore } from '../store/useUIStore';

const generarIdLinea = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `linea-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const lineaVacia = () => ({
  lineaId: generarIdLinea(),
  productoId: '',
  productoNombre: '',
  // Línea "pendiente de crear" (grupo 13 de tasks.md, reemplaza la Decisión 3 original): estos
  // dos campos viajan al backend en vez de productoId cuando el producto todavía no existe en
  // el catálogo. El Producto real recién nace al confirmar la recepción.
  productoNombreNuevo: '',
  productoPrecioNuevo: '',
  cantidadPedida: '',
  costoUnitarioPactado: '',
});

// Combobox de búsqueda de producto para una línea del pedido (grupo 12, pedido puntual
// post-apply del usuario: reemplaza el <select> nativo, incómodo con catálogos grandes).
// Sigue el estilo visual del buscador de productos de NuevaVenta.jsx (icono Search, input
// con pl-10, lista de resultados filtrados debajo), pero cada línea tiene su PROPIO estado
// de búsqueda — no hay un buscador global compartido. Definido a nivel de módulo (no anidado
// dentro de PedidoForm) para que su estado interno no se resetee en cada render del padre.
// No reimplementa selección/alta: delega en `onSelect` (que en PedidoForm es `seleccionarProducto`).
const ProductoSearchSelect = ({ productos, productoId, productoNombre, productoNombreNuevo, onSelect, hasError }) => {
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(false);

  const esPendiente = !productoId && !!productoNombreNuevo;
  const buscando = editando || (!productoId && !esPendiente);

  const abrirBusqueda = () => {
    setBusqueda('');
    setEditando(true);
  };

  const handleSeleccionar = (id) => {
    onSelect(id);
    setBusqueda('');
    setEditando(false);
  };

  const filtrados = busqueda
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  if (!buscando) {
    if (esPendiente) {
      // Grupo 13: el producto NO existe todavía en el catálogo — badge distintivo, el alta
      // real recién ocurre al confirmar la recepción (RecepcionPedidoModal).
      return (
        <button
          type="button"
          onClick={abrirBusqueda}
          className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left flex items-center justify-between gap-2 cursor-pointer hover:border-amber-300 transition-colors"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate text-amber-800">{productoNombreNuevo}</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5 shrink-0">
              Nuevo — se crea al confirmar
            </span>
          </span>
          <span className="text-xs font-medium text-emerald-600 shrink-0">Cambiar</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={abrirBusqueda}
        className={`w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-300 transition-colors ${
          hasError ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        <span className="truncate">{productoNombre}</span>
        <span className="text-xs font-medium text-emerald-600 shrink-0">Cambiar</span>
      </button>
    );
  }

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className={`w-full pl-8 pr-8 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
            hasError ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {(productoId || esPendiente) && (
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Cancelar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {busqueda && (
        <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm divide-y divide-gray-50">
          {filtrados.length > 0 ? (
            filtrados.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSeleccionar(p.id)}
                className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="truncate">{p.nombre}</span>
                <span className="text-xs text-gray-400 shrink-0">stock: {p.stock}</span>
              </div>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400">No se encontraron productos.</p>
          )}
          <div
            onClick={() => handleSeleccionar('__nuevo__')}
            className="px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer"
          >
            + Crear producto nuevo…
          </div>
        </div>
      )}
    </div>
  );
};

// Modal fullscreen-mobile (Decisión 12 de design.md) para armar un pedido nuevo: proveedor,
// ítems (producto existente o creado en el momento con stock 0 — Decisión 3), cantidad y costo
// unitario pactado por ítem, con total en vivo.
const PedidoForm = ({ isOpen, onSave, onCancel }) => {
  const { pushToast } = useUIStore();

  const [proveedorId, setProveedorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([lineaVacia()]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-formulario de "producto pendiente de crear" (grupo 13 de tasks.md), abierto para una
  // línea puntual. Ya NO llama a la API: sólo captura nombre + precio y los guarda en la línea
  // local — el Producto real recién nace al confirmar la recepción del pedido.
  const [creandoParaLinea, setCreandoParaLinea] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
    enabled: isOpen,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => productosApi.getAll(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setProveedorId('');
      setObservaciones('');
      setItems([lineaVacia()]);
      setErrors({});
      setCreandoParaLinea(null);
      setNuevoNombre('');
      setNuevoPrecio('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !creandoParaLinea) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, creandoParaLinea]);

  if (!isOpen) return null;

  const actualizarLinea = (lineaId, campo, valor) => {
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId ? { ...it, [campo]: valor } : it)));
  };

  const seleccionarProducto = (lineaId, productoId) => {
    if (productoId === '__nuevo__') {
      setCreandoParaLinea(lineaId);
      setNuevoNombre('');
      setNuevoPrecio('');
      return;
    }
    const producto = productos.find((p) => String(p.id) === String(productoId));
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId ? {
      ...it,
      productoId,
      productoNombre: producto ? producto.nombre : '',
      // Si la línea venía "pendiente de crear", elegir un producto existente la reemplaza.
      productoNombreNuevo: '',
      productoPrecioNuevo: '',
    } : it)));
  };

  const agregarLinea = () => setItems((prev) => [...prev, lineaVacia()]);

  const eliminarLinea = (lineaId) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.lineaId !== lineaId) : prev));
  };

  // Grupo 13 de tasks.md (reemplaza la Decisión 3 original): ya NO se crea el Producto acá.
  // Sólo se capturan nombre + precio de venta y quedan guardados en la línea local
  // (productoNombreNuevo/productoPrecioNuevo, sin productoId) — el alta real ocurre recién al
  // confirmar la recepción del pedido, y sólo para lo que efectivamente llegó.
  const confirmarProductoPendiente = () => {
    if (!nuevoNombre.trim()) {
      pushToast('error', 'El nombre del producto nuevo es requerido.');
      return;
    }
    if (!nuevoPrecio || parseFloat(nuevoPrecio) <= 0) {
      pushToast('error', 'El precio de venta del producto nuevo es requerido.');
      return;
    }
    setItems((prev) => prev.map((it) => (it.lineaId === creandoParaLinea ? {
      ...it,
      productoId: '',
      productoNombre: '',
      productoNombreNuevo: nuevoNombre.trim(),
      productoPrecioNuevo: nuevoPrecio,
    } : it)));
    setCreandoParaLinea(null);
  };

  const total = items.reduce((acc, it) => {
    const cant = parseFloat(it.cantidadPedida) || 0;
    const costo = parseFloat(it.costoUnitarioPactado) || 0;
    return acc + cant * costo;
  }, 0);

  const validate = () => {
    const newErrors = {};
    if (!proveedorId) newErrors.proveedorId = 'Seleccioná un proveedor';
    if (items.length === 0) newErrors.items = 'Agregá al menos un ítem';
    items.forEach((it) => {
      if (!it.productoId && !it.productoNombreNuevo) newErrors[`producto-${it.lineaId}`] = 'Elegí un producto';
      if (!it.cantidadPedida || parseFloat(it.cantidadPedida) <= 0) newErrors[`cantidad-${it.lineaId}`] = 'Cantidad > 0';
      if (it.costoUnitarioPactado === '' || it.costoUnitarioPactado === null || parseFloat(it.costoUnitarioPactado) < 0) {
        newErrors[`costo-${it.lineaId}`] = 'Costo requerido';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      proveedorId: parseInt(proveedorId, 10),
      observaciones: observaciones.trim() || null,
      // Tarea 13.11: una línea a producto existente manda productoId y NO manda datos de
      // producto nuevo; una línea "pendiente de crear" manda productoNombreNuevo/
      // productoPrecioNuevo y NO manda productoId.
      detalles: items.map((it) => (it.productoId ? {
        productoId: parseInt(it.productoId, 10),
        cantidadPedida: parseInt(it.cantidadPedida, 10),
        costoUnitarioPactado: parseFloat(it.costoUnitarioPactado),
      } : {
        productoNombreNuevo: it.productoNombreNuevo,
        productoPrecioNuevo: parseFloat(it.productoPrecioNuevo),
        cantidadPedida: parseInt(it.cantidadPedida, 10),
        costoUnitarioPactado: parseFloat(it.costoUnitarioPactado),
      })),
    };

    try {
      setIsSubmitting(true);
      await onSave(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !creandoParaLinea) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-3xl shadow-2xl flex flex-col max-h-screen sm:max-h-[95vh]">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600 text-white sm:rounded-t-2xl">
          <h2 className="text-lg font-semibold">Nuevo Pedido a Proveedor</h2>
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-emerald-700 transition-colors text-white/90 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Proveedor
                </label>
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                    errors.proveedorId ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">-- Elegir proveedor --</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.proveedorId && <p className="mt-1 text-xs text-red-500 font-medium">{errors.proveedorId}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Observaciones (opcional)
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="Ej: entrega la semana que viene"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Ítems del pedido</label>
                <button
                  type="button"
                  onClick={agregarLinea}
                  className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar ítem
                </button>
              </div>

              <div className="space-y-3">
                {items.map((it) => (
                  <div key={it.lineaId} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                      <div>
                        <ProductoSearchSelect
                          productos={productos}
                          productoId={it.productoId}
                          productoNombre={it.productoNombre}
                          productoNombreNuevo={it.productoNombreNuevo}
                          onSelect={(productoId) => seleccionarProducto(it.lineaId, productoId)}
                          hasError={!!errors[`producto-${it.lineaId}`]}
                        />
                        {errors[`producto-${it.lineaId}`] && (
                          <p className="mt-1 text-xs text-red-500 font-medium">{errors[`producto-${it.lineaId}`]}</p>
                        )}
                      </div>
                      <div className="w-full sm:w-24">
                        <FormattedNumberInput
                          value={it.cantidadPedida}
                          onChange={(val) => actualizarLinea(it.lineaId, 'cantidadPedida', val)}
                          placeholder="Cant."
                          className={`w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right ${
                            errors[`cantidad-${it.lineaId}`] ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <FormattedNumberInput
                          value={it.costoUnitarioPactado}
                          onChange={(val) => actualizarLinea(it.lineaId, 'costoUnitarioPactado', val)}
                          placeholder="Costo unit."
                          className={`w-full px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right ${
                            errors[`costo-${it.lineaId}`] ? 'border-red-300' : 'border-gray-200'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarLinea(it.lineaId)}
                        disabled={items.length === 1}
                        className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                          items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-100 cursor-pointer'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sub-formulario de producto pendiente de crear, sólo visible para esta línea
                        (grupo 13: ya no llama a la API, sólo captura nombre + precio). */}
                    {creandoParaLinea === it.lineaId && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                        <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <PackagePlus className="w-4 h-4" /> Producto nuevo — se crea al confirmar la recepción
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={nuevoNombre}
                            onChange={(e) => setNuevoNombre(e.target.value)}
                            placeholder="Nombre del producto"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <FormattedNumberInput
                            value={nuevoPrecio}
                            onChange={(val) => setNuevoPrecio(val)}
                            placeholder="Precio de venta"
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setCreandoParaLinea(null)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={confirmarProductoPendiente}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                          >
                            Usar en esta línea
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-none flex items-center justify-between gap-3 p-4 px-6 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-2xl">
            <div className="text-sm text-gray-600">
              Total: <span className="text-lg font-bold text-gray-900">${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Guardando...' : 'Crear Pedido'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PedidoForm;
