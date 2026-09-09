import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Clock,
  UserCheck,
  PackageCheck,
  Send,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { productosApi } from '../api/productos.api';
import { entregasApi } from '../api/entregas.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FirmaCanvas from '../components/FirmaCanvas';
import CrearClienteRapido from '../components/CrearClienteRapido';
import { useEntregaDraftStore } from '../store/useEntregaDraftStore';

// Change entregas-pendientes-confirmacion-vivero, tarea 14.1 (Decisión 14 de design.md): pantalla
// del empleado de Vivero para registrar que un cliente se llevó mercadería sin pagar todavía
// (una "entrega pendiente"), a resolver más tarde por el dueño (confirmar -> Venta, o rechazar ->
// repone stock). Reutiliza el "feel" del buscador de cliente/producto de NuevaVenta.jsx, pero con
// estado local propio (sin useCartStore -- ese store es del carrito persistido de Venta, no se
// toca acá) y sin las ramas de cliente casual/express: una entrega pendiente es crédito extendido
// a un cliente real de la agenda (Decisión 7 de design.md), nunca a un cliente ad-hoc.

// Mismo helper genérico de "últimos usados" que NuevaVenta.jsx, con claves de LocalStorage propias
// para no mezclar los recientes de esta pantalla con los del punto de venta.
const getRecents = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const addRecent = (key, id) => {
  let recents = getRecents(key);
  recents = [id, ...recents.filter((x) => x !== id)].slice(0, 5);
  localStorage.setItem(key, JSON.stringify(recents));
};

const RECENT_CLIENTS_KEY = 'recent_clients_entregas';
const RECENT_PRODUCTS_KEY = 'recent_products_entregas';

// Mismo criterio de tono que chequeDisplay.js/describirEstadoCheque: PENDIENTE (requiere
// atención) -> warn, CONFIRMADA (resuelta a favor) -> ok, RECHAZADA -> danger.
const TONOS_ESTADO = {
  PENDIENTE: 'bg-warn-bg text-warn-ink',
  CONFIRMADA: 'bg-ok-bg text-ok-ink',
  RECHAZADA: 'bg-danger-bg text-danger-ink',
};

