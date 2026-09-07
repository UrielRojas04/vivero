import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import { X, FileDown, FileImage, MessageCircle, Receipt, Share2 } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import {
  normalizarTelefonoWhatsApp,
  generarPngDeNodo,
  soportaCompartirArchivos,
  abrirWhatsApp,
  getMarcaDocumento,
  getPaletaClaraUnidad,
  cargarImagenLogo,
} from '../utils/comprobanteExport';

// Registro de Semillas es una pantalla exclusiva de Vivero (ver navGroups en DashboardLayout.jsx
// y el guard de unidad que redirige si no lo es), así que la marca de documento es siempre la de
// Vivero -- a diferencia de ComprobanteVentaModal.jsx no hace falta leer unidadNegocioActiva.
const MARCA_VIVERO = getMarcaDocumento('1');
const PALETA_CLARA_VIVERO = getPaletaClaraUnidad('1');

// Mismo verde que --accent de Vivero en index.css (#35682F), para la línea divisoria del
// encabezado del PDF (Vivero no lleva placa de color detrás del logo).
const ACCENT_VIVERO_RGB = [53, 104, 47];

const UNIDAD_LABEL = {
  SEMILLAS: { singular: 'semilla', plural: 'semillas' },
  SOBRES: { singular: 'sobre', plural: 'sobres' },
  GRAMOS: { singular: 'gramo', plural: 'gramos' },
};

// Pedido del dueño 2026-09-06: "1 sobre", no "1 sobres" -- singular/plural según la cantidad.
const etiquetaUnidad = (clave, cantidad) => {
  const info = UNIDAD_LABEL[clave];
  if (!info) return '';
  return Number(cantidad) === 1 ? info.singular : info.plural;
};

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  // fechaRecepcion es LocalDate ('YYYY-MM-DD'): se arma la fecha en horario local para
  // evitar el corrimiento de un día que produce `new Date('YYYY-MM-DD')` (UTC medianoche).
  const partes = String(fecha).split('-');
  if (partes.length === 3) {
    const [anio, mes, dia] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia)).toLocaleDateString('es-AR');
  }
  return new Date(fecha).toLocaleDateString('es-AR');
};

const formatearCantidad = (cantidad, unidad) => {
  const numero = Number(cantidad);
  const cantidadFmt = Number.isFinite(numero) ? numero.toLocaleString('es-AR') : cantidad;
  return `${cantidadFmt} ${etiquetaUnidad(unidad, cantidad)}`.trim();
};

// Texto de la fila "Total" (pedido del dueño 2026-09-05, GRAMOS -> semillas vía
// VariedadPlanta.semillasPorGramo): con SOBRES se conoce el multiplicador (contenidoPorSobre) y
// se muestra; con GRAMOS el registro no trae semillasPorGramo (vive en la variedad, no en el
// registro), así que se muestra sólo el total ya calculado por el backend.
const textoTotal = (registro) => {
  if (registro.totalSemillas == null) return null;
  const total = `${Number(registro.totalSemillas).toLocaleString('es-AR')} semillas`;
  if (registro.unidadCantidad === 'SOBRES' && registro.contenidoPorSobre != null) {
    return `× ${registro.contenidoPorSobre} = ${total}`;
  }
  return `= ${total}`;
};

// Texto de la fila "Bandejas" (pedido del dueño 2026-09-05): tipo y cantidad estimados al
// recibir la semilla -- ambos opcionales e independientes entre sí (uno puede estar cargado sin
// el otro), así que arma el texto con lo que haya.
const textoBandejas = (registro) => {
  if (registro.cantidadBandejas == null && !registro.variedadBandejaNombre) return null;
  if (registro.cantidadBandejas != null && registro.variedadBandejaNombre) {
    return `${registro.cantidadBandejas} × ${registro.variedadBandejaNombre}`;
  }
  return registro.cantidadBandejas != null
    ? `${registro.cantidadBandejas}`
    : registro.variedadBandejaNombre;
};

