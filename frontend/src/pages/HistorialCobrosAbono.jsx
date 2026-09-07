import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Search, Calendar, Receipt, CreditCard, Eye, Loader2 } from 'lucide-react';
import { abonoApi } from '../api/abono.api';
import { ventasApi } from '../api/ventas.api';
import { useUIStore } from '../store/useUIStore';
import ComprobanteVentaModal from '../components/ComprobanteVentaModal';

const formatMonto = (monto) =>
  `$${(monto ?? 0).toLocaleString('es-AR')}`;

const formatFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleString('es-AR') : '-';

const OrigenCelda = ({ pago, onVerRemito, cargando }) => {
  if (pago.origen === 'VENTA') {
    return (
      <div className="flex items-center gap-1.5 text-body">
        <Receipt className="w-4 h-4 text-faint shrink-0" />
        <span>
          Venta #{pago.ventaId}
          {pago.fechaVenta && (
            <span className="text-muted"> · {new Date(pago.fechaVenta).toLocaleDateString('es-AR')}</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => onVerRemito(pago.ventaId)}
          disabled={cargando}
          title={`Ver remito de la venta #${pago.ventaId}`}
          className="p-1 text-muted hover:text-accent hover:bg-accent-soft rounded-base transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-body">
      <CreditCard className="w-4 h-4 text-faint shrink-0" />
      <span>Pago a cuenta corriente</span>
    </div>
  );
};

const EstadoBadge = ({ estado }) => {
  const esAcreditado = estado === 'ACREDITADO';
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        esAcreditado ? 'bg-accent-soft text-accent-ink' : 'bg-thead text-body'
      }`}
    >
      {estado}
    </span>
  );
};

const HistorialCobrosAbono = () => {
  const { pushToast } = useUIStore();

  const [page, setPage] = useState(0);
  const size = 20;
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [cargandoRemitoId, setCargandoRemitoId] = useState(null);

  const historialQuery = useQuery({
    queryKey: ['abono', 'cobros', { page, size, q, desde, hasta }],
    queryFn: () =>
      abonoApi.getHistorialCobros({ page, size, q: q || undefined, desde: desde || undefined, hasta: hasta || undefined })
        .then((res) => res.data),
  });

  useEffect(() => {
    if (!historialQuery.isError) return;
    pushToast('error', 'Error al cargar el historial de cobros.');
  }, [historialQuery.isError, pushToast]);

  const cambiarBusqueda = (valor) => {
    setQ(valor);
    setPage(0);
  };

  const cambiarDesde = (valor) => {
    setDesde(valor);
    setPage(0);
  };

  const cambiarHasta = (valor) => {
    setHasta(valor);
    setPage(0);
  };

  const verRemito = async (ventaId) => {
    setCargandoRemitoId(ventaId);
    try {
      const venta = await ventasApi.obtenerPorId(ventaId);
      setVentaSeleccionada(venta);
    } catch (error) {
      pushToast('error', 'No se pudo cargar el remito de esa venta.');
    } finally {
      setCargandoRemitoId(null);
    }
  };

  const pagos = historialQuery.data?.content ?? [];
  const totalPages = historialQuery.data?.totalPages ?? 0;

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <Wallet className="w-6 h-6 text-accent" />
          Historial de Cobros
        </h1>
        <p className="text-muted mt-1">Todos los cobros de Abono, de ambas cuentas, en un solo lugar.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => cambiarBusqueda(e.target.value)}
            placeholder="Buscar por cliente o número de venta…"
            className="w-full pl-9 pr-4 py-2 rounded-base border border-line bg-paper text-sm text-body placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-faint shrink-0" />
          <input
            type="date"
            value={desde}
            onChange={(e) => cambiarDesde(e.target.value)}
            className="border border-line rounded-base px-3 py-2 text-sm bg-paper text-body focus:ring-2 focus:ring-accent focus:border-accent"
          />
          <span className="text-muted text-sm">a</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => cambiarHasta(e.target.value)}
            className="border border-line rounded-base px-3 py-2 text-sm bg-paper text-body focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      <div className="bg-paper rounded-panel border border-line overflow-hidden">
        {historialQuery.isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : pagos.length === 0 ? (
          <div className="p-12 text-center text-muted">
            {q.trim() || desde || hasta
              ? 'No se encontraron cobros para los filtros aplicados.'
              : 'No hay cobros registrados todavía.'}
          </div>
        ) : (
          <>
            {/* Vista Mobile (Tarjetas) */}
            <div className="sm:hidden divide-y divide-line">
              {pagos.map((pago) => (
                <div key={pago.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-ink text-sm">{pago.clienteNombre}</h3>
                      <p className="text-xs text-muted">{formatFecha(pago.fecha)}</p>
                    </div>
                    <span className="font-mono tabular-nums font-semibold text-sm text-ink">
                      {formatMonto(pago.monto)}
                    </span>
                  </div>
                  <OrigenCelda pago={pago} onVerRemito={verRemito} cargando={cargandoRemitoId === pago.ventaId} />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted">Método:</span>
                    <span className="text-body font-medium">{pago.metodoPago}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted">Cobró:</span>
                    <span className="text-body font-medium">{pago.cobradoPor}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted">Estado:</span>
                    <EstadoBadge estado={pago.estado} />
                  </div>
                </div>
              ))}
            </div>

            {/* Vista Desktop (Tabla) */}
            {/* transform-gpu (fuerza su propia capa de composición GPU, transform: translate3d(0,0,0))
                -- bug conocido de Chromium: un contenedor con overflow-x-auto debajo de un modal
                con backdrop-blur (ComprobanteVentaModal, botón "ver remito" de la columna Origen)
                puede quedar mal compuesto y mostrar el contenido de la tabla como bloques
                borroneados en vez de un blur uniforme. Promoverlo a su propia capa evita que
                comparta composición con el blur del modal. */}
            <div className="hidden sm:block overflow-x-auto transform-gpu">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-thead border-b border-line text-sm text-muted uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Origen</th>
                    <th className="px-4 py-3 font-semibold text-right">Monto</th>
                    <th className="px-4 py-3 font-semibold">Método</th>
                    <th className="px-4 py-3 font-semibold text-center">Estado</th>
                    <th className="px-4 py-3 font-semibold">Cobró</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 text-sm text-body">{formatFecha(pago.fecha)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-ink">{pago.clienteNombre}</td>
                      <td className="px-4 py-3 text-sm">
                        <OrigenCelda pago={pago} onVerRemito={verRemito} cargando={cargandoRemitoId === pago.ventaId} />
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono tabular-nums font-semibold text-ink">
                        {formatMonto(pago.monto)}
                      </td>
                      <td className="px-4 py-3 text-sm text-body">{pago.metodoPago}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <EstadoBadge estado={pago.estado} />
                      </td>
                      <td className="px-4 py-3 text-sm text-body font-medium">{pago.cobradoPor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Paginador */}
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

      {ventaSeleccionada && (
        <ComprobanteVentaModal
          isOpen={!!ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
          venta={ventaSeleccionada}
        />
      )}
    </div>
  );
};

export default HistorialCobrosAbono;
