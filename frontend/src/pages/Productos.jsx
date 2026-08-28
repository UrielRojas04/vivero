import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ProductoForm from '../components/ProductoForm';
import { useUIStore } from '../store/useUIStore';
import { useStockStore } from '../store/useStockStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Sparkles, Inbox, Leaf, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

// Aviso de margen (pedido del usuario 2026-08-25): el costo dinámico de las capas (`costoUnitarioHistorico`)
// puede superar al precio de venta fijo sin que nadie lo note, porque el precio nunca se actualiza solo
// (decisión deliberada, ver costeo-fifo-herramientas). Esto sólo lee y compara — nunca toca precio/costo.
const estadoMargen = (producto) => {
  const costoActual = producto.costoUnitarioHistorico ?? producto.costoProducto;
  if (costoActual === null || costoActual === undefined || !producto.precio) return null;
  const margenReal = ((producto.precio - costoActual) / costoActual) * 100;
  if (margenReal < 0) return { nivel: 'perdida', margenReal };
  const margenObjetivo = producto.porcentajeGanancia;
  if (margenObjetivo && margenReal < margenObjetivo) return { nivel: 'reducido', margenReal };
  return null;
};

const Productos = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Filtro de la sección Productos (grupo 10 de tasks.md de config-costeo-por-proveedor, OQ7):
  // reemplaza al filtro por marca — un solo filtro, por proveedor, no dos equivalentes conviviendo.
  const [selectedProveedor, setSelectedProveedor] = useState('Todos');
  const [searchMode, setSearchMode] = useState('TODO');
  const [expandedMobileId, setExpandedMobileId] = useState(null);
  
  const liveStocks = useStockStore(state => state.liveStocks);

  // Sincronizar stock en vivo con el estado local
  useEffect(() => {
    if (Object.keys(liveStocks).length === 0) return;
    setProductos(prev => prev.map(p => 
      liveStocks[p.id] !== undefined ? { ...p, stock: liveStocks[p.id] } : p
    ));
  }, [liveStocks]);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);

  const fetchProductos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/productos');
      setProductos(response.data || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos suficientes para ver el catálogo de productos (requiere LEER_STOCK).');
      } else {
        setError('Ocurrió un error al cargar los productos. Por favor, reintente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (selectedProducto) {
        // Edit mode
        await api.put(`/productos/${selectedProducto.id}`, formData);
      } else {
        // Create mode
        await api.post('/productos', formData);
      }
      setIsFormOpen(false);
      setSelectedProducto(null);
      fetchProductos();
      pushToast('success', 'Producto guardado correctamente.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para modificar el stock de productos (requiere ESCRIBIR_STOCK).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar el producto. Verifica los datos.'));
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/productos/${id}`);
      fetchProductos();
      pushToast('success', 'Producto eliminado.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para eliminar productos (requiere ESCRIBIR_STOCK).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar el producto.'));
      }
    }
  };

  const proveedoresDisponibles = Array.from(new Set(
    productos
      .filter(p => p.proveedorNombre && p.proveedorNombre.trim() !== '')
      .map(p => p.proveedorNombre.trim().toUpperCase())
  )).sort();

  const filteredProductos = productos.filter((p) => {
    let matchSearch = false;
    if (searchMode === 'NUMERO_SIEMBRA') {
      matchSearch = p.numeroSiembra && p.numeroSiembra.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.numeroSiembra && p.numeroSiembra.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.lote && p.lote.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (unidadNegocioActiva === '2' && selectedProveedor !== 'Todos') {
      const pProveedor = p.proveedorNombre ? p.proveedorNombre.trim().toUpperCase() : '';
      return matchSearch && pProveedor === selectedProveedor;
    }

    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">Catálogo de Productos</h1>
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          </div>
          <p className="mt-1 text-sm text-muted">Gestión de plantas, inventario y precios de venta.</p>
        </div>

        <button
          onClick={() => {
            setSelectedProducto(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-accent hover:brightness-95 text-paper font-semibold px-5 py-2.5 rounded-base transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Search and Feedback Area */}
      <div className="bg-paper rounded-panel border border-line p-4 flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-faint" />
          </span>
          <input
            type="text"
            placeholder={searchMode === 'NUMERO_SIEMBRA' ? 'Buscar sólo por número de siembra...' : 'Buscar por nombre, lote o Nº de siembra...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-line rounded-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-canvas/50 transition-all"
          />
        </div>

        {unidadNegocioActiva === '1' && (
          <div className="flex items-center gap-1.5 bg-canvas rounded-base p-1 shrink-0 self-start md:self-auto w-full md:w-auto">
            <button
              type="button"
              onClick={() => setSearchMode('TODO')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-base text-xs font-semibold transition-colors cursor-pointer ${
                searchMode === 'TODO' ? 'bg-paper text-ink' : 'text-muted hover:text-body'
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('NUMERO_SIEMBRA')}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-base text-xs font-semibold transition-colors cursor-pointer ${
                searchMode === 'NUMERO_SIEMBRA' ? 'bg-paper text-accent-ink' : 'text-muted hover:text-body'
              }`}
            >
              Sólo Nº Siembra
            </button>
          </div>
        )}

        <div className="text-sm text-muted font-medium whitespace-nowrap self-end md:self-auto">
          Total: <span className="text-ink font-semibold font-mono tabular-nums">{filteredProductos.length}</span> {unidadNegocioActiva === '2' ? 'herramientas' : 'plantas'}
        </div>
      </div>

      {/* Proveedores Tabs (solo Herramientas) — reemplaza el filtro por marca (OQ7, grupo 10) */}
      {unidadNegocioActiva === '2' && (
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setSelectedProveedor('Todos')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
              selectedProveedor === 'Todos'
                ? 'bg-accent text-paper'
                : 'bg-paper text-body border border-line hover:bg-canvas hover:text-ink'
            }`}
          >
            Todos los Proveedores
          </button>
          {proveedoresDisponibles.map(proveedor => (
            <button
              key={proveedor}
              onClick={() => setSelectedProveedor(proveedor)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                selectedProveedor === proveedor
                  ? 'bg-accent text-paper'
                  : 'bg-paper text-body border border-line hover:bg-canvas hover:text-ink'
              }`}
            >
              {proveedor}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {error && (
        <div className="bg-danger-bg border border-danger-line rounded-panel p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-danger-ink">Error de Acceso</h3>
            <p className="mt-1 text-sm text-danger">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
          <p className="text-sm font-medium text-muted">Cargando inventario de plantas...</p>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-canvas rounded-full flex items-center justify-center mb-4 border border-line">
            {searchTerm ? <Search className="w-8 h-8 text-faint" /> : <Inbox className="w-8 h-8 text-faint" />}
          </div>
          <h3 className="text-lg font-semibold text-ink">
            {searchTerm ? 'No se encontraron resultados' : 'El catálogo está vacío'}
          </h3>
          <p className="mt-2 text-sm text-muted max-w-sm">
            {searchTerm
              ? 'Prueba modificando los términos de búsqueda o borrando el filtro.'
              : 'Comienza agregando tu primer producto al vivero presionando el botón "Nuevo Producto".'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setSelectedProducto(null);
                setIsFormOpen(true);
              }}
              className="mt-6 px-4 py-2 bg-accent-soft hover:brightness-95 text-accent-ink font-semibold rounded-base text-sm transition-colors cursor-pointer"
            >
              Crear primer planta
            </button>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards Layout */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filteredProductos.map((producto) => (
              <div 
                key={producto.id} 
                className="bg-paper border border-line rounded-panel p-4 flex flex-col gap-3 transition-all cursor-pointer hover:border-line-strong"
                onClick={() => setExpandedMobileId(expandedMobileId === producto.id ? null : producto.id)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center font-semibold shrink-0">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink text-base leading-tight">
                        {producto.nombre}
                        {unidadNegocioActiva === '2' && producto.proveedorNombre && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-thead text-body border border-line ml-2">
                            {producto.proveedorNombre.toUpperCase()}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-semibold text-ink font-mono tabular-nums">
                          ${producto.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-base text-[10px] font-bold ${
                          producto.stock === 0
                            ? 'bg-danger-bg text-danger-ink border border-danger-line'
                            : producto.stock <= 5
                              ? 'bg-warn-bg text-warn-ink border border-warn-line'
                              : 'bg-ok-bg text-ok-ink border border-ok-line'
                        }`}>
                          Stock: {producto.stock}
                        </span>
                        {unidadNegocioActiva === '2' && (() => {
                          const margen = estadoMargen(producto);
                          if (!margen) return null;
                          return (
                            <span
                              title={`Margen real actual: ${margen.margenReal.toFixed(1)}%`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-base text-[10px] font-bold border ${
                                margen.nivel === 'perdida'
                                  ? 'bg-danger-bg text-danger-ink border-danger-line'
                                  : 'bg-warn-bg text-warn-ink border-warn-line'
                              }`}
                            >
                              <AlertCircle className="w-3 h-3" />
                              {margen.nivel === 'perdida' ? 'Vendiendo a pérdida' : 'Margen reducido'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-canvas rounded-base text-faint transition-colors">
                    {expandedMobileId === producto.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {expandedMobileId === producto.id && (
                  <div
                    className="flex flex-col gap-3 pt-2 border-t border-line mt-1 animate-in slide-in-from-top-2 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {producto.descripcion && (
                      <p className="text-sm text-muted leading-snug">
                        {producto.descripcion}
                      </p>
                    )}

                    {unidadNegocioActiva === '2' ? (
                      <div className="flex flex-wrap gap-2 text-xs text-body bg-canvas p-2.5 rounded-base border border-line">
                        <span className="font-semibold font-mono tabular-nums">Costo: ${(producto.costoUnitarioHistorico ?? producto.costoProducto) ? (producto.costoUnitarioHistorico ?? producto.costoProducto).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}</span>
                        <span>•</span>
                        <span className="font-semibold text-ink">Ganancia: {producto.porcentajeGanancia ? `${producto.porcentajeGanancia}%` : '-'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 text-xs text-body bg-canvas p-2.5 rounded-base border border-line">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-muted">Siembra</span>
                          <span className="font-semibold text-ink">{producto.numeroSiembra ? `${producto.numeroSiembra}` : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-muted">Lote</span>
                          <span className="font-semibold text-ink">{producto.lote || 'Sin lote'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-muted">Dueño</span>
                          <span className="font-semibold text-ink">{producto.dueno || 'Manual'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProducto(producto);
                          setIsFormOpen(true);
                        }}
                        className="flex-1 py-2 bg-canvas hover:bg-thead text-body font-semibold rounded-base text-sm transition-colors flex items-center justify-center gap-2 border border-line"
                      >
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          askConfirm({
                            title: '¿Confirmar Eliminación?',
                            message: 'Esta acción no se puede deshacer. Se removerá la planta de forma permanente.',
                            variant: 'danger',
                            confirmLabel: 'Eliminar Planta',
                            onConfirm: () => handleDelete(producto.id),
                          });
                        }}
                        className="flex-1 py-2 bg-danger-bg hover:brightness-95 text-danger-ink font-semibold rounded-base text-sm transition-colors flex items-center justify-center gap-2 border border-danger-line"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW: Table Layout */}
          <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-thead border-b border-line">
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Planta</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Descripción</th>
                  {unidadNegocioActiva === '2' ? (
                    <>
                      <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Costo</th>
                      <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">% Gan.</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Siembra</th>
                      <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Lote / Dueño</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredProductos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-canvas transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center font-semibold">
                          <Leaf className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-ink text-sm">{producto.nombre}</span>
                        {unidadNegocioActiva === '2' && producto.proveedorNombre && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-thead text-body border border-line ml-1">
                            {producto.proveedorNombre.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted max-w-md truncate" title={producto.descripcion}>
                        {producto.descripcion || <span className="text-faint italic">Sin descripción</span>}
                      </p>
                    </td>
                    {unidadNegocioActiva === '2' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-ink font-mono tabular-nums">
                            ${(producto.costoUnitarioHistorico ?? producto.costoProducto) ? (producto.costoUnitarioHistorico ?? producto.costoProducto).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0.00'}
                          </span>
                          {(() => {
                            const margen = estadoMargen(producto);
                            if (!margen) return null;
                            return (
                              <span
                                title={`Margen real actual: ${margen.margenReal.toFixed(1)}%`}
                                className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-base text-[10px] font-bold border ${
                                  margen.nivel === 'perdida'
                                    ? 'bg-danger-bg text-danger-ink border-danger-line'
                                    : 'bg-warn-bg text-warn-ink border-warn-line'
                                }`}
                              >
                                <AlertCircle className="w-3 h-3" />
                                {margen.nivel === 'perdida' ? 'Pérdida' : 'Margen bajo'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-ink bg-thead px-2.5 py-1 rounded-base font-mono tabular-nums">
                            {producto.porcentajeGanancia ? `${producto.porcentajeGanancia}%` : '-'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-ink">
                            {producto.numeroSiembra ? `${producto.numeroSiembra}` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-ink">
                              {producto.lote ? `Lote ${producto.lote}` : <span className="text-faint italic">Sin lote</span>}
                            </span>
                            <span className="text-xs text-muted">
                              {producto.dueno ? producto.dueno : <span className="text-faint italic">Manual</span>}
                            </span>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-ink font-mono tabular-nums">
                        ${producto.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tabular-nums ${
                        producto.stock === 0
                          ? 'bg-danger-bg text-danger-ink'
                          : producto.stock <= 5
                            ? 'bg-warn-bg text-warn-ink'
                            : 'bg-ok-bg text-ok-ink'
                      }`}>
                        {producto.stock} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedProducto(producto);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-canvas text-body hover:text-accent-ink rounded-base transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() =>
                            askConfirm({
                              title: '¿Confirmar Eliminación?',
                              message: 'Esta acción no se puede deshacer. Se removerá la planta de forma permanente del catálogo y del control de inventario.',
                              variant: 'danger',
                              confirmLabel: 'Eliminar Planta',
                              onConfirm: () => handleDelete(producto.id),
                            })
                          }
                          className="p-1.5 hover:bg-danger-bg text-body hover:text-danger rounded-base transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Reuse Form Modal Component */}
      <ProductoForm
        isOpen={isFormOpen}
        producto={selectedProducto}
        onSave={handleCreateOrUpdate}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedProducto(null);
        }}
      />
    </div>
  );
};

export default Productos;