const EstadoBadge = ({ estado }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TONOS_ESTADO[estado] || 'bg-thead text-body'}`}>
    {estado}
  </span>
);

const formatFecha = (fecha) => (fecha ? new Date(fecha).toLocaleString('es-AR') : '-');

export default function Entregas() {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();

  // Borrador persistido (sessionStorage): si el empleado cambia de sección a mitad de camino,
  // al volver a "Entregas" recupera cliente, líneas, observación y firma tal como las dejó, en
  // vez de tener que rehacer todo (pedido del dueño -- perder la firma en particular era muy
  // molesto porque hay que hacer firmar al cliente de nuevo).
  const { draft, guardarDraft } = useEntregaDraftStore();

  // ---- Cliente ----
  const [clientes, setClientes] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteId, setClienteId] = useState(draft?.clienteId ?? '');
  const [clientesRecientesIds, setClientesRecientesIds] = useState([]);

  // ---- Producto / líneas ----
  const [productos, setProductos] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [lineas, setLineas] = useState(draft?.lineas ?? []); // { productoId, nombre, cantidad, stock }
  const [productosRecientesIds, setProductosRecientesIds] = useState([]);

  // ---- Firma y observación ----
  const firmaRef = useRef(null);
  const [firmaActual, setFirmaActual] = useState(draft?.firmaBase64 ?? null);
  const [observacion, setObservacion] = useState(draft?.observacion ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincroniza el borrador en cada cambio -- sobrevive a cambiar de sección o refrescar la
  // página, pero se limpia solo cuando el registro se envía con éxito (ver handleSubmit).
  useEffect(() => {
    guardarDraft({ clienteId, lineas, observacion, firmaBase64: firmaActual });
  }, [clienteId, lineas, observacion, firmaActual, guardarDraft]);

  // ---- "Mis entregas" (paginado) ----
  const [page, setPage] = useState(0);
  const misEntregasQuery = useQuery({
    queryKey: ['entregas-mias', page],
    queryFn: () => entregasApi.listarMias(page, 20),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientesData, productosData] = await Promise.all([
          clientesApi.getAll(),
          productosApi.getAll(),
        ]);
        setClientes(clientesData);
        setProductos(productosData);
      } catch (error) {
        if (error.response && error.response.status === 403) {
          pushToast('error', 'Permisos insuficientes. Necesitás poder leer clientes y stock para registrar entregas.');
        } else {
          pushToast('error', 'Error al cargar clientes y productos.');
        }
      }
    };
    fetchData();

    setClientesRecientesIds(getRecents(RECENT_CLIENTS_KEY));
    setProductosRecientesIds(getRecents(RECENT_PRODUCTS_KEY));
  }, []);

  // ---- Filtros cliente ----
  const clientesFiltrados = busquedaCliente
    ? clientes.filter((c) => c.nombreRazonSocial.toLowerCase().includes(busquedaCliente.toLowerCase())).slice(0, 5)
    : [];
  const clientesRecientes = clientesRecientesIds.map((id) => clientes.find((c) => c.id === id)).filter(Boolean);
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  // ---- Filtros producto ----
  const productosFiltrados = busquedaProducto
    ? productos
        .filter((p) => {
          const q = busquedaProducto.toLowerCase();
          return (
            p.nombre.toLowerCase().includes(q) ||
            (p.categoriaAbonoNombre && p.categoriaAbonoNombre.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
    : [];
  const productosRecientes = productosRecientesIds.map((id) => productos.find((p) => p.id === id)).filter(Boolean);

  // ---- Acciones cliente ----
  const seleccionarCliente = (id) => {
    setClienteId(id);
    setBusquedaCliente('');
  };

  const clienteCreadoAlVuelo = (cliente) => {
    setClientes((prev) => [...prev, cliente]);
    setClienteId(cliente.id);
    setBusquedaCliente('');
  };

  // ---- Acciones producto / líneas ----
  const agregarProducto = (producto) => {
    if (producto.stock <= 0) {
      return pushToast('error', `El producto ${producto.nombre} no tiene stock disponible.`);
    }

    const existente = lineas.find((l) => l.productoId === producto.id);
    if (existente) {
      if (existente.cantidad >= existente.stock) {
        return pushToast('error', `Stock insuficiente. El máximo de ${producto.nombre} es ${existente.stock}.`);
      }
      setLineas((prev) =>
        prev.map((l) => (l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l))
      );
    } else {
      setLineas((prev) => [
        ...prev,
        { productoId: producto.id, nombre: producto.nombre, cantidad: 1, stock: producto.stock },
      ]);
    }
    setBusquedaProducto('');
  };

  const modificarCantidad = (productoId, cantidadStr) => {
    if (cantidadStr === '') {
      setLineas((prev) => prev.map((l) => (l.productoId === productoId ? { ...l, cantidad: '' } : l)));
      return;
    }

    const cant = parseInt(cantidadStr, 10);
    if (isNaN(cant) || cant <= 0) {
      setLineas((prev) => prev.map((l) => (l.productoId === productoId ? { ...l, cantidad: 1 } : l)));
      return;
    }

    const linea = lineas.find((l) => l.productoId === productoId);
    if (!linea) return;

    if (cant > linea.stock) {
      pushToast('error', `Stock máximo superado. Se ajustó a ${linea.stock}.`);
      setLineas((prev) => prev.map((l) => (l.productoId === productoId ? { ...l, cantidad: linea.stock } : l)));
      return;
    }

    setLineas((prev) => prev.map((l) => (l.productoId === productoId ? { ...l, cantidad: cant } : l)));
  };

  const eliminarLinea = (productoId) => {
    setLineas((prev) => prev.filter((l) => l.productoId !== productoId));
  };

  const totalUnidades = lineas.reduce((acc, l) => acc + (parseInt(l.cantidad) || 0), 0);

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!clienteId) return pushToast('error', 'Seleccioná un cliente.');
    if (lineas.length === 0) return pushToast('error', 'Agregá al menos un producto.');

    const lineaInvalida = lineas.find((l) => {
      const cant = l.cantidad === '' ? NaN : Number(l.cantidad);
      return isNaN(cant) || cant <= 0;
    });
    if (lineaInvalida) {
      return pushToast('error', `La cantidad de "${lineaInvalida.nombre}" no puede estar vacía ni ser menor o igual a cero.`);
    }

    if (!firmaRef.current || firmaRef.current.estaVacio()) {
      return pushToast('error', 'Falta la firma del cliente.');
    }

    const payload = {
      clienteId: parseInt(clienteId, 10),
      observacion: observacion.trim() || null,
      firmaBase64: firmaRef.current.toDataURL(),
      detalles: lineas.map((l) => ({ productoId: l.productoId, cantidad: Number(l.cantidad) })),
    };

    try {
      setIsSubmitting(true);
      await entregasApi.registrar(payload);
      pushToast('success', 'Entrega registrada.');

      addRecent(RECENT_CLIENTS_KEY, payload.clienteId);
      payload.detalles.forEach((d) => addRecent(RECENT_PRODUCTS_KEY, d.productoId));
      setClientesRecientesIds(getRecents(RECENT_CLIENTS_KEY));
      setProductosRecientesIds(getRecents(RECENT_PRODUCTS_KEY));

      setClienteId('');
      setBusquedaCliente('');
      setLineas([]);
      setBusquedaProducto('');
      setObservacion('');
      firmaRef.current.limpiar();
      setFirmaActual(null);

      queryClient.invalidateQueries({ queryKey: ['entregas-mias'] });
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al registrar la entrega.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const entregas = misEntregasQuery.data?.content ?? [];
  const totalPages = misEntregasQuery.data?.totalPages ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <PackageCheck className="w-7 h-7 text-accent" />
          Entregas
        </h1>
        <p className="text-muted mt-1">Registrá mercadería que se lleva un cliente sin pagar todavía.</p>
      </div>

      {/* Tarjeta Cliente */}
      <div className="bg-paper p-6 rounded-panel border border-line">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-accent" />
          1. Cliente
        </h2>

        {clienteSeleccionado ? (
          <div className="p-4 bg-accent-soft border border-line rounded-panel flex justify-between items-center">
            <div>
              <p className="text-xs text-accent-ink font-bold uppercase tracking-wider mb-1">Cliente seleccionado</p>
              <p className="font-bold text-lg text-ink">{clienteSeleccionado.nombreRazonSocial}</p>
            </div>
            <button
              type="button"
              onClick={() => setClienteId('')}
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
                placeholder="Buscá por nombre o razón social..."
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none mb-4"
              />
            </div>

            <div className="space-y-2">
              {busquedaCliente ? (
                clientesFiltrados.length > 0 ? (
                  clientesFiltrados.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => seleccionarCliente(c.id)}
                      className="cursor-pointer p-3 hover:bg-canvas rounded-base border border-line transition-colors"
                    >
                      <p className="font-medium text-ink">{c.nombreRazonSocial}</p>
                    </div>
                  ))
                ) : (
                  <div className="border border-line rounded-base overflow-hidden">
                    <p className="px-4 py-2 text-sm text-muted">No se encontraron clientes.</p>
                    <CrearClienteRapido nombre={busquedaCliente} onCreado={clienteCreadoAlVuelo} />
                  </div>
                )
              ) : clientesRecientes.length > 0 ? (
                <div>
                  <p className="text-xs text-faint uppercase font-bold mb-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Últimos seleccionados
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clientesRecientes.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => seleccionarCliente(c.id)}
                        className="cursor-pointer p-3 bg-canvas hover:bg-accent-soft hover:border-accent rounded-base border border-line transition-all"
                      >
                        <p className="font-medium text-ink text-sm truncate">{c.nombreRazonSocial}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted text-sm py-2">Buscá un cliente para empezar.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta Productos */}
      <div className="bg-paper p-6 rounded-panel border border-line">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-accent" />
          2. Productos
        </h2>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-faint" />
          </div>
          <input
            type="text"
            placeholder="Escribí el nombre del producto..."
            value={busquedaProducto}
            onChange={(e) => setBusquedaProducto(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none mb-4"
          />
        </div>

        <div className="space-y-2 mb-4">
          {busquedaProducto ? (
            productosFiltrados.length > 0 ? (
              productosFiltrados.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => agregarProducto(prod)}
                  className="flex justify-between items-center p-3 hover:bg-canvas rounded-base border border-line transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-ink">{prod.nombre}</p>
                    <p className="text-sm text-muted">Stock: {prod.stock}</p>
                  </div>
                  <span className="p-2 text-accent rounded-base">
                    <Plus className="w-5 h-5" />
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm py-2">No se encontraron productos.</p>
            )
          ) : productosRecientes.length > 0 ? (
            <div>
              <p className="text-xs text-faint uppercase font-bold mb-3 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Agregados recientemente
              </p>
              {productosRecientes.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => agregarProducto(prod)}
                  className="flex justify-between items-center p-3 bg-canvas hover:bg-thead rounded-base border border-line mb-2 transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-ink text-sm">{prod.nombre}</p>
                    <p className="text-xs text-muted">Stock: {prod.stock}</p>
                  </div>
                  <span className="p-1.5 text-muted rounded-base">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm py-2">Buscá productos para agregarlos a la entrega.</p>
          )}
        </div>

        {/* Líneas agregadas */}
        {lineas.length > 0 && (
          <div className="border-t border-line pt-4 space-y-2">
            <p className="text-xs text-faint uppercase font-bold mb-1">Líneas de la entrega</p>
            {lineas.map((l) => (
              <div key={l.productoId} className="flex items-center justify-between gap-3 p-3 bg-canvas rounded-base border border-line">
                <p className="font-medium text-ink flex-1 min-w-0 truncate">{l.nombre}</p>
                <input
                  type="number"
                  value={l.cantidad}
                  onChange={(e) => modificarCantidad(l.productoId, e.target.value)}
                  className="w-20 px-2 py-1 text-center border border-line rounded-base focus:ring-2 focus:ring-accent font-mono tabular-nums bg-paper"
                  min="1"
                  max={l.stock}
                />
                <button
                  type="button"
                  onClick={() => eliminarLinea(l.productoId)}
                  className="text-danger hover:text-danger-ink cursor-pointer p-1 shrink-0"
                  title="Quitar línea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-sm text-muted text-right pt-1">Total de unidades: <span className="font-semibold text-ink font-mono tabular-nums">{totalUnidades}</span></p>
          </div>
        )}
      </div>

      {/* Tarjeta Firma y observación */}
      <div className="bg-paper p-6 rounded-panel border border-line space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-ink mb-4">3. Firma del cliente</h2>
          <FirmaCanvas ref={firmaRef} onChange={setFirmaActual} imagenInicial={draft?.firmaBase64 ?? null} />
        </div>

        <div>
          <label className="block text-sm font-medium text-body mb-1">Observación (opcional)</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Alguna aclaración sobre esta entrega..."
            className="w-full px-3 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none bg-canvas resize-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-accent hover:brightness-95 text-paper font-bold py-4 rounded-base transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Registrando...' : (
            <>
              Registrar entrega <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Mis entregas */}
      <div className="bg-paper rounded-panel border border-line overflow-hidden">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-semibold text-ink">Mis entregas</h2>
          <p className="text-muted text-sm mt-1">Las entregas que registraste, con su estado actual.</p>
        </div>

        <div className="p-6">
          {misEntregasQuery.isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : entregas.length === 0 ? (
            <div className="p-8 text-center text-muted">Todavía no registraste ninguna entrega.</div>
          ) : (
            <>
              {/* Vista mobile (tarjetas) */}
              <div className="sm:hidden divide-y divide-line -mx-6 -mb-6">
                {entregas.map((e) => (
                  <div key={e.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-ink text-sm truncate">{e.clienteNombre}</h3>
                        <p className="text-xs text-muted">{formatFecha(e.fecha)}</p>
                      </div>
                      <EstadoBadge estado={e.estado} />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted">Líneas / Unidades:</span>
                      <span className="text-body font-medium">{e.cantidadLineas} / {e.cantidadTotalUnidades}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop (tabla) */}
              <div className="hidden sm:block overflow-x-auto -mx-6 -mb-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-thead border-b border-line text-sm text-muted uppercase tracking-wider">
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Cliente</th>
                      <th className="px-4 py-3 font-semibold text-center">Líneas</th>
                      <th className="px-4 py-3 font-semibold text-center">Unidades</th>
                      <th className="px-4 py-3 font-semibold text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {entregas.map((e) => (
                      <tr key={e.id} className="hover:bg-canvas transition-colors">
                        <td className="px-4 py-3 text-sm text-body">{formatFecha(e.fecha)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-ink">{e.clienteNombre}</td>
                        <td className="px-4 py-3 text-sm text-center font-mono tabular-nums text-body">{e.cantidadLineas}</td>
                        <td className="px-4 py-3 text-sm text-center font-mono tabular-nums text-body">{e.cantidadTotalUnidades}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <EstadoBadge estado={e.estado} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-line flex items-center justify-between bg-thead/30">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-sm font-medium text-muted">
              Página {page + 1} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
