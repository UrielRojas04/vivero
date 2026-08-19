import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertTriangle } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';
import { pedidosApi } from '../api/pedidos.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

// Un solo modal para dos casos (tarea 9.5 y 9.8 de tasks.md):
//  - Pedido PENDIENTE: formulario de confirmación de recepción, con la cantidad recibida
//    precargada con la cantidad pedida y editable, y el remanente resultante en vivo.
//  - Pedido COMPLETO/PARCIAL/CANCELADO: vista de sólo lectura con las tres cantidades por ítem
//    (pedida, recibida, pendiente) — no ofrece ninguna acción de edición/cancelación/reconfirmación
//    (tarea 9.9): el pedido es terminal.
const RecepcionPedidoModal = ({ pedido, isOpen, onClose, onConfirmed }) => {
  const { pushToast, askConfirm } = useUIStore();
  const [cantidades, setCantidades] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const esPendiente = pedido?.estado === 'PENDIENTE';

  useEffect(() => {
    if (isOpen && pedido) {
      // Precarga: cantidad recibida = cantidad pedida, editable por el usuario.
      const inicial = {};
      (pedido.detalles || []).forEach((d) => {
        inicial[d.id] = esPendiente ? String(d.cantidadPedida) : String(d.cantidadRecibida ?? '');
      });
      setCantidades(inicial);
    }
  }, [isOpen, pedido, esPendiente]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !pedido) return null;

  const handleCantidadChange = (detalleId, valor) => {
    setCantidades((prev) => ({ ...prev, [detalleId]: valor }));
  };

  const remanente = (detalle) => {
    const recibida = parseInt(cantidades[detalle.id], 10);
    if (isNaN(recibida)) return detalle.cantidadPedida;
    return Math.max(0, detalle.cantidadPedida - recibida);
  };

  const haySobrante = (pedido.detalles || []).some((d) => {
    const recibida = parseInt(cantidades[d.id], 10);
    return !isNaN(recibida) && recibida > d.cantidadPedida;
  });

  // Nombre a mostrar por línea: si es "pendiente de crear" (grupo 13 de tasks.md, producto
  // == null todavía) se muestra productoNombreNuevo; si no, el productoNombre normal.
  const nombreLinea = (d) => d.productoNombre || d.productoNombreNuevo;
  const esLineaPendiente = (d) => !d.productoNombre && !!d.productoNombreNuevo;

  const enviarConfirmacion = async () => {
    const items = (pedido.detalles || []).map((d) => ({
      detalleId: d.id,
      cantidadRecibida: parseInt(cantidades[d.id], 10),
    }));

    if (items.some((it) => isNaN(it.cantidadRecibida) || it.cantidadRecibida < 0)) {
      pushToast('error', 'Todas las cantidades recibidas deben ser números enteros mayores o iguales a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await pedidosApi.confirmarRecepcion(pedido.id, { items });
      pushToast('success', 'Recepción confirmada. El stock ya se actualizó.');
      onConfirmed?.();
      onClose();
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo confirmar la recepción.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tarea 13.10: si alguna línea pendiente se confirma con cantidad > 0, el mensaje deja claro
  // que eso da de alta un Producto nuevo en el catálogo — no es sólo un movimiento de stock.
  const hayAltaPendiente = (pedido.detalles || []).some((d) => {
    const recibida = parseInt(cantidades[d.id], 10);
    return esLineaPendiente(d) && !isNaN(recibida) && recibida > 0;
  });

  const handleConfirmarClick = () => {
    const resumen = (pedido.detalles || [])
      .map((d) => `${nombreLinea(d)}${esLineaPendiente(d) ? ' (nuevo)' : ''}: ${cantidades[d.id] || 0} de ${d.cantidadPedida}`)
      .join(' · ');

    const avisoAlta = hayAltaPendiente
      ? ' Los ítems marcados "(nuevo)" con cantidad mayor a cero van a dar de alta ese producto en el catálogo.'
      : '';

    askConfirm({
      title: 'Confirmar Recepción',
      message: (haySobrante
        ? `Vas a registrar: ${resumen}. Atención: algún ítem recibe MÁS cantidad de la pedida — esa diferencia se sumará igual al stock.`
        : `Vas a registrar: ${resumen}. El stock se actualiza inmediatamente y esta acción no se puede deshacer.`)
        + avisoAlta + ' ¿Confirmás?',
      variant: haySobrante ? 'warning' : 'danger',
      confirmLabel: 'Confirmar recepción',
      onConfirm: enviarConfirmacion,
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-2xl shadow-2xl flex flex-col max-h-screen sm:max-h-[95vh]">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-600 text-white sm:rounded-t-2xl">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackageCheck className="w-5 h-5" />
            {esPendiente ? 'Confirmar Recepción' : 'Detalle del Pedido'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-emerald-700 transition-colors text-white/90 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-sm text-gray-500">
            Proveedor: <span className="font-medium text-gray-800">{pedido.proveedorNombre}</span>
          </div>

          <div className="space-y-3">
            {(pedido.detalles || []).map((d) => (
              <div key={d.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  {nombreLinea(d)}
                  {esLineaPendiente(d) && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                      Nuevo — se crea al confirmar
                    </span>
                  )}
                </p>
                {esPendiente ? (
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Pedida</label>
                      <p className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg">{d.cantidadPedida}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Recibida</label>
                      <FormattedNumberInput
                        value={cantidades[d.id] ?? ''}
                        onChange={(val) => handleCantidadChange(d.id, val)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Pendiente</label>
                      <p className={`px-3 py-2 text-sm font-semibold rounded-lg border ${
                        remanente(d) > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      }`}>
                        {remanente(d)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Pedida</label>
                      <p className="text-sm font-medium text-gray-800">{d.cantidadPedida}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Recibida</label>
                      <p className="text-sm font-medium text-gray-800">{d.cantidadRecibida ?? '-'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Pendiente</label>
                      <p className={`text-sm font-semibold ${d.cantidadPendiente > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {d.cantidadPendiente ?? 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {esPendiente && haySobrante && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Hay ítems con cantidad recibida mayor a la pedida. Se aceptan y se suman igual al stock.</p>
            </div>
          )}
        </div>

        <div className="flex-none flex items-center justify-end gap-3 p-4 px-6 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {esPendiente ? 'Cancelar' : 'Cerrar'}
          </button>
          {esPendiente && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmarClick}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar Recepción'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecepcionPedidoModal;
