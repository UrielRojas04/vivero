import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { X, FileDown, FileImage, MessageCircle, Receipt } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

const NOMBRE_VIVERO = 'Vivero ERP';
const WHATSAPP_CONTACTO = '';
const NOMBRE_VENTANA_WHATSAPP = 'whatsapp-remito';
// Referencia a nivel de MÓDULO (NO useRef): sobrevive al desmontaje del modal (el componente se
// destruye al cerrarse) y a los re-renders. La referencia directa es el único mecanismo fiable
// para reutilizar la MISMA pestaña: el "nombre de ventana" se pierde cuando WhatsApp Web te
// redirige cross-origin (web.whatsapp.com/send → web.whatsapp.com/), y entonces window.open() con
// ese nombre ya no encuentra la pestaña y abre una nueva.
let ventanaWhatsAppAbierta = null;

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

const normalizarTelefonoWhatsApp = (tel) => {
  if (!tel) return '';
  const soloDigitos = String(tel).replace(/\D/g, '');
  if (!soloDigitos) return '';
  return soloDigitos.startsWith('00') ? soloDigitos.slice(2) : soloDigitos;
};

const estiloEstadoPago = (estadoPago) => {
  if (estadoPago === 'PAGADO') return 'bg-emerald-50 text-emerald-700';
  if (estadoPago === 'PARCIAL') return 'bg-amber-50 text-amber-700';
  if (estadoPago === 'DEBE') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const ComprobanteVentaModal = ({ isOpen, onClose, venta }) => {
  const { pushToast, askConfirm } = useUIStore();
  const previewRef = useRef(null);

  if (!isOpen || !venta) return null;

  const detalles = venta.detalles || [];
  const pagos = venta.pagos || [];

  const descargarPDF = () => {
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

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(NOMBRE_VIVERO, MARGIN, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('REMITO DE VENTA', MARGIN, 19);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Nº ${venta.id}`, pageWidth - MARGIN, 15, { align: 'right' });

      doc.setTextColor(31, 41, 55);
      doc.setFontSize(11);
      const meta = [
        ['Fecha', formatearFecha(venta.fecha)],
        ['Cliente', venta.clienteNombre || '-'],
        ['Vendedor', venta.usuarioNombre || '-'],
      ];
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

  const generarPngDePreview = async () => {
    const nodo = previewRef.current;
    if (!nodo) return null;

    const clon = nodo.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.width = `${nodo.offsetWidth}px`;
    clon.style.height = 'auto';
    clon.style.maxHeight = 'none';
    clon.style.overflow = 'visible';

    document.body.appendChild(wrapper);
    wrapper.appendChild(clon);
    try {
      const ancho = clon.offsetWidth;
      const alto = clon.offsetHeight;
      const dataUrl = await toPng(clon, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        width: ancho,
        height: alto,
      });
      const blob = await (await fetch(dataUrl)).blob();
      return { dataUrl, blob };
    } finally {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  const descargarImagen = async () => {
    try {
      const resultado = await generarPngDePreview();
      if (!resultado) return;
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
    const resultado = await generarPngDePreview();
    if (!resultado) return null;
    return new File([resultado.blob], `remito-${venta.id}.png`, { type: 'image/png' });
  };

  const enviarWhatsApp = async () => {
    const resumen = [
      `REMITO DE VENTA - ${NOMBRE_VIVERO}`,
      '',
      `Venta Nº: ${venta.id}`,
      `Fecha: ${formatearFecha(venta.fecha)}`,
      `Cliente: ${venta.clienteNombre || '-'}`,
      `Vendedor: ${venta.usuarioNombre || '-'}`,
      `Total final: ${formatearDinero(venta.totalFinal)}`,
      `Estado de pago: ${venta.estadoPago || '-'}`,
    ].join('\n');

    const telefono = normalizarTelefonoWhatsApp(venta.clienteTelefono || WHATSAPP_CONTACTO);

    const esDispositivoTactil = typeof window !== 'undefined'
      && window.matchMedia('(pointer: coarse)').matches;

    // Móvil/tablet: intenta Web Share con el PNG (abre WhatsApp app con la imagen lista para enviar).
    const puedeCompartirArchivo = esDispositivoTactil
      && typeof navigator !== 'undefined'
      && !!navigator.canShare && !!navigator.share;
    if (puedeCompartirArchivo) {
      try {
        const archivo = await generarArchivoCompartir();
        if (archivo && navigator.canShare({ files: [archivo] })) {
          await navigator.share({
            files: [archivo],
            title: `Remito de venta Nº ${venta.id}`,
            text: resumen,
          });
          pushToast('success', 'Comprobante compartido correctamente.');
          return;
        }
      } catch (error) {
        if (error && error.name === 'AbortError') return;
      }
    }

    // Desktop: los deep links de WhatsApp Web SOLO precargan texto, no pueden adjuntar archivos.
    // Para dejar la imagen "lista para enviar", se copia el PNG al portapapeles y se abre el chat SIN
    // texto; el usuario pega la imagen en el chat con Ctrl+V. Si el portapapeles no está disponible,
    // se abre con el resumen de texto (comportamiento previo).
    const copiarImagenAlPortapapeles = async () => {
      if (esDispositivoTactil || typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
        return false;
      }
      try {
        const archivo = await generarArchivoCompartir();
        if (!archivo) return false;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': archivo })]);
        return true;
      } catch (error) {
        return false; // API no disponible o permiso denegado → fallback a texto
      }
    };

    const construirUrl = (conTexto) => {
      // Con teléfono: web.whatsapp.com/send navega DIRECTAMENTE al chat del número si hay sesión de WhatsApp Web
      // (wa.me redirige con pantallas intermedias). Sin teléfono: wa.me sin número para que el usuario elija —
      // web.whatsapp.com/send con `phone=` vacío NO navega.
      const base = telefono
        ? `https://web.whatsapp.com/send?phone=${telefono}`
        : 'https://wa.me/';
      if (!conTexto) return base;
      return `${base}${telefono ? '&' : '?'}text=${encodeURIComponent(resumen)}`;
    };

    askConfirm({
      title: 'Enviar por WhatsApp',
      message: esDispositivoTactil
        ? 'Se abrirá WhatsApp con el resumen del remito precargado. ¿Deseás continuar?'
        : 'La imagen del remito se copiará y se abrirá el chat de WhatsApp listo para pegar (Ctrl+V). ¿Deseás continuar?',
      variant: 'warning',
      confirmLabel: 'Abrir WhatsApp',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        try {
          const imagenCopiada = await copiarImagenAlPortapapeles();
          const url = construirUrl(!imagenCopiada);
          // Reutilización de la MISMA pestaña de WhatsApp (mecanismo fiable):
          // - Guardamos la referencia DIRECTA de la ventana que abrimos (variable de módulo, sobrevive
          //   al cierre del modal). El nombre de ventana se pierde cuando WhatsApp redirige cross-origin,
          //   así que no se usa window.open('', NOMBRE) para recuperarla.
          // - Si la referencia sigue viva: navegamos la misma pestaña con location.href (permitido
          //   cross-origin para una ventana abierta por este script) y la enfocamos.
          // - Si no existe o fue cerrada: recién ahí creamos una con window.open(url, NOMBRE).
          let ventana = ventanaWhatsAppAbierta;
          if (ventana && !ventana.closed) {
            try {
              ventana.location.href = url;
            } catch (ignored) {
              // Navegación de la ventana existente bloqueada (muy raro): se recrea con nombre fijo.
              ventana = window.open(url, NOMBRE_VENTANA_WHATSAPP);
              ventanaWhatsAppAbierta = ventana;
            }
            ventana.focus();
          } else {
            ventana = window.open(url, NOMBRE_VENTANA_WHATSAPP);
            ventanaWhatsAppAbierta = ventana;
          }
          if (!ventana) {
            pushToast('error', 'No se pudo abrir WhatsApp. Verificá el bloqueo de ventanas emergentes.');
            return;
          }
          pushToast(
            'success',
            imagenCopiada
              ? 'WhatsApp abierto. Pegá la imagen del remito con Ctrl+V.'
              : 'WhatsApp abierto con el resumen de la venta.',
          );
        } catch (error) {
          pushToast('error', 'No se pudo abrir WhatsApp en este dispositivo.');
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Comprobante de Venta</h2>
              <p className="text-sm text-gray-500">Venta #{venta.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 bg-gray-50/50 p-6">
          <div
            ref={previewRef}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mx-auto max-w-lg"
          >
            <div className="flex justify-between items-start border-b-2 border-emerald-600 pb-4">
              <div>
                <p className="text-xl font-bold text-emerald-700">{NOMBRE_VIVERO}</p>
                <p className="text-sm text-gray-500 tracking-wide">REMITO DE VENTA</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">Nº {venta.id}</p>
                <p className="text-sm text-gray-500">{formatearFecha(venta.fecha)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Cliente</p>
                <p className="font-semibold text-gray-900">{venta.clienteNombre || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Vendedor</p>
                <p className="font-semibold text-gray-900">{venta.usuarioNombre || '-'}</p>
              </div>
            </div>

            <table className="w-full mt-5 text-sm">
              <thead>
                <tr className="bg-emerald-50 text-left text-xs uppercase tracking-wider text-emerald-700">
                  <th className="py-2 pr-2 font-semibold">Producto</th>
                  <th className="py-2 px-2 text-right font-semibold">Cant.</th>
                  <th className="py-2 px-2 text-right font-semibold">P. Unitario</th>
                  <th className="py-2 pl-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detalles.map((detalle) => (
                  <tr key={detalle.id || detalle.productoId}>
                    <td className="py-2.5 pr-2 text-gray-800">{detalle.productoNombre || '-'}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{detalle.cantidad}</td>
                    <td className="py-2.5 px-2 text-right text-gray-600">{formatearDinero(detalle.precioUnitarioHistorico)}</td>
                    <td className="py-2.5 pl-2 text-right font-semibold text-gray-900">{formatearDinero(detalle.subtotal)}</td>
                  </tr>
                ))}
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-3 text-center text-gray-400">Sin ítems</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <div className="w-60 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-800">{formatearDinero(venta.subtotal)}</span>
                </div>
                {Number(venta.descuento) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Descuento{Number(venta.porcentajeDescuento) > 0 ? ` (${venta.porcentajeDescuento}%)` : ''}
                    </span>
                    <span className="font-medium text-red-600">-{formatearDinero(venta.descuento)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="font-bold text-gray-900">Total Final</span>
                  <span className="font-bold text-emerald-700">{formatearDinero(venta.totalFinal)}</span>
                </div>
              </div>
            </div>

            {pagos.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Pagos</p>
                <ul className="space-y-1.5">
                  {pagos.map((pago, index) => (
                    <li key={pago.id || index} className="flex justify-between">
                      <span className="text-gray-600">{pago.metodoPago || '-'}</span>
                      <span className="font-medium text-gray-900">{formatearDinero(pago.monto)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex justify-between items-center border-t-2 border-emerald-600 pt-3">
              <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Estado de pago</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${estiloEstadoPago(venta.estadoPago)}`}>
                {venta.estadoPago || '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 p-6 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={descargarPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <FileDown className="w-4 h-4" /> Descargar PDF
          </button>
          <button
            onClick={descargarImagen}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <FileImage className="w-4 h-4" /> Descargar imagen
          </button>
          <button
            onClick={enviarWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComprobanteVentaModal;