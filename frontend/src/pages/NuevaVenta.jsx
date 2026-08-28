import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Search, ArrowRight, Clock, UserCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { productosApi } from '../api/productos.api';
import { ventasApi } from '../api/ventas.api';
import { useUIStore } from '../store/useUIStore';
import { useStockStore } from '../store/useStockStore';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import FormattedNumberInput from '../components/FormattedNumberInput';

// Utilidades para guardar "últimos usados" en LocalStorage
const getRecents = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const addRecent = (key, id) => {
  let recents = getRecents(key);
  // Eliminar si ya existe para ponerlo primero, y limitar a 5
  recents = [id, ...recents.filter(x => x !== id)].slice(0, 5);
  localStorage.setItem(key, JSON.stringify(recents));
};

const formatCurrency = (value) => Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// crypto.randomUUID() requiere un contexto seguro (HTTPS o localhost).
// Al probar desde el celular por IP de LAN (http://192.168.x.x) no está disponible y explota.
const generarIdLinea = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `linea-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

export default function NuevaVenta() {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { unidadNegocioActiva } = useAuthStore();
  const isHerramientas = String(unidadNegocioActiva) === '2';

  const [isClienteExpress, setIsClienteExpress] = useState(false);
  const [clienteExpressData, setClienteExpressData] = useState({ nombre: '', telefono: '', casual: true });

  const liveStocks = useStockStore(state => state.liveStocks);

  const clienteId = useCartStore(state => state.clienteSeleccionado);
  const detalles = useCartStore(state => state.detalles);
  const descuento = useCartStore(state => state.descuento);
  const bandejasEntregadas = useCartStore(state => state.bandejasEntregadas);
  const setCliente = useCartStore(state => state.setCliente);
  const setDetalles = useCartStore(state => state.setDetalles);
  const addDetalle = useCartStore(state => state.addDetalle);
  const removeDetalle = useCartStore(state => state.removeDetalle);
  const updateDetalleCantidad = useCartStore(state => state.updateDetalleCantidad);
  const setDescuento = useCartStore(state => state.setDescuento);
  const setBandejasEntregadas = useCartStore(state => state.setBandejasEntregadas);
  const clearCart = useCartStore(state => state.clearCart);

  // Sincronizar stock en vivo con el estado local
  useEffect(() => {
    if (Object.keys(liveStocks).length === 0) return;
    setProductos(prev => prev.map(p =>
      liveStocks[p.id] !== undefined ? { ...p, stock: liveStocks[p.id] } : p
    ));
    setDetalles(prev => prev.map(d => {
      if (liveStocks[d.productoId] !== undefined) {
        const newStock = liveStocks[d.productoId];
        // Si el stock nuevo es menor a la cantidad seleccionada, ajustar
        const newCantidad = d.cantidad > newStock ? newStock : d.cantidad;
        return { ...d, stock: newStock, cantidad: newCantidad > 0 ? newCantidad : '' };
      }
      return d;
    }));
  }, [liveStocks, setDetalles]);

  // Auto-calcular bandejas según la cantidad de productos en el carrito
  useEffect(() => {
    const totalProductos = detalles.reduce((sum, d) => sum + (parseInt(d.cantidad) || 1), 0);
    if (totalProductos > 0) {
      setBandejasEntregadas(totalProductos.toString());
    } else {
      setBandejasEntregadas('');
    }
  }, [detalles, setBandejasEntregadas]);

  // Estados para Modal Liquidación (transitorios, no persisten)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagosLineas, setPagosLineas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados de recientes
  const [clientesRecientesIds, setClientesRecientesIds] = useState([]);
  const [productosRecientesIds, setProductosRecientesIds] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesData, productosData] = await Promise.all([
          clientesApi.getAll(),
          productosApi.getAll()
        ]);
        setClientes(clientesData);
        setProductos(productosData);
      } catch (error) {
        if (error.response && error.response.status === 403) {
          pushToast('error', 'Permisos insuficientes. Necesitás poder leer clientes y stock para vender.');
        } else {
          pushToast('error', 'Error al cargar clientes y productos.');
        }
      }
    };
    fetchData();

    // Cargar recientes al iniciar
    setClientesRecientesIds(getRecents('recent_clients'));
    setProductosRecientesIds(getRecents('recent_products'));
  }, []);

  // ---- Filtros Cliente ----
  const clientesFiltrados = busquedaCliente
    ? clientes.filter(c => c.nombreRazonSocial.toLowerCase().includes(busquedaCliente.toLowerCase())).slice(0, 5)
    : [];

  // Mantenemos el orden de los recientes
  const clientesRecientes = clientesRecientesIds.map(id => clientes.find(c => c.id === id)).filter(Boolean);

  // ---- Filtros Producto ----
  const productosFiltrados = busquedaProducto
    ? productos.filter(p => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).slice(0, 5)
    : [];

  const productosRecientes = productosRecientesIds.map(id => productos.find(p => p.id === id)).filter(Boolean);


  // ---- Acciones ----
  const seleccionarCliente = (id) => {
    setCliente(id);
    setIsClienteExpress(false);
    setBusquedaCliente('');
  };

  const agregarProducto = (producto) => {
    if (producto.stock <= 0) {
      return pushToast('error', `El producto ${producto.nombre} no tiene stock disponible.`);
    }

    const exists = detalles.find(d => d.productoId === producto.id);
    if (exists) {
      if (exists.cantidad >= exists.stock) {
        return pushToast('error', `Stock insuficiente. El máximo de ${producto.nombre} es ${exists.stock}.`);
      }
      updateDetalleCantidad(producto.id, exists.cantidad + 1);
    } else {
      addDetalle({
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        stock: producto.stock
      });
    }
    setBusquedaProducto('');
  };

  const modificarCantidad = (productoId, cantidadStr) => {
    if (cantidadStr === '') {
      updateDetalleCantidad(productoId, '');
      return;
    }

    const cant = parseInt(cantidadStr);
    if (isNaN(cant) || cant <= 0) {
      updateDetalleCantidad(productoId, 1);
      return;
    }

    const detalle = detalles.find(d => d.productoId === productoId);
    if (cant > detalle.stock) {
      pushToast('error', `Stock máximo superado. Se ajustó a ${detalle.stock}.`);
      updateDetalleCantidad(productoId, detalle.stock);
      return;
    }

    updateDetalleCantidad(productoId, cant);
  };

  const eliminarDetalle = (productoId) => {
    removeDetalle(productoId);
  };

  const totalCalculado = detalles.reduce((acc, curr) => {
    const cantidadFinal = parseInt(curr.cantidad) || 0;
    return acc + (curr.precio * cantidadFinal);
  }, 0);

  const descuentoVal = parseFloat(descuento) || 0;
  const descuentoMonto = totalCalculado * (descuentoVal / 100);
  const totalFinal = totalCalculado - descuentoMonto;
  const totalPagado = pagosLineas.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  const saldoFinal = totalPagado - totalFinal;

  useEffect(() => {
    if (isModalOpen && pagosLineas.length === 0) {
      setPagosLineas([{
        id: generarIdLinea(),
        monto: totalFinal > 0 ? totalFinal : '',
        metodoPago: 'EFECTIVO',
        banco: '',
        numeroSerie: '',
        fechaCobro: '',
        fechaRecepcion: ''
      }]);
    }
  }, [isModalOpen, pagosLineas.length, totalFinal]);

  const addLineaPago = () => {
    setPagosLineas(prev => [...prev, {
      id: generarIdLinea(),
      monto: '',
      metodoPago: 'EFECTIVO',
      banco: '',
      numeroSerie: '',
      fechaCobro: '',
      fechaRecepcion: ''
    }]);
  };

  const updateLineaPago = (id, field, value) => {
    setPagosLineas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeLineaPago = (id) => {
    setPagosLineas(prev => prev.filter(p => p.id !== id));
  };
  const handleSubmit = async () => {
    if (!isClienteExpress && !clienteId) return pushToast('error', 'Seleccioná un cliente o usá el modo express');
    if (isClienteExpress && !clienteExpressData.nombre.trim()) return pushToast('error', 'Ingresá el nombre del cliente express');
    if (detalles.length === 0) return pushToast('error', 'Agregá al menos un producto a la venta');

    const pagosASubir = pagosLineas
      .filter(p => {
        const amt = parseFloat(p.monto);
        return amt && amt > 0;
      })
      .map(p => {
        const payloadPago = { monto: parseFloat(p.monto), metodoPago: p.metodoPago };
        if (p.metodoPago === 'CHEQUE') {
          payloadPago.banco = p.banco || null;
          payloadPago.numeroSerie = p.numeroSerie || null;
          payloadPago.fechaCobro = p.fechaCobro || null;
          payloadPago.fechaRecepcion = p.fechaRecepcion || null;
        }
        return payloadPago;
      });

    const payload = {
      clienteId: isClienteExpress ? null : parseInt(clienteId),
      clienteAdHoc: isClienteExpress ? clienteExpressData : null,
      porcentajeDescuento: descuentoVal,
      bandejasEntregadas: parseInt(bandejasEntregadas) || 0,
      detalles: detalles.map(d => ({
        productoId: d.productoId,
        cantidad: parseInt(d.cantidad) || 1
      })),
      pagos: pagosASubir
    };

    try {
      setIsSubmitting(true);
      await ventasApi.crearVenta(payload);
      pushToast('success', 'Venta registrada con éxito');

      // Guardar en recientes (Local Storage para UX)
      addRecent('recent_clients', payload.clienteId);
      payload.detalles.forEach(d => addRecent('recent_products', d.productoId));

      // Actualizar estados visuales de recientes
      setClientesRecientesIds(getRecents('recent_clients'));
      setProductosRecientesIds(getRecents('recent_products'));

      // Limpiar carrito (store persistido) y estado transitorio del modal
      clearCart();
      setBusquedaCliente('');
      setBusquedaProducto('');
      setIsClienteExpress(false);
      setClienteExpressData({ nombre: '', telefono: '', casual: true });
      setIsModalOpen(false);
      setPagosLineas([]);

      // Invalidar caches para que otras pantallas se actualicen
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    } catch (error) {
      const msg = error.response?.data?.message || 'Error al registrar la venta';
      pushToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Punto de Venta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Lado izquierdo: Buscadores */}
        <div className="lg:col-span-2 space-y-6 w-full">

          {/* Tarjeta Cliente */}
          <div className="bg-paper p-6 rounded-panel border border-line">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-accent" />
                1. Identificar Cliente
              </h2>
              {isHerramientas && (
                <button
                  type="button"
                  onClick={() => {
                    setIsClienteExpress(!isClienteExpress);
                    if (!isClienteExpress) setCliente('');
                  }}
                  className={`text-sm font-semibold px-3 py-1 rounded-base transition-colors border cursor-pointer ${
                    isClienteExpress
                      ? 'bg-accent-soft text-accent-ink border-accent'
                      : 'bg-paper text-muted border-line hover:bg-canvas'
                  }`}
                >
                  {isClienteExpress ? 'Volver a Agenda' : 'Cliente Express'}
                </button>
              )}
            </div>

            {isClienteExpress ? (
              <div className="p-4 bg-accent-soft border border-line rounded-panel space-y-4">
                <p className="text-sm text-accent-ink mb-2">Ingresá los datos para la factura. No es necesario buscar en la agenda.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-body mb-1">Nombre o Razón Social *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none bg-paper"
                      value={clienteExpressData.nombre}
                      onChange={(e) => setClienteExpressData({ ...clienteExpressData, nombre: e.target.value })}
                      placeholder="Ej: Consumidor Final"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body mb-1">Teléfono</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none bg-paper"
                      value={clienteExpressData.telefono}
                      onChange={(e) => setClienteExpressData({ ...clienteExpressData, telefono: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="casualCheckbox"
                    checked={clienteExpressData.casual}
                    onChange={(e) => setClienteExpressData({ ...clienteExpressData, casual: e.target.checked })}
                    className="w-4 h-4 text-accent border-line rounded focus:ring-accent cursor-pointer"
                  />
                  <label htmlFor="casualCheckbox" className="text-sm text-body">
                    Es cliente casual (no guardar en la agenda de clientes)
                  </label>
                </div>
              </div>
            ) : clienteId ? (
              <div className="p-4 bg-accent-soft border border-line rounded-panel flex justify-between items-center">
                <div>
                  <p className="text-xs text-accent-ink font-bold uppercase tracking-wider mb-1">Cliente Seleccionado</p>
                  <p className="font-bold text-lg text-ink">
                    {clientes.find(c => c.id === clienteId)?.nombreRazonSocial}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCliente('')}
                  className="px-4 py-2 bg-paper text-accent-ink hover:bg-accent-soft rounded-base text-sm font-semibold transition-colors cursor-pointer border border-line"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-faint" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscá por nombre, razón social o CUIT..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none mb-4"
                  />
                </div>

                <div className="space-y-2">
                  {busquedaCliente ? (
                    clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map(c => (
                        <div key={c.id} onClick={() => seleccionarCliente(c.id)} className="cursor-pointer p-3 hover:bg-canvas rounded-base border border-line transition-colors">
                          <p className="font-medium text-ink">{c.nombreRazonSocial}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted text-sm py-2">No se encontraron clientes.</p>
                    )
                  ) : clientesRecientes.length > 0 ? (
                    <div>
                      <p className="text-xs text-faint uppercase font-bold mb-3 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5"/> Últimos seleccionados
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clientesRecientes.map(c => (
                          <div key={c.id} onClick={() => seleccionarCliente(c.id)} className="cursor-pointer p-3 bg-canvas hover:bg-accent-soft hover:border-accent rounded-base border border-line transition-all">
                            <p className="font-medium text-ink text-sm truncate">{c.nombreRazonSocial}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted text-sm py-2">Buscá un cliente para empezar la venta.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta Productos */}
          <div className="bg-paper p-6 rounded-panel border border-line">
            <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent" />
              2. Agregar Productos
            </h2>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-faint" />
              </div>
              <input
                type="text"
                placeholder="Escribí el nombre de la planta, maceta o sustrato..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none mb-4"
              />
            </div>

            <div className="space-y-2">
              {busquedaProducto ? (
                productosFiltrados.length > 0 ? (
                  productosFiltrados.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-canvas rounded-base border border-line transition-colors">
                      <div>
                        <p className="font-medium text-ink">{prod.nombre}</p>
                        <p className="text-sm text-muted">Stock: {prod.stock} | Precio: ${prod.precio}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarProducto(prod)}
                        className="p-2 text-accent hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-sm py-2">No se encontraron productos.</p>
                )
              ) : productosRecientes.length > 0 ? (
                <div>
                  <p className="text-xs text-faint uppercase font-bold mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5"/> Agregados recientemente
                  </p>
                  {productosRecientes.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center p-3 bg-canvas hover:bg-thead rounded-base border border-line mb-2 transition-colors">
                      <div>
                        <p className="font-medium text-ink text-sm">{prod.nombre}</p>
                        <p className="text-xs text-muted">Stock: {prod.stock} | ${prod.precio}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarProducto(prod)}
                        className="p-1.5 text-muted hover:text-accent hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm py-2">Buscá productos para armar el carrito.</p>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Carrito y Totales */}
        {/* En desktop es sticky a la derecha, en mobile es un fixed drawer inferior/fullscreen */}
        <div className={`
          fixed inset-0 z-40 bg-paper flex flex-col transition-transform duration-300 ease-in-out
          ${isCartOpen ? 'translate-y-0' : 'translate-y-full'}
          lg:relative lg:translate-y-0 lg:bg-canvas lg:p-6 lg:rounded-panel lg:border lg:border-line lg:h-[calc(100vh-10rem)] lg:sticky lg:top-6 lg:z-auto
          p-4 pt-8
        `}>
          <div className="flex justify-between items-center mb-6 lg:mb-6">
            <h2 className="text-xl font-bold text-ink flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-accent" />
              Detalle de Venta
            </h2>
            <button
              className="lg:hidden text-muted hover:bg-canvas p-2 rounded-full cursor-pointer"
              onClick={() => setIsCartOpen(false)}
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {detalles.length === 0 ? (
              <div className="text-center text-faint mt-10">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              detalles.map(d => (
                <div key={d.productoId} className="bg-paper p-4 rounded-panel border border-line relative group">
                  <p className="font-semibold text-ink pr-8 leading-tight">{d.nombre}</p>
                  <p className="text-sm text-muted mb-3">${d.precio} x ud.</p>

                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={d.cantidad || ''}
                      onChange={(e) => modificarCantidad(d.productoId, e.target.value)}
                      className="w-20 px-2 py-1 text-center border border-line rounded-base focus:ring-2 focus:ring-accent font-mono tabular-nums"
                      min="1"
                      max={d.stock}
                    />
                    <span className="font-bold text-ink font-mono tabular-nums">${formatCurrency(d.precio * d.cantidad)}</span>
                  </div>

                  <button
                    onClick={() => eliminarDetalle(d.productoId)}
                    className="absolute top-3 right-3 text-danger hover:text-danger-ink opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <div className="flex justify-between items-center mb-6">
              <span className="text-muted font-medium">Total a cobrar:</span>
              <span className="text-3xl font-bold text-ink font-mono tabular-nums">${formatCurrency(totalCalculado)}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isSubmitting || detalles.length === 0 || (!clienteId && !isClienteExpress)}
              className="w-full bg-accent hover:brightness-95 text-paper font-bold py-4 rounded-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Venta <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>

      {/* FAB (Floating Action Button) para mobile */}
      {!isCartOpen && (
        <div className="lg:hidden fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-accent hover:brightness-95 text-paper p-4 rounded-full shadow-lg flex items-center gap-2 transition-transform transform active:scale-95 cursor-pointer"
          >
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              {detalles.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-paper text-accent-ink text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full font-mono tabular-nums">
                  {detalles.reduce((acc, d) => acc + (parseInt(d.cantidad) || 0), 0)}
                </span>
              )}
            </div>
            <span className="font-bold ml-1 font-mono tabular-nums">${formatCurrency(totalCalculado)}</span>
          </button>
        </div>
      )}

      {/* Modal de Liquidación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
          <div className="bg-paper rounded-none sm:rounded-panel border border-line-strong w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] p-4 sm:p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-ink mb-6">Liquidar Venta</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div className="space-y-4">
                <div className="bg-canvas p-4 rounded-panel border border-line">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-semibold text-ink font-mono tabular-nums">${formatCurrency(totalCalculado)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted">Descuento (%)</span>
                    <div className="flex items-center gap-2">
                      {descuentoMonto > 0 && <span className="text-sm text-muted font-mono tabular-nums">(-${formatCurrency(descuentoMonto)})</span>}
                      <FormattedNumberInput
                        id="descuento"
                        value={descuento}
                        onChange={val => setDescuento(val)}
                        className="w-20 px-2 py-1 text-right border border-line rounded focus:ring-accent font-mono tabular-nums"
                      />
                    </div>
                  </div>

              {unidadNegocioActiva !== '2' && (
                <div className="pt-4 border-t border-line flex justify-between items-center">
                  <span className="text-muted font-medium">Bandejas prestadas (opcional)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted font-medium">Cant:</span>
                    <FormattedNumberInput
                      id="bandejasEntregadas"
                      placeholder="0"
                      value={bandejasEntregadas}
                      onChange={(val) => setBandejasEntregadas(val)}
                      className="w-24 px-3 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none text-right font-semibold font-mono tabular-nums"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-line flex justify-between items-center text-lg">
                <span className="font-bold text-ink">Total a Pagar</span>
                    <span className="font-bold text-xl text-ink font-mono tabular-nums">${formatCurrency(totalFinal)}</span>
                  </div>
                </div>

                <div className={`p-4 rounded-panel border transition-colors ${saldoFinal < 0 ? 'bg-danger-bg border-danger-line' : saldoFinal > 0 ? 'bg-ok-bg border-ok-line' : 'bg-thead border-line'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${saldoFinal < 0 ? 'text-danger-ink' : saldoFinal > 0 ? 'text-ok-ink' : 'text-body'}`}>
                      {saldoFinal < 0 ? 'Deuda a CC:' : saldoFinal > 0 ? 'A favor en CC:' : 'Pago Exacto'}
                    </span>
                    {saldoFinal !== 0 && (
                      <span className="font-bold text-xl text-ink font-mono tabular-nums">
                        ${formatCurrency(Math.abs(saldoFinal))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-ink mb-2">Desglose de Pagos</h3>
                  <div className="flex flex-col gap-3">
                    {pagosLineas.map((linea, index) => (
                      <div key={linea.id} className="bg-paper p-3 rounded-panel border border-line">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <FormattedNumberInput
                            id={`monto-${linea.id}`}
                            placeholder="Monto"
                            value={linea.monto}
                            onChange={val => updateLineaPago(linea.id, 'monto', val)}
                            className="flex-1 w-full sm:w-auto px-3 py-2 border border-line rounded-base focus:ring-accent font-semibold font-mono tabular-nums"
                          />
                          <select
                            value={linea.metodoPago}
                            onChange={e => updateLineaPago(linea.id, 'metodoPago', e.target.value)}
                            className="w-full sm:w-32 shrink-0 px-2 py-2 border border-line rounded-base focus:ring-accent bg-canvas"
                          >
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                            <option value="CHEQUE">Cheque</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeLineaPago(linea.id)}
                            disabled={pagosLineas.length === 1}
                            className={`w-full sm:w-auto px-3 py-2 shrink-0 rounded-base flex items-center justify-center transition-colors cursor-pointer ${pagosLineas.length === 1 ? 'text-faint bg-thead cursor-not-allowed' : 'text-danger hover:bg-danger-bg hover:text-danger-ink'}`}
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-5 h-5"/>
                          </button>
                        </div>
                        {linea.metodoPago === 'CHEQUE' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3 pl-2 sm:border-l-2 sm:border-accent border-t-2 sm:border-t-0 pt-2 sm:pt-0 border-line">
                            <input type="text" placeholder="Banco" value={linea.banco} onChange={e => updateLineaPago(linea.id, 'banco', e.target.value)} className="px-2 py-1.5 border border-line rounded focus:ring-accent" />
                            <input type="text" placeholder="N° Serie" value={linea.numeroSerie} onChange={e => updateLineaPago(linea.id, 'numeroSerie', e.target.value)} className="px-2 py-1.5 border border-line rounded focus:ring-accent" />
                            <div className="flex flex-col">
                              <label className="text-[10px] text-muted font-semibold mb-0.5 ml-1">Fecha Emisión/Recepción</label>
                              <input type="date" value={linea.fechaRecepcion} onChange={e => updateLineaPago(linea.id, 'fechaRecepcion', e.target.value)} className="px-2 py-1.5 border border-line rounded focus:ring-accent" />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[10px] text-muted font-semibold mb-0.5 ml-1">Fecha de Cobro</label>
                              <input type="date" value={linea.fechaCobro} onChange={e => updateLineaPago(linea.id, 'fechaCobro', e.target.value)} className="px-2 py-1.5 border border-line rounded focus:ring-accent" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addLineaPago}
                      className="w-full py-3 border-2 border-dashed border-line bg-canvas rounded-panel text-muted font-medium hover:border-accent hover:text-accent-ink hover:bg-accent-soft transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-5 h-5"/> Añadir otro pago
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-6 py-2 border border-line rounded-panel text-body hover:bg-canvas font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-accent rounded-panel text-paper hover:brightness-95 font-bold flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
