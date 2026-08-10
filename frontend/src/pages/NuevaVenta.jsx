import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, Search, ArrowRight, Clock, UserCheck } from 'lucide-react';
import { clientesApi } from '../api/clientes.api';
import { productosApi } from '../api/productos.api';
import { ventasApi } from '../api/ventas.api';
import { useUIStore } from '../store/useUIStore';
import { useStockStore } from '../store/useStockStore';
import { useCartStore } from '../store/useCartStore';

// Utilidades para guardar "últimos usados" en LocalStorage
const getRecents = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const addRecent = (key, id) => {
  let recents = getRecents(key);
  // Eliminar si ya existe para ponerlo primero, y limitar a 5
  recents = [id, ...recents.filter(x => x !== id)].slice(0, 5);
  localStorage.setItem(key, JSON.stringify(recents));
};

export default function NuevaVenta() {
  const { pushToast } = useUIStore();
  
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [pagos, setPagos] = useState([]);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('EFECTIVO');

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
  const totalPagado = pagos.reduce((acc, p) => acc + p.monto, 0);
  const saldoFinal = totalPagado - totalFinal;

  const agregarPago = () => {
    const monto = parseFloat(pagoMonto);
    if (!monto || monto <= 0) return pushToast('error', 'Monto inválido');
    setPagos([...pagos, { monto, metodoPago: pagoMetodo }]);
    setPagoMonto('');
  };

  const eliminarPago = (index) => {
    setPagos(pagos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!clienteId) return pushToast('error', 'Seleccioná un cliente');
    if (detalles.length === 0) return pushToast('error', 'Agregá al menos un producto a la venta');

    let pagosASubir = [...pagos];
    const montoPendiente = parseFloat(pagoMonto);
    if (montoPendiente && montoPendiente > 0) {
      pagosASubir.push({ monto: montoPendiente, metodoPago: pagoMetodo });
    }

    const payload = {
      clienteId: parseInt(clienteId),
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
      setIsModalOpen(false);
      setPagos([]);
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
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Punto de Venta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado izquierdo: Buscadores */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta Cliente */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              1. Identificar Cliente
            </h2>
            
            {clienteId ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center shadow-inner">
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Cliente Seleccionado</p>
                  <p className="font-bold text-lg text-emerald-900">
                    {clientes.find(c => c.id === clienteId)?.nombreRazonSocial}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setCliente('')} 
                  className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer border border-emerald-200"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscá por nombre, razón social o CUIT..."
                    value={busquedaCliente}
                    onChange={(e) => setBusquedaCliente(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4 shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  {busquedaCliente ? (
                    clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map(c => (
                        <div key={c.id} onClick={() => seleccionarCliente(c.id)} className="cursor-pointer p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                          <p className="font-medium text-gray-900">{c.nombreRazonSocial}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm py-2">No se encontraron clientes.</p>
                    )
                  ) : clientesRecientes.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold mb-3 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5"/> Últimos seleccionados
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clientesRecientes.map(c => (
                          <div key={c.id} onClick={() => seleccionarCliente(c.id)} className="cursor-pointer p-3 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-200 rounded-lg border border-gray-100 transition-all">
                            <p className="font-medium text-gray-800 text-sm truncate">{c.nombreRazonSocial}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm py-2">Buscá un cliente para empezar la venta.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta Productos */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              2. Agregar Productos
            </h2>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Escribí el nombre de la planta, maceta o sustrato..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mb-4 shadow-sm"
              />
            </div>

            <div className="space-y-2">
              {busquedaProducto ? (
                productosFiltrados.length > 0 ? (
                  productosFiltrados.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">{prod.nombre}</p>
                        <p className="text-sm text-gray-500">Stock: {prod.stock} | Precio: ${prod.precio}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => agregarProducto(prod)}
                        className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm py-2">No se encontraron productos.</p>
                )
              ) : productosRecientes.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5"/> Agregados recientemente
                  </p>
                  {productosRecientes.map(prod => (
                    <div key={prod.id} className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 mb-2 transition-colors">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{prod.nombre}</p>
                        <p className="text-xs text-gray-500">Stock: {prod.stock} | ${prod.precio}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => agregarProducto(prod)}
                        className="p-1.5 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm py-2">Buscá productos para armar el carrito.</p>
              )}
            </div>
          </div>
        </div>

        {/* Lado derecho: Carrito y Totales */}
        <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-10rem)] sticky top-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            Detalle de Venta
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {detalles.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              detalles.map(d => (
                <div key={d.productoId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group">
                  <p className="font-semibold text-gray-800 pr-8 leading-tight">{d.nombre}</p>
                  <p className="text-sm text-gray-500 mb-3">${d.precio} x ud.</p>
                  
                  <div className="flex items-center justify-between">
                    <input 
                      type="number" 
                      value={d.cantidad || ''}
                      onChange={(e) => modificarCantidad(d.productoId, e.target.value)}
                      className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                      min="1"
                      max={d.stock}
                    />
                    <span className="font-bold text-gray-900">${(d.precio * d.cantidad).toFixed(2)}</span>
                  </div>
                  
                  <button 
                    onClick={() => eliminarDetalle(d.productoId)}
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-600 font-medium">Total a cobrar:</span>
              <span className="text-3xl font-bold text-gray-900">${totalCalculado.toFixed(2)}</span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={isSubmitting || detalles.length === 0 || !clienteId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar Venta <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal de Liquidación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Liquidar Venta</h2>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold text-gray-900">${totalCalculado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Descuento (%)</span>
                    <div className="flex items-center gap-2">
                      {descuentoMonto > 0 && <span className="text-sm text-gray-500">(-${descuentoMonto.toFixed(2)})</span>}
                      <input 
                        type="number" 
                        value={descuento}
                        onChange={e => setDescuento(e.target.value)}
                        className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:ring-emerald-500"
                      />
                    </div>
                  </div>

              {/* Bandejas */}
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-gray-600 font-medium">Bandejas prestadas (opcional)</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Cant:</span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={bandejasEntregadas}
                    onChange={(e) => setBandejasEntregadas(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-right font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-lg">
                <span className="font-bold text-gray-900">Total a Pagar</span>
                    <span className="font-bold text-xl text-emerald-700">${totalFinal.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Agregar Pago</h3>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      placeholder="Monto"
                      value={pagoMonto}
                      onChange={e => setPagoMonto(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500"
                    />
                    <select 
                      value={pagoMetodo}
                      onChange={e => setPagoMetodo(e.target.value)}
                      className="w-32 px-2 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                    <button 
                      onClick={agregarPago}
                      className="px-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                    >
                      <Plus className="w-5 h-5"/>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 min-h-[12rem]">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Pagos Ingresados</h3>
                  {pagos.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin pagos (queda en CC)</p>
                  ) : (
                    <ul className="space-y-2">
                      {pagos.map((p, i) => (
                        <li key={i} className="flex justify-between items-center text-sm bg-white p-2 border border-gray-100 rounded shadow-sm">
                          <span className="font-medium">{p.metodoPago}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 font-bold">${p.monto.toFixed(2)}</span>
                            <button onClick={() => eliminarPago(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={`p-4 rounded-xl border ${saldoFinal < 0 ? 'bg-red-50 border-red-200' : saldoFinal > 0 ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${saldoFinal < 0 ? 'text-red-700' : saldoFinal > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                      {saldoFinal < 0 ? 'Deuda a CC:' : saldoFinal > 0 ? 'A favor en CC:' : 'Pago Exacto'}
                    </span>
                    {saldoFinal !== 0 && (
                      <span className="font-bold text-xl">
                        ${Math.abs(saldoFinal).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-emerald-600 rounded-xl text-white hover:bg-emerald-700 font-bold flex items-center gap-2"
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
