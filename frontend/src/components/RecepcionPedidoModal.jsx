import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertTriangle, ScanBarcode, BadgeCheck } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';
import EscanerCodigoBarra from './EscanerCodigoBarra';
import CodigoBarraDuplicadoModal from './CodigoBarraDuplicadoModal';
import { pedidosApi } from '../api/pedidos.api';
import { productosApi } from '../api/productos.api';
import { useUIStore } from '../store/useUIStore';
import { useRecepcionDraftStore } from '../store/useRecepcionDraftStore';
import { getErrorMessage } from '../utils/errorMessage';
import { verificarCodigoBarraDuplicado } from '../utils/verificarCodigoBarraDuplicado';

// Un solo modal para dos casos (tarea 9.5 y 9.8 de tasks.md):
//  - Pedido PENDIENTE: formulario de confirmación de recepción, con la cantidad recibida
//    precargada con la cantidad pedida y editable, y el remanente resultante en vivo.
//  - Pedido COMPLETO/PARCIAL/CANCELADO: vista de sólo lectura con las tres cantidades por ítem
//    (pedida, recibida, pendiente) — no ofrece ninguna acción de edición/cancelación/reconfirmación
//    (tarea 9.9): el pedido es terminal.
const RecepcionPedidoModal = ({ pedido, isOpen, onClose, onConfirmed }) => {
  const { pushToast, askConfirm } = useUIStore();
  const { obtenerDraft, guardarDraft, limpiarDraft } = useRecepcionDraftStore();
  const [cantidades, setCantidades] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Grupo 12 de tasks.md de codigo-barras-herramientas (extensión post-cierre): código
  // escaneado/tipeado por línea durante ESTA confirmación, mapa detalleId → string, análogo a
  // `cantidades`. No dispara ningún guardado individual — viaja junto con la confirmación
  // general (enviarConfirmacion). `escanerDetalleId` es la línea cuyo EscanerCodigoBarra está
  // abierto ahora mismo (un único modal reutilizado, no uno por línea).
  const [codigosBarra, setCodigosBarra] = useState({});
  const [escanerDetalleId, setEscanerDetalleId] = useState(null);
  // Grupo 13 (aviso de código duplicado al escanear, extensión post-cierre): { codigo, producto,
  // detalleId } del conflicto detectado apenas se escanea — null cuando no hay ninguno abierto.
  const [conflictoCodigoBarra, setConflictoCodigoBarra] = useState(null);
  // Bug real reportado por el usuario (mismo que en ProductoForm.jsx): liberar de inmediato al
  // elegir "Quedarme con este código" dejaba el código sin dueño si la recepción se cerraba sin
  // confirmar. Ahora sólo se acumulan acá los códigos a liberar (puede haber más de uno, una por
  // línea); el DELETE real de cada uno recién se dispara en enviarConfirmacion(), justo antes de
  // confirmar la recepción de verdad.
  const [codigosALiberarAlConfirmar, setCodigosALiberarAlConfirmar] = useState([]);

  const esPendiente = pedido?.estado === 'PENDIENTE';

  useEffect(() => {
    if (isOpen && pedido) {
      // Precarga: cantidad recibida = cantidad pedida, editable por el usuario — salvo que haya
      // un borrador guardado de una vez anterior que se cerró sin confirmar (pedido del usuario:
      // "al volver a entrar se queden precargados"), en cuyo caso gana el borrador.
      const draft = esPendiente ? obtenerDraft(pedido.id) : null;
      const inicial = {};
      (pedido.detalles || []).forEach((d) => {
        inicial[d.id] = esPendiente ? String(d.cantidadPedida) : String(d.cantidadRecibida ?? '');
      });
      setCantidades(draft?.cantidades ?? inicial);
      setCodigosBarra(draft?.codigosBarra ?? {});
      // Los códigos pendientes de liberar viajan en el mismo borrador — si no se persistieran acá
      // también, reabrir el modal restauraría codigosBarra con un código "robado" pero sin la
      // intención de liberarlo, y confirmar chocaría con el producto que todavía lo tiene.
      setCodigosALiberarAlConfirmar(draft?.codigosALiberarAlConfirmar ?? []);
      setEscanerDetalleId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pedido, esPendiente]);

  // Cada cambio de cantidad o de código escaneado se guarda como borrador de ESTE pedido (mismo
  // patrón que useCartStore) — así sobrevive a cerrar el modal sin querer, a un refresh de la
  // página, o a salir y volver más tarde a terminar de confirmar la recepción.
  useEffect(() => {
    if (isOpen && pedido && esPendiente) {
      guardarDraft(pedido.id, { cantidades, codigosBarra, codigosALiberarAlConfirmar });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantidades, codigosBarra, codigosALiberarAlConfirmar]);

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

  // Grupo 12: al detectar (o tipear a mano, EscanerCodigoBarra ofrece ambos) un código para la
  // línea que tiene el escáner abierto, lo guarda en codigosBarra y cierra el modal — no dispara
  // ningún guardado, el código viaja junto con la confirmación general (tarea 12.8).
  //
  // Grupo 13 (aviso de código duplicado al escanear): antes de guardarlo en codigosBarra, chequea
  // si el código ya está asignado a OTRO producto. Líneas "pendiente de crear" (d.productoId
  // null) no tienen "soy el mismo producto" posible — cualquier resultado encontrado ahí es
  // conflicto por definición. En líneas existentes, se compara contra d.productoId.
  const handleCodigoDetectado = async (codigo) => {
    const detalleId = escanerDetalleId;
    setEscanerDetalleId(null);
    if (detalleId == null) return;

    const detalle = (pedido.detalles || []).find((d) => d.id === detalleId);

    try {
      const encontrado = await verificarCodigoBarraDuplicado(codigo);
      const esElMismoProducto = detalle?.productoId != null && encontrado && encontrado.id === detalle.productoId;
      if (encontrado && !esElMismoProducto) {
        setConflictoCodigoBarra({ codigo, producto: encontrado, detalleId });
        return;
      }
      setCodigosBarra((prev) => ({ ...prev, [detalleId]: codigo }));
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al verificar el código de barras.'));
    }
  };

  // "Descartar código nuevo": cierra el aviso, no toca codigosBarra de esa línea.
  const handleDescartarCodigoDuplicado = () => {
    setConflictoCodigoBarra(null);
  };

  // "Quedarme con este código": NO libera nada todavía (bug corregido, ver
  // codigosALiberarAlConfirmar) — sólo escribe el código en la línea y lo agrega a la lista de
  // códigos a liberar cuando se confirme la recepción de verdad.
  const handleQuedarmeConCodigoDuplicado = () => {
    if (!conflictoCodigoBarra) return;
    setCodigosBarra((prev) => ({ ...prev, [conflictoCodigoBarra.detalleId]: conflictoCodigoBarra.codigo }));
    setCodigosALiberarAlConfirmar((prev) => [...prev, conflictoCodigoBarra.codigo]);
    setConflictoCodigoBarra(null);
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
      // Grupo 12 (tarea 12.9): sólo viaja cuando el usuario cargó un código para esta línea en
      // ESTA confirmación — codigosBarra[d.id] || undefined, nunca un string vacío.
      codigoBarra: codigosBarra[d.id] || undefined,
    }));

    if (items.some((it) => isNaN(it.cantidadRecibida) || it.cantidadRecibida < 0)) {
      pushToast('error', 'Todas las cantidades recibidas deben ser números enteros mayores o iguales a cero.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Recién acá se liberan de verdad los códigos elegidos con "Quedarme con este código" —
      // justo antes de confirmar, nunca antes. Si falla alguno, se corta sin confirmar nada.
      for (const codigo of codigosALiberarAlConfirmar) {
        await productosApi.liberarCodigoBarra(codigo);
      }
      await pedidosApi.confirmarRecepcion(pedido.id, { items });
      limpiarDraft(pedido.id);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-none sm:rounded-panel border border-line-strong w-full h-full sm:h-auto max-w-2xl flex flex-col max-h-screen sm:max-h-[95vh]">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-line bg-accent text-paper sm:rounded-t-panel">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackageCheck className="w-5 h-5" />
            {esPendiente ? 'Confirmar Recepción' : 'Detalle del Pedido'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/10 transition-colors text-paper/90 hover:text-paper cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="text-sm text-muted">
            Proveedor: <span className="font-medium text-ink">{pedido.proveedorNombre}</span>
          </div>

          <div className="space-y-3">
            {(pedido.detalles || []).map((d) => (
              <div key={d.id} className="bg-canvas border border-line rounded-panel p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-ink flex items-center gap-2 flex-wrap">
                    {nombreLinea(d)}
                    {esLineaPendiente(d) && (
                      <span className="text-[10px] font-semibold text-warn-ink bg-warn-bg border border-warn-line rounded-full px-1.5 py-0.5">
                        Nuevo — se crea al confirmar
                      </span>
                    )}
                  </p>
                  {/* Grupo 12 (tarea 12.7, reubicado a pedido del usuario): el ícono de escaneo va
                      en la esquina superior derecha de la tarjeta, no al lado del input de
                      cantidad. Con código ya guardado: ícono de sólo lectura (sin el número, sólo
                      en el tooltip). Sin código: botón de escaneo; al escanear en esta sesión, el
                      número leído aparece como texto al lado del ícono. */}
                  {esPendiente && (
                    d.codigoBarra ? (
                      <span
                        className="shrink-0 p-1.5 rounded-base border border-ok-line bg-ok-bg text-ok-ink flex items-center justify-center"
                        title={`Código de barras guardado: ${d.codigoBarra}`}
                      >
                        <BadgeCheck className="w-4 h-4" />
                      </span>
                    ) : (
                      <div className="shrink-0 flex items-center gap-1.5">
                        {codigosBarra[d.id] && (
                          <span
                            className="max-w-[110px] truncate text-[10px] font-mono text-ok-ink bg-ok-bg border border-ok-line rounded-full px-1.5 py-0.5"
                            title={codigosBarra[d.id]}
                          >
                            {codigosBarra[d.id]}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEscanerDetalleId(d.id)}
                          className="p-1.5 rounded-base border border-line text-accent hover:bg-paper transition-colors cursor-pointer"
                          title="Escanear código de barras"
                        >
                          <ScanBarcode className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  )}
                </div>
                {esPendiente ? (
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-semibold text-faint uppercase mb-1">Pedida</label>
                      <p className="px-3 py-2 text-sm text-body bg-paper border border-line rounded-base font-mono tabular-nums">{d.cantidadPedida}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-faint uppercase mb-1">Recibida</label>
                      <FormattedNumberInput
                        value={cantidades[d.id] ?? ''}
                        onChange={(val) => handleCantidadChange(d.id, val)}
                        className="w-full px-3 py-2 text-sm border border-line rounded-base bg-paper focus:outline-none focus:ring-2 focus:ring-accent text-right font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-faint uppercase mb-1">Pendiente</label>
                      <p className={`px-3 py-2 text-sm font-semibold rounded-base border font-mono tabular-nums ${
                        remanente(d) > 0 ? 'text-warn-ink bg-warn-bg border-warn-line' : 'text-ok-ink bg-ok-bg border-ok-line'
                      }`}>
                        {remanente(d)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-faint uppercase mb-1">Pedida</label>
                      <p className="text-sm font-medium text-ink font-mono tabular-nums">{d.cantidadPedida}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-faint uppercase mb-1">Recibida</label>
                      <p className="text-sm font-medium text-ink font-mono tabular-nums">{d.cantidadRecibida ?? '-'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-faint uppercase mb-1">Pendiente</label>
                      <p className={`text-sm font-semibold font-mono tabular-nums ${d.cantidadPendiente > 0 ? 'text-warn' : 'text-ok'}`}>
                        {d.cantidadPendiente ?? 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {esPendiente && haySobrante && (
            <div className="flex items-start gap-2 p-3 bg-warn-bg border border-warn-line rounded-base text-sm text-warn-ink">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>Hay ítems con cantidad recibida mayor a la pedida. Se aceptan y se suman igual al stock.</p>
            </div>
          )}
        </div>

        <div className="flex-none flex items-center justify-end gap-3 p-4 px-6 border-t border-line bg-canvas sm:rounded-b-panel">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-panel border border-line text-sm font-medium text-body hover:bg-paper transition-colors cursor-pointer"
          >
            {esPendiente ? 'Cancelar' : 'Cerrar'}
          </button>
          {esPendiente && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmarClick}
              className="px-5 py-2.5 rounded-panel bg-accent hover:brightness-95 text-sm font-semibold text-paper transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Confirmando...' : 'Confirmar Recepción'}
            </button>
          )}
        </div>
      </div>

      {/* Grupo 12: un único EscanerCodigoBarra reutilizado para todas las líneas — la línea
          "activa" es escanerDetalleId, seteada por el botón de cada fila. */}
      <EscanerCodigoBarra
        isOpen={escanerDetalleId != null}
        onClose={() => setEscanerDetalleId(null)}
        onDetectado={handleCodigoDetectado}
      />

      {/* Grupo 13: aviso de código duplicado apenas se escanea (no recién al confirmar). */}
      <CodigoBarraDuplicadoModal
        isOpen={!!conflictoCodigoBarra}
        onClose={handleDescartarCodigoDuplicado}
        codigo={conflictoCodigoBarra?.codigo}
        productoEnConflicto={conflictoCodigoBarra?.producto}
        onDescartar={handleDescartarCodigoDuplicado}
        onQuedarme={handleQuedarmeConCodigoDuplicado}
      />
    </div>
  );
};

export default RecepcionPedidoModal;
