import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, AlertCircle, Loader2, Inbox } from 'lucide-react';
import { entregasApi } from '../api/entregas.api';
import ConfirmarEntregaModal from './ConfirmarEntregaModal';

// Change entregas-pendientes-confirmacion-vivero (tarea 15.1): tarjeta del Dashboard con las
// entregas PENDIENTE de Vivero, mismo patrón visual que BandejasDisponiblesList (TanStack Query,
// estados loading/error/vacío, mismas clases del sistema de diseño). No es la pantalla de listado
// completo, pero SÍ tiene que mostrar todo lo que haya -- la tabla ya scrollea internamente dentro
// de la tarjeta de altura fija (hallazgo de auditoría, finding #3: con size=10 fijo, una entrega
// pendiente #11 quedaba invisible sin ningún indicio de que existía). size=50 cubre cualquier
// backlog realista de un vivero chico; el conteo total en el header y el aviso de abajo son la red
// de seguridad si algún día se supera igual.
const formatFecha = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha).toLocaleString('es-AR');
};

const EntregasPendientesList = () => {
  const [entregaSeleccionadaId, setEntregaSeleccionadaId] = useState(null);
  const queryClient = useQueryClient();

  // Hallazgo de auditoría (finding #6, mitad no resuelta a propósito): no hay push en tiempo real
  // para "se registró una entrega nueva" -- sólo existe un evento SSE de STOCK_UPDATE (useStockEvents/
  // useStockStore), que SÍ dispara cuando se registra una entrega (registrar() descuenta stock por
  // línea), pero también dispara con CUALQUIER cambio de stock de cualquier unidad -- engancharse a
  // eso refrescaría esta tarjeta en cada venta del sistema, no sólo cuando hay una entrega nueva.
  // Construir un evento SSE dedicado es más de lo que este hallazgo (severidad baja) justifica.
  // TanStack Query ya refetchea al volver el foco a la pestaña (default), que cubre razonablemente
  // el uso real: el dueño mira el Dashboard, se va, vuelve.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['entregas-pendientes', 'PENDIENTE'],
    queryFn: () => entregasApi.listar('PENDIENTE', 0, 50),
  });

  const entregas = data?.content ?? [];
  const totalPendientes = data?.totalElements ?? entregas.length;
  const ocultasPorTope = totalPendientes - entregas.length;

  // Tras confirmar o rechazar (tarea 15.5): la lista de entregas siempre se invalida; el stock
  // se invalida best-effort en las claves conocidas que dependen de él (rechazar repone stock,
  // confirmar consume la venta ya descontada) -- si alguna no está montada en esta pantalla,
  // invalidateQueries de esa clave es simplemente un no-op inofensivo.
  const handleResolved = () => {
    queryClient.invalidateQueries({ queryKey: ['entregas-pendientes'] });
    // Hallazgo de auditoría (finding #6): faltaba invalidar esto -- si el empleado que registró
    // la entrega tiene "Mis entregas" abierto en otra pestaña, no veía el cambio de estado hasta
    // su próximo refetch espontáneo.
    queryClient.invalidateQueries({ queryKey: ['entregas-mias'] });
    queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
    queryClient.invalidateQueries({ queryKey: ['stock-critico'] });
    queryClient.invalidateQueries({ queryKey: ['stock-pie'] });
    queryClient.invalidateQueries({ queryKey: ['productos'] });
    queryClient.invalidateQueries({ queryKey: ['ventas'] });
  };

  if (isLoading) {
    return (
      <div className="bg-paper rounded-panel border border-line p-6 flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-paper rounded-panel border border-line p-6 flex flex-col items-center justify-center h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-error mb-4 opacity-80" />
        <h3 className="text-lg font-medium text-ink">Error al cargar datos</h3>
        <p className="text-sm text-muted">No se pudieron cargar las entregas pendientes.</p>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-panel border border-line p-6 flex flex-col h-[400px]">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
          <PackageCheck className="w-5 h-5 text-accent-ink" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">
            Entregas Pendientes{totalPendientes > 0 ? ` (${totalPendientes})` : ''}
          </h2>
          <p className="text-xs text-muted">Esperando precio y confirmación</p>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {entregas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Inbox className="w-12 h-12 text-muted mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-ink">Sin entregas pendientes</h3>
            <p className="text-sm text-muted">No hay entregas esperando confirmación.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-paper z-10">
                <th className="pb-3 text-xs font-semibold text-muted border-b border-line">Cliente</th>
                <th className="pb-3 text-xs font-semibold text-muted border-b border-line">Registró</th>
                <th className="pb-3 text-xs font-semibold text-muted border-b border-line text-right">Líneas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {entregas.map((entrega) => (
                <tr
                  key={entrega.id}
                  onClick={() => setEntregaSeleccionadaId(entrega.id)}
                  className="group hover:bg-surface/50 transition-colors cursor-pointer"
                >
                  <td className="py-3 pr-4">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-ink truncate max-w-[180px]" title={entrega.clienteNombre}>
                        {entrega.clienteNombre}
                      </p>
                      <span className="text-xs text-muted">{formatFecha(entrega.fecha)}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-body truncate">{entrega.usuarioRegistroNombre}</span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-sm font-bold text-ink">{entrega.cantidadLineas}</span>
                    <span className="text-xs text-muted"> ({entrega.cantidadTotalUnidades} u.)</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ocultasPorTope > 0 && (
        <p className="text-xs text-warn-ink text-center pt-2 shrink-0">
          +{ocultasPorTope} entrega{ocultasPorTope === 1 ? '' : 's'} más sin mostrar acá — resolvé algunas de la lista para ver el resto.
        </p>
      )}

      {entregaSeleccionadaId && (
        <ConfirmarEntregaModal
          entregaId={entregaSeleccionadaId}
          onClose={() => setEntregaSeleccionadaId(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
};

export default EntregasPendientesList;
