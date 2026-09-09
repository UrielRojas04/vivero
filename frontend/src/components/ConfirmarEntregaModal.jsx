import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, PackageCheck, Ban, Trash2, Plus, User, Calendar, FileText, PenTool, AlertTriangle } from 'lucide-react';
import { entregasApi } from '../api/entregas.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';

// crypto.randomUUID() requiere un contexto seguro (HTTPS o localhost). Mismo fallback que usa
// NuevaVenta.jsx para las líneas de pago -- copiado localmente porque este modal no importa nada
// de NuevaVenta.jsx (Non-Goal del change: es estado propio, separado del carrito de venta).
const generarIdLinea = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `linea-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const formatCurrency = (value) => Number(value ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatFecha = (fecha) => (fecha ? new Date(fecha).toLocaleString('es-AR') : '');

const nuevaLineaPago = (monto = '') => ({
  id: generarIdLinea(),
  monto,
  metodoPago: 'EFECTIVO',
  banco: '',
  numeroSerie: '',
  fechaCobro: '',
  fechaRecepcion: '',
});

// Change entregas-pendientes-confirmacion-vivero (tarea 15.3/15.4): modal del dueño para asignar
// precio por línea y confirmar (crea la venta real) o rechazar (repone stock) una entrega. Las
// líneas vienen fijas de la entrega -- no hay carrito, sólo el precio por unidad es editable
// (Non-Goal: no se toca useCartStore.js ni NuevaVenta.jsx).
const ConfirmarEntregaModal = ({ entregaId, onClose, onResolved }) => {
  const { pushToast, askConfirm } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [entrega, setEntrega] = useState(null);
  const [firma, setFirma] = useState('');
  const [precios, setPrecios] = useState({});
  const [descuento, setDescuento] = useState('');
  const [pagosLineas, setPagosLineas] = useState([]);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    Promise.all([entregasApi.obtenerPorId(entregaId), entregasApi.obtenerFirma(entregaId)])
      .then(([entregaData, firmaData]) => {
        if (cancelado) return;
        setEntrega(entregaData);
        setFirma(firmaData?.firmaBase64 ?? '');
        const preciosIniciales = {};
        (entregaData.detalles ?? []).forEach((d) => {
          preciosIniciales[d.detalleId] = d.precioListaActual ?? 0;
        });
        setPrecios(preciosIniciales);
      })
      .catch((err) => {
        if (cancelado) return;
        pushToast('error', getErrorMessage(err, 'No se pudo cargar la entrega.'));
        onClose();
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregaId]);

  // Hallazgo de auditoría (finding #2): si el dueño tiene dos pestañas abiertas, o la tarjeta del
  // Dashboard quedó con una entrega ya resuelta por la otra pestaña, evitamos que llene todo el
  // formulario de precios para recién enterarse con un error crudo del backend al confirmar --
  // se detecta acá, apenas carga, y se reemplaza el formulario por un aviso.
  const yaResuelta = entrega != null && entrega.estado !== 'PENDIENTE';

  const detalles = entrega?.detalles ?? [];

  const subtotal = detalles.reduce((acc, d) => {
    const precio = Number(precios[d.detalleId]);
    return acc + (isNaN(precio) ? 0 : precio * d.cantidad);
  }, 0);
  const descuentoVal = parseFloat(descuento) || 0;
  const descuentoMonto = subtotal * (descuentoVal / 100);
  const totalFinal = subtotal - descuentoMonto;
  const totalPagado = pagosLineas.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  const saldoFinal = totalPagado - totalFinal;

  // Primera línea de pago, prefilada con el total (mismo criterio de conveniencia que
  // "Liquidar Venta" en NuevaVenta.jsx) una vez que la entrega y sus precios iniciales ya están
  // cargados -- por eso depende de `entrega`, no de `precios`: ambos se setean juntos en el mismo
  // .then() de arriba, así que al momento de correr este efecto `totalFinal` ya los refleja.
  useEffect(() => {
    if (entrega && pagosLineas.length === 0) {
      setPagosLineas([nuevaLineaPago(totalFinal > 0 ? totalFinal : '')]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrega]);

  // Re-sincroniza el monto auto-completado si el dueño edita un precio o el descuento y sigue
  // habiendo una sola línea de pago sin tocar a mano (mismo patrón que NuevaVenta.jsx).
  const totalFinalAnteriorRef = useRef(totalFinal);
  useEffect(() => {
    const totalAnterior = totalFinalAnteriorRef.current;
    totalFinalAnteriorRef.current = totalFinal;

    if (!entrega || pagosLineas.length !== 1) return;

    const montoActual = parseFloat(pagosLineas[0].monto);
    const siguioAlAutocompletado = !isNaN(montoActual) && Math.abs(montoActual - totalAnterior) < 0.005;
    if (siguioAlAutocompletado && Math.abs(totalFinal - totalAnterior) >= 0.005) {
      updateLineaPago(pagosLineas[0].id, 'monto', totalFinal > 0 ? totalFinal : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFinal]);

  const updatePrecio = (detalleId, value) => {
    setPrecios((prev) => ({ ...prev, [detalleId]: value }));
  };

  const addLineaPago = () => {
    setPagosLineas((prev) => [...prev, nuevaLineaPago()]);
  };

  const updateLineaPago = (id, field, value) => {
    setPagosLineas((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeLineaPago = (id) => {
    setPagosLineas((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConfirmar = async () => {
    if (!entrega) return;

    const lineaInvalida = detalles.find((d) => {
      const precio = precios[d.detalleId];
      if (precio === '' || precio === null || precio === undefined) return true;
      const num = Number(precio);
      return isNaN(num) || num < 0;
    });
    if (lineaInvalida) {
      pushToast('error', `El precio de "${lineaInvalida.productoNombre}" no puede estar vacío ni ser negativo.`);
      return;
    }

    const pagosASubir = pagosLineas
      .filter((p) => {
        const amt = parseFloat(p.monto);
        return amt && amt > 0;
      })
      .map((p) => {
        const payloadPago = { monto: parseFloat(p.monto), metodoPago: p.metodoPago };
        if (p.metodoPago === 'CHEQUE') {
          payloadPago.banco = p.banco || null;
          payloadPago.numeroSerie = p.numeroSerie || null;
          payloadPago.fechaCobro = p.fechaCobro || null;
          payloadPago.fechaRecepcion = p.fechaRecepcion || null;
        }
        return payloadPago;
      });

    if (pagosASubir.some((p) => p.metodoPago === 'CHEQUE' && p.numeroSerie && p.numeroSerie.length !== 8)) {
      pushToast('error', 'El número de cheque debe tener exactamente 8 dígitos.');
      return;
    }

    const payload = {
      porcentajeDescuento: descuentoVal,
      lineas: detalles.map((d) => ({ detalleId: d.detalleId, precioUnitario: Number(precios[d.detalleId]) })),
      pagos: pagosASubir,
    };

    setIsSubmitting(true);
    try {
      await entregasApi.confirmar(entregaId, payload);
      pushToast('success', 'Entrega confirmada.');
      onResolved();
      onClose();
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo confirmar la entrega.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRechazar = () => {
    askConfirm({
      title: 'Rechazar entrega',
      message: 'Se repondrá el stock de esta entrega. ¿Confirmás?',
      variant: 'danger',
      confirmLabel: 'Rechazar',
      onConfirm: async () => {
        setIsRejecting(true);
        try {
          await entregasApi.rechazar(entregaId, { motivo: motivoRechazo.trim() || undefined });
          pushToast('success', 'Entrega rechazada, stock repuesto.');
          onResolved();
          onClose();
        } catch (err) {
          pushToast('error', getErrorMessage(err, 'No se pudo rechazar la entrega.'));
        } finally {
          setIsRejecting(false);
        }
      },
    });
  };

  const isBusy = isSubmitting || isRejecting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-paper w-full h-full sm:h-auto max-w-4xl rounded-none sm:rounded-panel border border-line-strong flex flex-col max-h-screen sm:max-h-[90vh]">
        <div className="flex-none flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft rounded-base">
              <PackageCheck className="w-5 h-5 text-accent-ink" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Confirmar entrega</h2>
              <p className="text-sm text-muted">Asigná el precio de cada línea antes de confirmar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="p-2 text-faint hover:text-body hover:bg-canvas rounded-base transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !entrega ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-body">
                  <User className="w-4 h-4 text-muted shrink-0" />
                  <span className="font-medium text-ink">{entrega.clienteNombre}</span>
                </div>
                <div className="flex items-center gap-2 text-body">
                  <Calendar className="w-4 h-4 text-muted shrink-0" />
                  <span>{formatFecha(entrega.fecha)}</span>
                </div>
                <p className="text-xs text-muted">Registró: {entrega.usuarioRegistroNombre}</p>
                {entrega.observacion && (
                  <div className="flex items-start gap-2 text-body">
                    <FileText className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    <span className="text-sm">{entrega.observacion}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
                  <PenTool className="w-3.5 h-3.5" />
                  Firma del cliente
                </p>
                <div className="border border-line rounded-base bg-white p-2 flex items-center justify-center h-28 shadow-inner">
                  {firma ? (
                    <img src={firma} alt="Firma del cliente" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted">Sin firma</span>
                  )}
                </div>
              </div>
            </div>

            {yaResuelta ? (
              <div className="p-4 rounded-panel border border-warn-line bg-warn-bg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warn-ink shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-warn-ink">
                    Esta entrega ya fue {entrega.estado === 'CONFIRMADA' ? 'confirmada' : 'rechazada'}.
                  </p>
                  <p className="text-sm text-warn-ink/80 mt-1">
                    {entrega.estado === 'CONFIRMADA'
                      ? `Otro usuario ya la confirmó${entrega.usuarioResolucionNombre ? ` (${entrega.usuarioResolucionNombre})` : ''}. Ya se generó la venta correspondiente.`
                      : `Otro usuario ya la rechazó${entrega.usuarioResolucionNombre ? ` (${entrega.usuarioResolucionNombre})` : ''}.${entrega.motivoRechazo ? ` Motivo: "${entrega.motivoRechazo}"` : ''}`}
                  </p>
                </div>
              </div>
            ) : (
            <>
            <div className="bg-canvas p-4 rounded-panel border border-line space-y-3 mb-4">
              <h3 className="font-semibold text-ink text-sm">Productos</h3>
              {detalles.map((d) => {
                const precio = precios[d.detalleId];
                const subtotalLinea = (Number(precio) || 0) * d.cantidad;
                return (
                  <div key={d.detalleId} className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3 border-b border-line last:border-b-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">{d.productoNombre}</p>
                      <p className="text-xs text-muted">
                        x{d.cantidad}
                        {d.precioListaActual !== null && d.precioListaActual !== undefined && (
                          <span className="ml-2 text-accent-ink">Lista: ${formatCurrency(d.precioListaActual)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <FormattedNumberInput
                        id={`precio-detalle-${d.detalleId}`}
                        value={precio}
                        onChange={(val) => updatePrecio(d.detalleId, val)}
                        decimales={0}
                        className="w-24 px-2 py-1 text-right border border-line rounded-base focus:ring-2 focus:ring-accent font-mono tabular-nums"
                      />
                      <span className="w-20 text-right font-semibold text-ink font-mono tabular-nums text-sm">
                        ${formatCurrency(subtotalLinea)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-canvas p-4 rounded-panel border border-line">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-semibold text-ink font-mono tabular-nums">${formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted">Descuento (%)</span>
                    <div className="flex items-center gap-2">
                      {descuentoMonto > 0 && <span className="text-sm text-muted font-mono tabular-nums">(-${formatCurrency(descuentoMonto)})</span>}
                      <FormattedNumberInput
                        id="descuento-entrega"
                        value={descuento}
                        onChange={(val) => setDescuento(val)}
                        className="w-20 px-2 py-1 text-right border border-line rounded focus:ring-accent font-mono tabular-nums"
                      />
                    </div>
                  </div>
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
                    {pagosLineas.map((linea) => (
                      <div key={linea.id} className="bg-paper p-3 rounded-panel border border-line">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <FormattedNumberInput
                            id={`monto-entrega-${linea.id}`}
                            placeholder="Monto"
                            value={linea.monto}
                            onChange={(val) => updateLineaPago(linea.id, 'monto', val)}
                            decimales={0}
                            className="flex-1 min-w-0 w-full sm:w-auto px-3 py-2 border border-line rounded-base focus:ring-accent font-semibold font-mono tabular-nums"
                          />
                          <select
                            value={linea.metodoPago}
                            onChange={(e) => updateLineaPago(linea.id, 'metodoPago', e.target.value)}
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
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        {linea.metodoPago === 'CHEQUE' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3 pl-2 sm:border-l-2 sm:border-accent border-t-2 sm:border-t-0 pt-2 sm:pt-0 border-line">
                            <input
                              type="text"
                              placeholder="Banco"
                              value={linea.banco}
                              onChange={(e) => updateLineaPago(linea.id, 'banco', e.target.value)}
                              className="px-2 py-1.5 border border-line rounded focus:ring-accent"
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="N° Serie (8 dígitos)"
                              value={linea.numeroSerie}
                              onChange={(e) => updateLineaPago(linea.id, 'numeroSerie', e.target.value.replace(/\D/g, '').slice(0, 8))}
                              className="px-2 py-1.5 border border-line rounded focus:ring-accent"
                            />
                            <div className="flex flex-col">
                              <label className="text-[10px] text-muted font-semibold mb-0.5 ml-1">Fecha Emisión/Recepción</label>
                              <input
                                type="date"
                                value={linea.fechaRecepcion}
                                onChange={(e) => updateLineaPago(linea.id, 'fechaRecepcion', e.target.value)}
                                className="px-2 py-1.5 border border-line rounded focus:ring-accent"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-[10px] text-muted font-semibold mb-0.5 ml-1">Fecha de Cobro</label>
                              <input
                                type="date"
                                value={linea.fechaCobro}
                                onChange={(e) => updateLineaPago(linea.id, 'fechaCobro', e.target.value)}
                                className="px-2 py-1.5 border border-line rounded focus:ring-accent"
                              />
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
                      <Plus className="w-5 h-5" /> Añadir otro pago
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-panel border border-dashed border-line bg-canvas">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Motivo de rechazo <span className="font-normal text-faint">(sólo si vas a rechazar)</span>
              </label>
              <input
                type="text"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Ej: el cliente canceló el pedido"
                disabled={isBusy}
                className="w-full px-3 py-2 border border-line rounded-base bg-paper focus:ring-2 focus:ring-accent outline-none"
              />
            </div>
            </>
            )}
          </div>
        )}

        {!loading && entrega && !yaResuelta && (
          <div className="flex-none flex flex-col sm:flex-row gap-3 p-6 border-t border-line sm:justify-end">
            <button
              type="button"
              onClick={handleRechazar}
              disabled={isBusy}
              className="px-6 py-2.5 border border-danger-line bg-danger-bg text-danger-ink rounded-panel font-semibold hover:brightness-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Rechazar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={isBusy}
              className="px-6 py-2.5 bg-accent rounded-panel text-paper hover:brightness-95 font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Confirmar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmarEntregaModal;
