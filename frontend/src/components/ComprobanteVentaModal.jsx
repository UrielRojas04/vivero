import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import { X, FileDown, FileImage, MessageCircle, Receipt, Share2 } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  normalizarTelefonoWhatsApp,
  generarPngDeNodo,
  soportaCompartirArchivos,
  abrirWhatsApp,
  getMarcaDocumento,
  getPaletaClaraUnidad,
  cargarImagenLogo,
  hexARgb,
} from '../utils/comprobanteExport';

// Mismo verde que --accent de Vivero en index.css (#35682F), para la línea divisoria del
// encabezado del PDF cuando el logo va sin placa de color.
const ACCENT_VIVERO_RGB = [53, 104, 47];

const WHATSAPP_CONTACTO = '';

const formatearDinero = (valor) => {
  const numero = Number(valor) || 0;
  return `$${numero.toLocaleString('es-AR')}`;
};

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleString('es-AR');
};

const truncarTexto = (texto, maxCaracteres) => {
  if (!texto) return '-';
  return texto.length > maxCaracteres ? `${texto.slice(0, maxCaracteres - 1)}…` : texto;
};

const estiloEstadoPago = (estadoPago) => {
  if (estadoPago === 'PAGADO') return 'bg-ok-bg text-ok-ink';
  if (estadoPago === 'PARCIAL') return 'bg-warn-bg text-warn-ink';
  if (estadoPago === 'DEBE') return 'bg-danger-bg text-danger-ink';
  return 'bg-thead text-body';
};