const ComprobanteSemillaModal = ({ isOpen, onClose, registro }) => {
  const { pushToast, askConfirm } = useUIStore();
  const previewRef = useRef(null);

  if (!isOpen || !registro) return null;

  const tieneTotal = registro.totalSemillas != null;

  const descargarPDF = async () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const MARGIN = 15;
      const rowH = 8;
      let y = 34;

      const logoImg = await cargarImagenLogo(MARCA_VIVERO.logo);
      const logoAltura = 20;
      const logoAncho = logoAltura * (logoImg.naturalWidth / logoImg.naturalHeight);
      doc.addImage(logoImg, 'PNG', MARGIN, 2, logoAncho, logoAltura);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('COMPROBANTE DE RECEPCIÓN DE SEMILLAS', pageWidth - MARGIN, 10, { align: 'right' });
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Nº ${registro.id}`, pageWidth - MARGIN, 18, { align: 'right' });
      doc.setDrawColor(...ACCENT_VIVERO_RGB);
      doc.setLineWidth(0.6);
      doc.line(MARGIN, 25, pageWidth - MARGIN, 25);

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(11);

      const filas = [
        ['Fecha', formatearFecha(registro.fechaRecepcion)],
        ['Entregado por', registro.nombreQuienTrajo || '-'],
      ];
      if (registro.telefonoContacto) filas.push(['Teléfono', registro.telefonoContacto]);
      filas.push(['Lote', registro.lote || '-']);
      filas.push(['Semilla', registro.descripcionSemilla || '-']);
      filas.push(['Cantidad', formatearCantidad(registro.cantidad, registro.unidadCantidad)]);
      if (tieneTotal) {
        filas.push(['Total', textoTotal(registro)]);
      }
      const bandejasTexto = textoBandejas(registro);
      if (bandejasTexto) filas.push(['Bandejas', bandejasTexto]);
      if (registro.observaciones) filas.push(['Observaciones', registro.observaciones]);
      if (registro.fechaSiembraProgramada || registro.fechaEntrega) {
        filas.push(['Fechas Programadas', null, true]);
        if (registro.fechaSiembraProgramada) filas.push(['Fecha de Siembra', formatearFecha(registro.fechaSiembraProgramada)]);
        if (registro.fechaEntrega) filas.push(['Fecha de Entrega', formatearFecha(registro.fechaEntrega)]);
      }
      filas.push(['Recibido por', registro.usuarioRecibeNombre || '-']);

      filas.forEach(([label, value, esSubtitulo]) => {
        if (esSubtitulo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(107, 114, 128);
          doc.text(label.toUpperCase(), MARGIN, y);
          doc.setFontSize(11);
          doc.setTextColor(31, 41, 55);
          y += rowH * 0.7;
          return;
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, MARGIN, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), MARGIN + 38, y);
        y += rowH;
      });

      doc.save(`comprobante-semillas-${registro.id}.pdf`);
      pushToast('success', 'PDF del comprobante descargado correctamente.');
    } catch (error) {
      pushToast('error', 'No se pudo generar el PDF del comprobante.');
    }
  };

  const generarArchivoCompartir = async () => {
    const resultado = await generarPngDeNodo(previewRef.current);
    if (!resultado) return null;
    return { archivo: new File([resultado.blob], `comprobante-semillas-${registro.id}.png`, { type: 'image/png' }), resultado };
  };

  const descargarImagen = async () => {
    try {
      const generado = await generarArchivoCompartir();
      if (!generado) return;
      const { archivo, resultado } = generado;

      if (soportaCompartirArchivos && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({
            files: [archivo],
            title: `Comprobante de semillas Nº ${registro.id}`,
          });
          pushToast('success', 'Comprobante compartido correctamente.');
          return;
        } catch (shareErr) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      const enlace = document.createElement('a');
      enlace.href = resultado.dataUrl;
      enlace.download = `comprobante-semillas-${registro.id}.png`;
      enlace.click();
      pushToast('success', 'Imagen del comprobante descargada correctamente.');
    } catch (error) {
      pushToast('error', 'No se pudo generar la imagen del comprobante.');
    }
  };

  const enviarWhatsApp = async () => {
    const resumen = [
      `COMPROBANTE DE RECEPCIÓN DE SEMILLAS - ${MARCA_VIVERO.nombre}`,
      '',
      `Nº: ${registro.id}`,
      `Fecha: ${formatearFecha(registro.fechaRecepcion)}`,
      `Entregado por: ${registro.nombreQuienTrajo || '-'}`,
      `Lote: ${registro.lote || '-'}`,
      `Semilla: ${registro.descripcionSemilla || '-'}`,
      `Cantidad: ${formatearCantidad(registro.cantidad, registro.unidadCantidad)}`,
      textoBandejas(registro) ? `Bandejas: ${textoBandejas(registro)}` : null,
      (registro.fechaSiembraProgramada || registro.fechaEntrega) ? '' : null,
      (registro.fechaSiembraProgramada || registro.fechaEntrega) ? '*Fechas Programadas*' : null,
      registro.fechaSiembraProgramada ? `Fecha de Siembra: ${formatearFecha(registro.fechaSiembraProgramada)}` : null,
      registro.fechaEntrega ? `Fecha de Entrega: ${formatearFecha(registro.fechaEntrega)}` : null,
    ].filter((linea) => linea !== null).join('\n');

    const telefono = normalizarTelefonoWhatsApp(registro.telefonoContacto);

    const ejecutarEnvio = async () => {
      const generado = await generarArchivoCompartir();
      await abrirWhatsApp({
        telefono,
        resumen,
        archivo: generado?.archivo || null,
        tituloCompartir: `Comprobante de semillas Nº ${registro.id}`,
        pushToast,
        mensajeExitoConImagenCopiada: 'WhatsApp abierto. Pegá la imagen del comprobante con Ctrl+V.',
        mensajeExitoSinImagenCopiada: 'WhatsApp abierto con el resumen de la recepción.',
      });
    };

    // Mismo criterio que ComprobanteVentaModal: en táctil con soporte de Web Share, el envío es
    // directo, sin pedir confirmación. En cualquier otro caso se pide confirmación antes de
    // copiar la imagen al portapapeles y abrir WhatsApp Web.
    if (soportaCompartirArchivos) {
      await ejecutarEnvio();
      return;
    }

    askConfirm({
      title: 'Enviar por WhatsApp',
      message: 'La imagen del comprobante se copiará y se abrirá el chat de WhatsApp listo para pegar (Ctrl+V). ¿Deseás continuar?',
      variant: 'warning',
      confirmLabel: 'Abrir WhatsApp',
      cancelLabel: 'Cancelar',
      onConfirm: ejecutarEnvio,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-paper rounded-panel border border-line-strong w-full max-w-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft text-accent-ink rounded-base">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">Comprobante de Recepción de Semillas</h2>
              <p className="text-sm text-muted">Registro #{registro.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-body transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 bg-canvas p-6">
          {/* force-light-export (regresión ya sufrida en FacturaCliente.jsx y en
              ComprobanteVentaModal.jsx): sin esta clase, el PNG generado por generarPngDeNodo()
              hereda los tokens de [data-theme="dark"] y sale con texto claro sobre fondo blanco. */}
          <div
            ref={previewRef}
            className="force-light-export bg-paper rounded-panel border border-line p-6 mx-auto max-w-lg"
          >
            <div className="flex justify-between items-start border-b-2 border-accent pb-4">
              <div>
                <img src={MARCA_VIVERO.logo} alt={MARCA_VIVERO.nombre} className="h-24 w-auto object-contain" />
                <p className="text-sm text-muted tracking-wide mt-1">COMPROBANTE DE RECEPCIÓN DE SEMILLAS</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-ink">Nº {registro.id}</p>
                <p className="text-sm text-muted">{formatearFecha(registro.fechaRecepcion)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-faint font-semibold">Entregado por</p>
                <p className="font-semibold text-ink">{registro.nombreQuienTrajo || '-'}</p>
                {registro.telefonoContacto && (
                  <p className="text-sm text-muted mt-0.5">{registro.telefonoContacto}</p>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Lote</span>
                <span className="font-mono font-semibold text-ink text-right">{registro.lote || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Semilla</span>
                <span className="font-medium text-ink text-right">{registro.descripcionSemilla || '-'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Cantidad</span>
                <span className="font-mono font-semibold text-ink text-right">
                  {formatearCantidad(registro.cantidad, registro.unidadCantidad)}
                </span>
              </div>
              {tieneTotal && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Total</span>
                  <span className="font-mono font-semibold text-right" style={{ color: PALETA_CLARA_VIVERO.accentInk }}>
                    {textoTotal(registro)}
                  </span>
                </div>
              )}
              {textoBandejas(registro) && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Bandejas</span>
                  <span className="font-mono font-semibold text-ink text-right">{textoBandejas(registro)}</span>
                </div>
              )}
              {registro.observaciones && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Observaciones</span>
                  <span className="text-ink text-right break-words max-w-[70%]">{registro.observaciones}</span>
                </div>
              )}
              {(registro.fechaEntrega || registro.fechaSiembraProgramada) && (
                <div className="pt-2 mt-1 border-t border-line space-y-2">
                  <p className="text-xs uppercase tracking-wider text-faint font-semibold">Fechas Programadas</p>
                  {registro.fechaSiembraProgramada && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted">Fecha de Siembra</span>
                      <span className="font-mono font-semibold text-ink text-right">{formatearFecha(registro.fechaSiembraProgramada)}</span>
                    </div>
                  )}
                  {registro.fechaEntrega && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted">Fecha de Entrega</span>
                      <span className="font-mono font-semibold text-ink text-right">{formatearFecha(registro.fechaEntrega)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center border-t-2 border-accent pt-3">
              <span className="text-xs uppercase tracking-wider text-faint font-semibold">Recibido por</span>
              <span className="font-semibold text-ink text-sm">{registro.usuarioRecibeNombre || '-'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 p-4 sm:p-6 border-t border-line bg-paper flex-shrink-0">
          <button
            onClick={descargarPDF}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-accent hover:brightness-95 text-paper rounded-base font-semibold transition-colors cursor-pointer text-sm sm:text-base"
          >
            <FileDown className="w-4 h-4" /> <span className="hidden sm:inline">Descargar</span> PDF
          </button>
          <button
            onClick={descargarImagen}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-ink hover:brightness-125 text-paper rounded-base font-semibold transition-colors cursor-pointer text-sm sm:text-base"
          >
            {soportaCompartirArchivos
              ? <><Share2 className="w-4 h-4" /> Compartir</>
              : <><FileImage className="w-4 h-4" /> <span className="hidden sm:inline">Descargar</span> Imagen</>
            }
          </button>
          <button
            onClick={enviarWhatsApp}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-accent hover:brightness-95 text-paper rounded-base font-semibold transition-colors cursor-pointer text-sm sm:text-base"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-paper border border-line hover:bg-canvas text-body rounded-base font-semibold transition-colors cursor-pointer text-sm sm:text-base"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComprobanteSemillaModal;