const ComprobanteVentaModal = ({ isOpen, onClose, venta }) => {
  const { pushToast, askConfirm } = useUIStore();
  const previewRef = useRef(null);
  const unidadNegocioActiva = useAuthStore((state) => state.unidadNegocioActiva);
  const marca = getMarcaDocumento(unidadNegocioActiva);
  const paletaClara = getPaletaClaraUnidad(unidadNegocioActiva);
  const nombreDocumento = marca.nombre;

  if (!isOpen || !venta) return null;

  const detalles = venta.detalles || [];
  const pagos = venta.pagos || [];

  const clienteNombreLimpio = venta.clienteNombre ? venta.clienteNombre.replace(' (Casual)', '') : '-';

  const descargarPDF = async () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const MARGIN = 15;
      const pageBottom = pageHeight - 15;
      const colProducto = MARGIN;
      const colCant = 125;
      const colPu = 150;
      const colSub = 195;
      const rowH = 8;
      let y = 34;

      if (marca.logo && marca.placaHex) {
        // Herramientas: el logo Serhan es arte blanco, necesita placa oscura detrás (mismo
        // criterio que --accent-plate en el sidebar) o se vuelve invisible sobre el PDF blanco.
        const logoImg = await cargarImagenLogo(marca.logo);
        const [r, g, b] = hexARgb(marca.placaHex);
        doc.setFillColor(r, g, b);
        doc.rect(0, 0, pageWidth, 24, 'F');
        const logoAltura = 16;
        const logoAncho = logoAltura * (logoImg.naturalWidth / logoImg.naturalHeight);
        doc.addImage(logoImg, 'PNG', MARGIN, 4, logoAncho, logoAltura);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('REMITO DE VENTA', MARGIN, 21);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`Nº ${venta.id}`, pageWidth - MARGIN, 15, { align: 'right' });
      } else if (marca.logo) {
        // Vivero: sin placa de color -- el logo ya trae sus propios colores, va grande directo
        // sobre el fondo blanco del PDF (mismo criterio que la vista previa/JSX).
        const logoImg = await cargarImagenLogo(marca.logo);
        const logoAltura = 20;
        const logoAncho = logoAltura * (logoImg.naturalWidth / logoImg.naturalHeight);
        doc.addImage(logoImg, 'PNG', MARGIN, 2, logoAncho, logoAltura);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('REMITO DE VENTA', pageWidth - MARGIN, 10, { align: 'right' });
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(`Nº ${venta.id}`, pageWidth - MARGIN, 18, { align: 'right' });
        doc.setDrawColor(...ACCENT_VIVERO_RGB);
        doc.setLineWidth(0.6);
        doc.line(MARGIN, 25, pageWidth - MARGIN, 25);
      } else {
        // Sin logo propio (Abono, o unidad desconocida): encabezado de texto con el nombre de la
        // unidad, sobre la misma placa genérica de siempre.
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(marca.nombre, MARGIN, 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text('REMITO DE VENTA', MARGIN, 19);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`Nº ${venta.id}`, pageWidth - MARGIN, 15, { align: 'right' });
      }

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(11);
      const meta = [
        ['Fecha', formatearFecha(venta.fecha)],
        ['Cliente', clienteNombreLimpio],
      ];
      if (venta.clienteTelefono) {
        meta.push(['Teléfono', venta.clienteTelefono]);
      }
      // Documento del comprador (change clientes-dni-cuil): tomado indistintamente del Cliente
      // vinculado o del documento puntual de una venta casual -- VentaResponseDTO ya unifica
      // ambos casos en clienteDni/clienteCuil (Decisión 3 de design.md), así que acá no hay que
      // distinguir el origen. Se omiten por completo si la venta no tiene ninguno cargado.
      if (venta.clienteDni) {
        meta.push(['DNI', venta.clienteDni]);
      }
      if (venta.clienteCuil) {
        meta.push(['CUIL', venta.clienteCuil]);
      }
      meta.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, MARGIN, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value, MARGIN + 24, y);
        y += 7;
      });
      y += 4;

      doc.setFillColor(236, 253, 245);
      doc.rect(MARGIN, y, colSub - MARGIN, rowH, 'F');
      doc.setTextColor(4, 120, 87);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Producto', colProducto, y + 5.5);
      doc.text('Cant.', colCant, y + 5.5, { align: 'right' });
      doc.text('P. Unitario', colPu, y + 5.5, { align: 'right' });
      doc.text('Subtotal', colSub, y + 5.5, { align: 'right' });
      y += rowH;

      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'normal');
      detalles.forEach((detalle) => {
        if (y > pageBottom) {
          doc.addPage();
          y = 20;
        }
        doc.text(truncarTexto(detalle.productoNombre, 40), colProducto, y + 5.5);
        doc.text(String(detalle.cantidad), colCant, y + 5.5, { align: 'right' });
        doc.text(formatearDinero(detalle.precioUnitarioHistorico), colPu, y + 5.5, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(formatearDinero(detalle.subtotal), colSub, y + 5.5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += rowH;
      });

      if (detalles.length === 0) {
        doc.setTextColor(156, 163, 175);
        doc.text('Sin ítems', colProducto, y + 5.5);
        y += rowH;
      }

      y += 6;
      const totalRow = (label, value, bold) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 13 : 11);
        doc.text(label, colPu, y, { align: 'right' });
        doc.text(value, colSub, y, { align: 'right' });
        y += bold ? 9 : 7;
      };
      totalRow('Subtotal', formatearDinero(venta.subtotal), false);
      if (Number(venta.descuento) > 0) {
        const porcentaje = Number(venta.porcentajeDescuento) > 0 ? ` (${venta.porcentajeDescuento}%)` : '';
        totalRow(`Descuento${porcentaje}`, `-${formatearDinero(venta.descuento)}`, false);
      }
      totalRow('Total Final', formatearDinero(venta.totalFinal), true);

      if (pagos.length > 0) {
        y += 4;
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Pagos', MARGIN, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        pagos.forEach((pago) => {
          doc.text(pago.metodoPago || '-', MARGIN, y);
          doc.setFont('helvetica', 'bold');
          doc.text(formatearDinero(pago.monto), colSub, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += 6;
        });
      }

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Estado de pago:', MARGIN, y);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(4, 120, 87);
      doc.text(venta.estadoPago || '-', MARGIN + 33, y);

      doc.save(`remito-${venta.id}.pdf`);
      pushToast('success', 'PDF del remito descargado correctamente.');
    } catch (error) {
      pushToast('error', 'No se pudo generar el PDF del remito.');
    }
  };

  const descargarImagen = async () => {
    try {
      const resultado = await generarPngDeNodo(previewRef.current);
      if (!resultado) return;

      // En mobile: intentar abrir el panel nativo de "Compartir" para que el usuario
      // elija la app destino (WhatsApp, Telegram, email, guardar, etc.)
      if (soportaCompartirArchivos) {
        const archivo = new File([resultado.blob], `remito-${venta.id}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [archivo] })) {
          try {
            await navigator.share({
              files: [archivo],
              title: `Remito de venta Nº ${venta.id}`,
            });
            pushToast('success', 'Comprobante compartido correctamente.');
            return;
          } catch (shareErr) {
            // AbortError = usuario canceló el panel, no es error real
            if (shareErr?.name === 'AbortError') return;
            // Si falla Web Share, cae al download tradicional
          }
        }
      }

      // Desktop o fallback: descarga directa
      const enlace = document.createElement('a');
      enlace.href = resultado.dataUrl;
      enlace.download = `remito-${venta.id}.png`;
      enlace.click();
      pushToast('success', 'Imagen del remito descargada correctamente.');
    } catch (error) {
      pushToast('error', 'No se pudo generar la imagen del remito.');
    }
  };

  const generarArchivoCompartir = async () => {
    const resultado = await generarPngDeNodo(previewRef.current);
    if (!resultado) return null;
    return new File([resultado.blob], `remito-${venta.id}.png`, { type: 'image/png' });
  };

  const enviarWhatsApp = async () => {
    const resumen = [
      `REMITO DE VENTA - ${nombreDocumento}`,
      '',
      `Venta Nº: ${venta.id}`,
      `Fecha: ${formatearFecha(venta.fecha)}`,
      `Cliente: ${clienteNombreLimpio}`,
      venta.clienteTelefono ? `Teléfono: ${venta.clienteTelefono}` : null,
      venta.clienteDni ? `DNI: ${venta.clienteDni}` : null,
      venta.clienteCuil ? `CUIL: ${venta.clienteCuil}` : null,
      `Total final: ${formatearDinero(venta.totalFinal)}`,
      `Estado de pago: ${venta.estadoPago || '-'}`,
    ].filter(Boolean).join('\n');

    const telefono = normalizarTelefonoWhatsApp(venta.clienteTelefono || WHATSAPP_CONTACTO);

    const ejecutarEnvio = async () => {
      const archivo = await generarArchivoCompartir();
      await abrirWhatsApp({
        telefono,
        resumen,
        archivo,
        tituloCompartir: `Remito de venta Nº ${venta.id}`,
        pushToast,
        mensajeExitoConImagenCopiada: 'WhatsApp abierto. Pegá la imagen del remito con Ctrl+V.',
        mensajeExitoSinImagenCopiada: 'WhatsApp abierto con el resumen de la venta.',
      });
    };

    // Móvil/tablet con Web Share: mismo comportamiento previo a la extracción -- el envío es
    // directo (abrirWhatsApp intenta compartir el archivo), sin pedir confirmación. En cualquier
    // otro caso (desktop, o táctil sin soporte de Web Share) se pide confirmación antes de copiar
    // la imagen al portapapeles y abrir WhatsApp Web.
    if (soportaCompartirArchivos) {
      await ejecutarEnvio();
      return;
    }

    askConfirm({
      title: 'Enviar por WhatsApp',
      message: 'La imagen del remito se copiará y se abrirá el chat de WhatsApp listo para pegar (Ctrl+V). ¿Deseás continuar?',
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
              <h2 className="text-xl font-bold text-ink">Comprobante de Venta</h2>
              <p className="text-sm text-muted">Venta #{venta.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-body transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 bg-canvas p-6">
          {/* force-light-export (switch-tema-claro-oscuro, fix de regresión): mismo bug que ya se
              corrigió en FacturaCliente.jsx — el fondo del PNG en generarPngDeNodo() ya es
              blanco (#ffffff), pero el contenido clonado heredaba los tokens de [data-theme="dark"]
              cuando la app estaba en oscuro, dejando texto claro sobre fondo blanco (ilegible).
              cloneNode(true) copia el className tal cual, así que esta clase viaja con el clon sin
              tocar generarPngDeNodo. */}
          <div
            ref={previewRef}
            className="force-light-export bg-paper rounded-panel border border-line p-6 mx-auto max-w-lg"
          >
            <div className="flex justify-between items-start border-b-2 border-accent pb-4">
              <div>
                {marca.logo ? (
                  marca.placaHex ? (
                    <div className="inline-flex items-center rounded-base px-3 py-2" style={{ backgroundColor: marca.placaHex }}>
                      <img src={marca.logo} alt={marca.nombre} className="h-12 w-auto object-contain" />
                    </div>
                  ) : (
                    <img src={marca.logo} alt={marca.nombre} className="h-24 w-auto object-contain" />
                  )
                ) : (
                  <p className="text-xl font-bold" style={{ color: paletaClara.accentInk }}>{marca.nombre}</p>
                )}
                <p className="text-sm text-muted tracking-wide mt-1">REMITO DE VENTA</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-ink">Nº {venta.id}</p>
                <p className="text-sm text-muted">{formatearFecha(venta.fecha)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-faint font-semibold">Cliente</p>
                <p className="font-semibold text-ink">{clienteNombreLimpio}</p>
                {venta.clienteTelefono && (
                  <p className="text-sm text-muted mt-0.5">{venta.clienteTelefono}</p>
                )}
                {venta.clienteDni && (
                  <p className="text-sm text-muted mt-0.5">DNI: {venta.clienteDni}</p>
                )}
                {venta.clienteCuil && (
                  <p className="text-sm text-muted mt-0.5">CUIL: {venta.clienteCuil}</p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full mt-5 text-sm min-w-[350px]">
                <thead>
                  <tr
                    className="text-left text-xs uppercase tracking-wider"
                    style={{ backgroundColor: paletaClara.accentSoft, color: paletaClara.accentInk }}
                  >
                    <th className="py-2 pr-2 font-semibold">Producto</th>
                    <th className="py-2 px-2 text-right font-semibold">Cant.</th>
                    <th className="py-2 px-2 text-right font-semibold">P. Unitario</th>
                    <th className="py-2 pl-2 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detalles.map((detalle) => (
                    <tr key={detalle.id || detalle.productoId}>
                      <td className="py-2.5 pr-2 text-ink break-words max-w-[150px]">{detalle.productoNombre || '-'}</td>
                      <td className="py-2.5 px-2 text-right text-muted font-mono tabular-nums">{detalle.cantidad}</td>
                      <td className="py-2.5 px-2 text-right text-muted font-mono tabular-nums">{formatearDinero(detalle.precioUnitarioHistorico)}</td>
                      <td className="py-2.5 pl-2 text-right font-semibold text-ink font-mono tabular-nums">{formatearDinero(detalle.subtotal)}</td>
                    </tr>
                  ))}
                  {detalles.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-3 text-center text-faint">Sin ítems</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-60 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Subtotal</span>
                  <span className="font-medium text-ink font-mono tabular-nums">{formatearDinero(venta.subtotal)}</span>
                </div>
                {Number(venta.descuento) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted">
                      Descuento{Number(venta.porcentajeDescuento) > 0 ? ` (${venta.porcentajeDescuento}%)` : ''}
                    </span>
                    <span className="font-medium text-danger font-mono tabular-nums">-{formatearDinero(venta.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-line pt-2">
                  <span className="font-bold text-ink">Total Final</span>
                  <span className="font-bold text-ink font-mono tabular-nums">{formatearDinero(venta.totalFinal)}</span>
                </div>
              </div>
            </div>

            {pagos.length > 0 && (
              <div className="mt-4 border-t border-line pt-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-faint font-semibold mb-2">Pagos</p>
                <ul className="space-y-1.5">
                  {pagos.map((pago, index) => (
                    <li key={pago.id || index} className="flex justify-between">
                      <span className="text-muted">{pago.metodoPago || '-'}</span>
                      <span className="font-medium text-ink font-mono tabular-nums">{formatearDinero(pago.monto)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex justify-between items-center border-t-2 border-accent pt-3">
              <span className="text-xs uppercase tracking-wider text-faint font-semibold">Estado de pago</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${estiloEstadoPago(venta.estadoPago)}`}>
                {venta.estadoPago || '-'}
              </span>
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

export default ComprobanteVentaModal;