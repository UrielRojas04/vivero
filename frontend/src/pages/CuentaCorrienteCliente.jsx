import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { ArrowLeft, FileText, FileDown, FileImage, MessageCircle, Share2, Plus, Check } from 'lucide-react';
import { clientesApi } from '../api/clientes.api';
import { ventasApi } from '../api/ventas.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { describirSaldo } from '../utils/saldoDisplay';
import { describirEstadoCheque } from '../utils/chequeDisplay';
import FormattedNumberInput from '../components/FormattedNumberInput';

// Página de cuenta corriente por cliente. Antes era un modal (FacturaClienteModal); se convirtió
// en página propia porque el documento necesitaba más lugar del que entra en un modal, tanto en
// computadora como en celular. Misma estética, mismos botones, mismo comportamiento: sólo cambia
// el contenedor (ruta con :id en vez de overlay) y cómo se vuelve atrás.

const NOMBRE_VIVERO = 'Vivero ERP';
const TITULO_DOCUMENTO = 'RESUMEN DE CUENTA';
const NOMBRE_VENTANA_WHATSAPP = 'whatsapp-cuenta';
// Referencia a nivel de MÓDULO (NO useRef): sobrevive a que el usuario navegue a otra pantalla y
// vuelva. NO se comparte con ComprobanteVentaModal.jsx (son dos documentos distintos).
let ventanaWhatsAppAbierta = null;

const formatearDinero = (valor) => {
  const numero = Number(valor) || 0;
  return `$${numero.toLocaleString('es-AR')}`;
};

// Fecha corta (dd/mm/aa) para las líneas del detalle: el documento se lee de un vistazo.
const formatearFechaCorta = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const formatearFecha = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleString('es-AR');
};

const truncarTexto = (texto, maxCaracteres) => {
  if (!texto) return '-';
  return texto.length > maxCaracteres ? `${texto.slice(0, maxCaracteres - 1)}…` : texto;
};

const calcularPagado = (venta) =>
  (venta.pagos || []).reduce((acc, pago) => acc + (Number(pago.monto) || 0), 0);

// Puede dar negativo si el cliente pagó de más: ese excedente es saldo a favor y se maneja en la
// cuenta corriente, no acá. Para el "TOTAL A PAGAR" se suma sólo la parte positiva.
const calcularPendiente = (venta) => (Number(venta.totalFinal) || 0) - calcularPagado(venta);

const estaPendiente = (venta) => calcularPendiente(venta) > 0;

// Una línea por ítem. El precio unitario sólo se agrega cuando la cantidad es mayor a 1, porque
// con cantidad 1 el unitario y el subtotal son el mismo número repetido.
const describirItem = (detalle) => {
  const nombre = detalle.productoNombre || '-';
  const cantidad = Number(detalle.cantidad) || 0;
  if (cantidad > 1) {
    return `${cantidad} × ${nombre} (${formatearDinero(detalle.precioUnitarioHistorico)} c/u)`;
  }
  return `${cantidad} × ${nombre}`;
};

const describirPago = (pago) => {
  const metodo = pago.metodoPago || 'PAGO';
  return `Pago ${metodo.toLowerCase()} · ${formatearFechaCorta(pago.fecha)}`;
};

const normalizarTelefonoWhatsApp = (tel) => {
  if (!tel) return '';
  const soloDigitos = String(tel).replace(/\D/g, '');
  if (!soloDigitos) return '';
  return soloDigitos.startsWith('00') ? soloDigitos.slice(2) : soloDigitos;
};

// Colores Tailwind -> RGB usados también para el PDF, para que el color del saldo sea consistente
// entre la vista previa (clases Tailwind vía describirSaldo) y el PDF (dibujado por coordenadas).
const RGB_POR_ESTADO = {
  DEUDA: [220, 38, 38],
  A_FAVOR: [5, 150, 105],
  NEUTRO: [107, 114, 128],
};

const CuentaCorrienteCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pushToast, askConfirm } = useUIStore();
  const queryClient = useQueryClient();
  const previewRef = useRef(null);

  const [seleccionadas, setSeleccionadas] = useState(() => new Set());
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarCheques, setMostrarCheques] = useState(true);
  // Oculta del documento (y de la vista) las ventas destildadas, para no tener que scrollear un
  // historial largo sólo para llegar al cierre. No cambia qué está seleccionado, sólo qué se ve.
  const [soloSeleccionadas, setSoloSeleccionadas] = useState(false);
  const checkTodasRef = useRef(null);
  // Filtro de rango para acotar el documento cuando el historial es largo. Vacío = sin límite.
  // Filtra qué ventas se pueden ver/seleccionar; no toca el saldo global, que sigue siendo sobre
  // todo el historial (por eso ese renglón queda aparte, aclarando que es "todas las ventas").
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [ventaPagoAbierto, setVentaPagoAbierto] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');

  const {
    data: factura,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['factura-cliente', id],
    queryFn: () => clientesApi.obtenerFactura(id),
    enabled: !!id,
  });

  // Al cargar (o recargar tras un pago) el documento arranca con las ventas que faltan pagar.
  // Las ya saldadas quedan en la lista pero desmarcadas, por si el jefe quiere incluirlas.
  useEffect(() => {
    if (factura?.ventas) {
      setSeleccionadas(new Set(factura.ventas.filter(estaPendiente).map((v) => v.id)));
    }
  }, [factura]);

  useEffect(() => {
    if (isError) {
      pushToast('error', getErrorMessage(error, 'No se pudo cargar la cuenta corriente del cliente.'));
      navigate('/clientes');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, error]);

  const pagoMutation = useMutation({
    mutationFn: ({ ventaId, payload }) => ventasApi.registrarPago(ventaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factura-cliente', id] });
      // El saldo del cliente cambió: invalidamos también el listado, para que al volver a
      // Clientes.jsx no quede mostrando el saldo anterior.
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      pushToast('success', 'Pago registrado correctamente.');
      setVentaPagoAbierto(null);
      setMontoPago('');
      setMetodoPago('EFECTIVO');
    },
    onError: (err) => {
      pushToast('error', getErrorMessage(err, 'No se pudo registrar el pago.'));
    },
  });

  const ventas = factura?.ventas || [];
  const cheques = factura?.cheques || [];

  // Rango de fechas: sólo acota qué se ve/incluye, no el saldo global.
  const ventasEnRango = ventas.filter((v) => {
    if (!v.fecha) return true;
    const fechaVenta = v.fecha.slice(0, 10); // 'YYYY-MM-DD...' -> comparable como string
    if (fechaDesde && fechaVenta < fechaDesde) return false;
    if (fechaHasta && fechaVenta > fechaHasta) return false;
    return true;
  });
  const hayRangoActivo = !!(fechaDesde || fechaHasta);
  const ventasOcultasPorRango = ventas.length - ventasEnRango.length;

  const ventasIncluidas = ventasEnRango.filter((v) => seleccionadas.has(v.id));
  const saldoFinal = factura ? describirSaldo(factura.balanceDinero) : null;
  const hayOtrosMovimientos = factura && Number(factura.diferenciaNoItemizada) !== 0;

  const totalIncluido = ventasIncluidas.reduce((acc, v) => acc + (Number(v.totalFinal) || 0), 0);
  const pagadoIncluido = ventasIncluidas.reduce((acc, v) => acc + calcularPagado(v), 0);
  const totalAPagar = ventasIncluidas.reduce((acc, v) => acc + Math.max(0, calcularPendiente(v)), 0);
  const hayPendientes = ventasEnRango.some(estaPendiente);

  // Qué se pinta en pantalla (y por lo tanto en el PNG/WhatsApp): con "sólo seleccionadas" activo,
  // las destildadas ni se dibujan, así no hay que scrollear un historial largo para llegar al
  // cierre. No afecta el PDF, que ya sólo dibuja ventasIncluidas independientemente de esto.
  const ventasVisibles = soloSeleccionadas
    ? ventasEnRango.filter((v) => seleccionadas.has(v.id))
    : ventasEnRango;

  const todasSeleccionadas = ventasEnRango.length > 0 && ventasEnRango.every((v) => seleccionadas.has(v.id));
  const algunaSeleccionada = ventasEnRango.some((v) => seleccionadas.has(v.id));

  useEffect(() => {
    if (checkTodasRef.current) {
      checkTodasRef.current.indeterminate = algunaSeleccionada && !todasSeleccionadas;
    }
  }, [algunaSeleccionada, todasSeleccionadas]);

  // Si se destilda la última venta seleccionada mientras "sólo seleccionadas" está activo, se
  // apaga el filtro solo: si no, el checkbox queda deshabilitado y tildado sin nada para mostrar.
  useEffect(() => {
    if (!algunaSeleccionada && soloSeleccionadas) {
      setSoloSeleccionadas(false);
    }
  }, [algunaSeleccionada, soloSeleccionadas]);

  const alternarSeleccion = (ventaId) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) next.delete(ventaId);
      else next.add(ventaId);
      return next;
    });
  };

  // Tilda o destilda todas las ventas actualmente en rango (respeta el filtro de fecha activo, si
  // hay uno: no toca selecciones de ventas que quedaron fuera del rango).
  const alternarSeleccionarTodas = () => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (todasSeleccionadas) {
        ventasEnRango.forEach((v) => next.delete(v.id));
      } else {
        ventasEnRango.forEach((v) => next.add(v.id));
      }
      return next;
    });
  };

  const abrirFormularioPago = (venta) => {
    setVentaPagoAbierto(venta.id);
    // Prellenado con lo que falta: el caso más común es que venga a saldar la venta entera.
    setMontoPago(String(Math.max(0, calcularPendiente(venta))));
    setMetodoPago('EFECTIVO');
  };

  const confirmarPago = (venta) => {
    const monto = Number(montoPago);
    if (!monto || monto <= 0) {
      pushToast('error', 'Ingresá un monto mayor a cero.');
      return;
    }
    pagoMutation.mutate({ ventaId: venta.id, payload: { monto, metodoPago } });
  };

  const nombreArchivoNormalizado = (nombre) =>
    String(nombre || 'cliente')
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cliente';

  const descargarPDF = () => {
    if (!factura) return;
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const MARGIN = 15;
      const colImporte = pageWidth - MARGIN;
      const pageBottom = pageHeight - 15;
      const lineH = 5;
      let y = 32;

      const saltoSiHaceFalta = (alto) => {
        if (y + alto > pageBottom) {
          doc.addPage();
          y = 20;
        }
      };

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(NOMBRE_VIVERO, MARGIN, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(TITULO_DOCUMENTO, MARGIN, 16.5);
      doc.setFontSize(9);
      doc.text(formatearFecha(factura.fechaGeneracion), colImporte, 16.5, { align: 'right' });

      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(truncarTexto(factura.clienteNombre, 50), MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      const subtitulo = [
        factura.clienteTelefono ? `Tel: ${factura.clienteTelefono}` : null,
        `${ventasIncluidas.length} venta(s) en este resumen`,
      ].filter(Boolean).join('  ·  ');
      doc.text(subtitulo, MARGIN, y);
      y += 7;

      // Único encabezado de columnas de todo el documento.
      doc.setDrawColor(209, 213, 219);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('DETALLE', MARGIN, y);
      doc.text('FALTA PAGAR', colImporte, y, { align: 'right' });
      y += 2;
      doc.line(MARGIN, y, colImporte, y);
      y += 5;

      if (ventasIncluidas.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text('Sin ventas pendientes de pago.', MARGIN, y);
        y += 8;
      }

      ventasIncluidas.forEach((venta) => {
        const pagado = calcularPagado(venta);
        const pendiente = calcularPendiente(venta);
        saltoSiHaceFalta(lineH * 2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(4, 120, 87);
        doc.text(`Venta Nº ${venta.id} · ${formatearFechaCorta(venta.fecha)}`, MARGIN, y);
        if (pendiente > 0) {
          doc.setTextColor(220, 38, 38);
          doc.text(formatearDinero(pendiente), colImporte, y, { align: 'right' });
        } else {
          doc.setTextColor(5, 150, 105);
          doc.text('PAGADA', colImporte, y, { align: 'right' });
        }
        y += lineH;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(107, 114, 128);
        doc.text(`Total ${formatearDinero(venta.totalFinal)}  ·  Pagado ${formatearDinero(pagado)}`, MARGIN + 4, y);
        y += lineH;

        if (mostrarDetalle) {
          doc.setFontSize(9);
          (venta.detalles || []).forEach((detalle) => {
            saltoSiHaceFalta(lineH);
            doc.setTextColor(75, 85, 99);
            doc.text(truncarTexto(describirItem(detalle), 62), MARGIN + 4, y);
            doc.text(formatearDinero(detalle.subtotal), colImporte, y, { align: 'right' });
            y += lineH;
          });
        }

        // Los pagos siempre se muestran: son la prueba de lo que el cliente fue trayendo.
        doc.setFontSize(9);
        (venta.pagos || []).forEach((pago) => {
          saltoSiHaceFalta(lineH);
          doc.setTextColor(5, 150, 105);
          doc.text(truncarTexto(describirPago(pago), 62), MARGIN + 4, y);
          doc.text(`-${formatearDinero(pago.monto)}`, colImporte, y, { align: 'right' });
          y += lineH;
        });

        y += 2.5;
      });

      // Cheques sueltos del cliente: única parte de "otros movimientos" con registro real.
      if (cheques.length > 0 && mostrarCheques) {
        saltoSiHaceFalta(lineH * 2);
        y += 1;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('CHEQUES', MARGIN, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        cheques.forEach((cheque) => {
          saltoSiHaceFalta(lineH);
          const estadoCheque = describirEstadoCheque(cheque);
          const linea = `${formatearFechaCorta(cheque.fechaRecepcion)} · ${cheque.banco || 'Suelto'}`
            + (cheque.numeroSerie ? ` Nº${cheque.numeroSerie}` : '') + ` · ${estadoCheque.etiqueta}`;
          doc.setTextColor(75, 85, 99);
          doc.text(truncarTexto(linea, 62), MARGIN + 4, y);
          doc.text(formatearDinero(cheque.monto), colImporte, y, { align: 'right' });
          y += lineH;
        });
        y += 1.5;
      }

      saltoSiHaceFalta(34);
      doc.setDrawColor(16, 185, 129);
      doc.line(MARGIN, y, colImporte, y);
      y += 6;

      const filaTotal = (label, value, bold, colorRgb) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(bold ? 13 : 9);
        doc.setTextColor(...(colorRgb || [31, 41, 55]));
        doc.text(label, MARGIN, y);
        doc.text(value, colImporte, y, { align: 'right' });
        y += bold ? 8 : 5.5;
      };
      filaTotal('Total de las ventas incluidas', formatearDinero(totalIncluido), false);
      filaTotal('Pagado', formatearDinero(pagadoIncluido), false);
      y += 1.5;
      filaTotal('TOTAL A PAGAR', formatearDinero(totalAPagar), true, [220, 38, 38]);

      // Dato informativo y separado: el saldo de cuenta corriente es global del cliente y puede
      // no coincidir con el total de arriba, que es sólo de las ventas incluidas.
      y += 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      const colorSaldo = RGB_POR_ESTADO[saldoFinal.estado] || RGB_POR_ESTADO.NEUTRO;
      doc.text('Saldo de cuenta corriente del cliente (todas las ventas):', MARGIN, y);
      doc.setTextColor(...colorSaldo);
      doc.text(`${saldoFinal.etiqueta} $${saldoFinal.monto}`, colImporte, y, { align: 'right' });
      y += 5;
      if (hayOtrosMovimientos) {
        doc.setTextColor(107, 114, 128);
        doc.text('Incluye otros ajustes sin detalle disponible:', MARGIN, y);
        doc.text(formatearDinero(factura.diferenciaNoItemizada), colImporte, y, { align: 'right' });
      }

      const nombreArchivo = `cuenta-${factura.clienteId}-${nombreArchivoNormalizado(factura.clienteNombre)}.pdf`;
      doc.save(nombreArchivo);
      pushToast('success', 'PDF de la cuenta corriente descargado correctamente.');
    } catch (err) {
      pushToast('error', 'No se pudo generar el PDF de la cuenta corriente.');
    }
  };

  const generarPngDePreview = async () => {
    const nodo = previewRef.current;
    if (!nodo) return null;

    const clon = nodo.cloneNode(true);
    // Los checkboxes y botones de "Registrar pago" son herramientas de trabajo, no parte del papel
    // que se le entrega al cliente: se sacan del clon antes de rasterizar.
    clon.querySelectorAll('[data-export-hide]').forEach((el) => el.remove());

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    const anchoMinimo = Math.max(nodo.offsetWidth, 500);
    wrapper.style.width = `${anchoMinimo}px`;
    clon.style.width = '100%';
    clon.style.maxWidth = 'none';
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

  const esDispositivoTactil = typeof window !== 'undefined'
    && window.matchMedia('(pointer: coarse)').matches;

  const soportaCompartirArchivos = esDispositivoTactil
    && typeof navigator !== 'undefined'
    && !!navigator.canShare && !!navigator.share;

  const nombreArchivoImagen = () => `cuenta-${factura?.clienteId}-${nombreArchivoNormalizado(factura?.clienteNombre)}.png`;

  const descargarImagen = async () => {
    if (!factura) return;
    try {
      const resultado = await generarPngDePreview();
      if (!resultado) return;

      if (soportaCompartirArchivos) {
        const archivo = new File([resultado.blob], nombreArchivoImagen(), { type: 'image/png' });
        if (navigator.canShare({ files: [archivo] })) {
          try {
            await navigator.share({
              files: [archivo],
              title: `${TITULO_DOCUMENTO} - ${factura.clienteNombre || ''}`,
            });
            pushToast('success', 'Cuenta corriente compartida correctamente.');
            return;
          } catch (shareErr) {
            if (shareErr?.name === 'AbortError') return;
          }
        }
      }

      const enlace = document.createElement('a');
      enlace.href = resultado.dataUrl;
      enlace.download = nombreArchivoImagen();
      enlace.click();
      pushToast('success', 'Imagen de la cuenta corriente descargada correctamente.');
    } catch (err) {
      pushToast('error', 'No se pudo generar la imagen de la cuenta corriente.');
    }
  };

  const generarArchivoCompartir = async () => {
    const resultado = await generarPngDePreview();
    if (!resultado) return null;
    return new File([resultado.blob], nombreArchivoImagen(), { type: 'image/png' });
  };

  const enviarWhatsApp = async () => {
    if (!factura) return;

    const resumen = [
      `${TITULO_DOCUMENTO} - ${NOMBRE_VIVERO}`,
      '',
      `Cliente: ${factura.clienteNombre || '-'}`,
      `Fecha: ${formatearFecha(factura.fechaGeneracion)}`,
      `Ventas incluidas: ${ventasIncluidas.length}`,
      `Total a pagar: ${formatearDinero(totalAPagar)}`,
    ].join('\n');

    const telefono = normalizarTelefonoWhatsApp(factura.clienteTelefono);

    const puedeCompartirArchivo = esDispositivoTactil
      && typeof navigator !== 'undefined'
      && !!navigator.canShare && !!navigator.share;
    if (puedeCompartirArchivo) {
      try {
        const archivo = await generarArchivoCompartir();
        if (archivo && navigator.canShare({ files: [archivo] })) {
          await navigator.share({
            files: [archivo],
            title: `${TITULO_DOCUMENTO} - ${factura.clienteNombre || ''}`,
            text: resumen,
          });
          pushToast('success', 'Cuenta corriente compartida correctamente.');
          return;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    const copiarImagenAlPortapapeles = async () => {
      if (esDispositivoTactil || typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
        return false;
      }
      try {
        const archivo = await generarArchivoCompartir();
        if (!archivo) return false;
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': archivo })]);
        return true;
      } catch (err) {
        return false;
      }
    };

    const construirUrl = (conTexto) => {
      if (esDispositivoTactil) {
        const base = telefono
          ? `https://api.whatsapp.com/send?phone=${telefono}`
          : 'https://api.whatsapp.com/send';
        if (!conTexto) return base;
        return `${base}${telefono ? '&' : '?'}text=${encodeURIComponent(resumen)}`;
      }
      const base = telefono
        ? `https://web.whatsapp.com/send?phone=${telefono}`
        : 'https://wa.me/';
      if (!conTexto) return base;
      return `${base}${telefono ? '&' : '?'}text=${encodeURIComponent(resumen)}`;
    };

    askConfirm({
      title: 'Enviar por WhatsApp',
      message: esDispositivoTactil
        ? 'Se abrirá WhatsApp con el resumen de la cuenta precargado. ¿Deseás continuar?'
        : 'La imagen de la cuenta se copiará y se abrirá el chat de WhatsApp listo para pegar (Ctrl+V). ¿Deseás continuar?',
      variant: 'warning',
      confirmLabel: 'Abrir WhatsApp',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        try {
          const imagenCopiada = await copiarImagenAlPortapapeles();
          const url = construirUrl(!imagenCopiada);
          let ventana = ventanaWhatsAppAbierta;
          if (ventana && !ventana.closed) {
            try {
              ventana.location.href = url;
            } catch (ignored) {
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
              ? 'WhatsApp abierto. Pegá la imagen de la cuenta con Ctrl+V.'
              : 'WhatsApp abierto con el resumen de la cuenta.',
          );
        } catch (err) {
          pushToast('error', 'No se pudo abrir WhatsApp en este dispositivo.');
        }
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Encabezado de la página: volver + título + acciones de exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/clientes')}
            title="Volver a Clientes"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">Cuenta Corriente</h1>
            <p className="text-sm text-gray-500 truncate">
              {isLoading ? 'Cargando…' : (factura?.clienteNombre || '-')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={descargarPDF}
            disabled={!factura}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={descargarImagen}
            disabled={!factura}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {soportaCompartirArchivos
              ? <><Share2 className="w-4 h-4" /> Compartir</>
              : <><FileImage className="w-4 h-4" /> Imagen</>
            }
          </button>
          <button
            onClick={enviarWhatsApp}
            disabled={!factura}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors shadow-sm cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Barra de armado del documento: qué entra y con cuánto detalle. No es parte del papel. */}
      {factura && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-3 sm:px-5 py-2.5 text-xs space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
              <input
                ref={checkTodasRef}
                type="checkbox"
                checked={todasSeleccionadas}
                onChange={alternarSeleccionarTodas}
                disabled={ventasEnRango.length === 0}
                className="accent-emerald-600 cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
              />
              Todas
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-700">
              <input
                type="checkbox"
                checked={mostrarDetalle}
                onChange={(e) => setMostrarDetalle(e.target.checked)}
                className="accent-emerald-600 cursor-pointer flex-shrink-0"
              />
              Incluir detalle de productos
            </label>
            {cheques.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-gray-700">
                <input
                  type="checkbox"
                  checked={mostrarCheques}
                  onChange={(e) => setMostrarCheques(e.target.checked)}
                  className="accent-emerald-600 cursor-pointer flex-shrink-0"
                />
                Mostrar cheques
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-gray-700">
              <input
                type="checkbox"
                checked={soloSeleccionadas}
                onChange={(e) => setSoloSeleccionadas(e.target.checked)}
                disabled={!algunaSeleccionada}
                className="accent-emerald-600 cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
              />
              Mostrar sólo seleccionadas
            </label>
            <span className="text-gray-500">
              {ventasIncluidas.length} de {ventasEnRango.length} venta(s)
              {ventasOcultasPorRango > 0 ? ` (${ventasOcultasPorRango} fuera del rango)` : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-gray-600">
            <span className="flex-shrink-0">Rango:</span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              max={fechaHasta || undefined}
              className="min-w-0 flex-1 px-1.5 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
            />
            <span className="flex-shrink-0">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              min={fechaDesde || undefined}
              className="min-w-0 flex-1 px-1.5 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
            />
            {hayRangoActivo && (
              <button
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                className="flex-shrink-0 text-emerald-700 hover:underline cursor-pointer"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      )}

      {factura && (
        <div
          ref={previewRef}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8 mx-auto max-w-2xl"
        >
          <div className="flex justify-between items-start gap-3 border-b-2 border-emerald-600 pb-3">
            <div>
              <p className="text-lg font-bold text-emerald-700 leading-tight">{NOMBRE_VIVERO}</p>
              <p className="text-xs text-gray-500 tracking-wide">{TITULO_DOCUMENTO}</p>
            </div>
            <p className="text-xs text-gray-500 text-right flex-shrink-0">{formatearFecha(factura.fechaGeneracion)}</p>
          </div>

          <div className="mt-3">
            <p className="font-bold text-gray-900 text-lg leading-tight">{factura.clienteNombre || '-'}</p>
            <p className="text-xs text-gray-500">
              {factura.clienteTelefono ? `Tel: ${factura.clienteTelefono}  ·  ` : ''}
              {ventasIncluidas.length} venta(s) en este resumen
            </p>
          </div>

          {/* ÚNICO encabezado de columnas de todo el documento */}
          <div className="mt-4 flex justify-between text-[11px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-200 pb-1.5">
            <span>Detalle</span>
            <span>Falta pagar</span>
          </div>

          {ventas.length === 0 && (
            <div className="mt-4 text-center text-gray-500 text-sm py-6 border border-dashed border-gray-200 rounded-lg">
              Este cliente no tiene ventas registradas.
            </div>
          )}

          {ventas.length > 0 && ventasEnRango.length === 0 && (
            <div className="mt-4 text-center text-gray-500 text-sm py-6 border border-dashed border-gray-200 rounded-lg">
              Ninguna venta cae dentro del rango de fechas elegido.
            </div>
          )}

          {ventasEnRango.length > 0 && !hayPendientes && ventasIncluidas.length === 0 && (
            <div className="mt-4 text-center text-emerald-700 bg-emerald-50 text-sm py-4 px-3 rounded-lg">
              {hayRangoActivo ? 'Sin ventas pendientes en el rango elegido.' : 'Este cliente no tiene ventas pendientes de pago.'}
            </div>
          )}

          {ventasVisibles.map((venta) => {
            const incluida = seleccionadas.has(venta.id);
            const pagado = calcularPagado(venta);
            const pendiente = calcularPendiente(venta);
            const pagosDeLaVenta = venta.pagos || [];

            // En pantalla las no incluidas se ven atenuadas, para poder tildarlas de nuevo.
            // data-export-hide (sólo cuando NO está incluida) las saca del PNG/WhatsApp igual que
            // ya se sacan del PDF con ventasIncluidas: las tres exportaciones respetan la misma
            // selección, ninguna debe mostrar una venta destildada.
            return (
              <div
                key={venta.id}
                data-export-hide={incluida ? undefined : true}
                className={`mt-3 pb-3 border-b border-gray-100 last:border-b-0 ${incluida ? '' : 'opacity-40'}`}
              >
                <div className="flex justify-between items-baseline gap-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      data-export-hide
                      checked={incluida}
                      onChange={() => alternarSeleccion(venta.id)}
                      className="accent-emerald-600 cursor-pointer flex-shrink-0"
                    />
                    <span className="font-bold text-emerald-700 truncate">
                      Venta Nº {venta.id} <span className="text-gray-400 font-normal">· {formatearFechaCorta(venta.fecha)}</span>
                    </span>
                  </span>
                  {pendiente > 0 ? (
                    <span className="font-bold text-red-600 flex-shrink-0">{formatearDinero(pendiente)}</span>
                  ) : (
                    <span className="font-semibold text-emerald-600 text-xs flex-shrink-0">PAGADA</span>
                  )}
                </div>

                <div className="text-xs text-gray-500 pl-6 mt-0.5">
                  Total {formatearDinero(venta.totalFinal)} · Pagado {formatearDinero(pagado)}
                </div>

                {mostrarDetalle && (venta.detalles || []).map((detalle) => (
                  <div
                    key={detalle.id || detalle.productoId}
                    className="flex justify-between items-baseline gap-2 text-xs text-gray-600 pl-6 mt-0.5"
                  >
                    <span className="break-words">{describirItem(detalle)}</span>
                    <span className="flex-shrink-0">{formatearDinero(detalle.subtotal)}</span>
                  </div>
                ))}

                {pagosDeLaVenta.map((pago, index) => (
                  <div
                    key={pago.id || index}
                    className="flex justify-between items-baseline gap-2 text-xs text-emerald-600 pl-6 mt-0.5"
                  >
                    <span>{describirPago(pago)}</span>
                    <span className="font-medium flex-shrink-0">-{formatearDinero(pago.monto)}</span>
                  </div>
                ))}

                {/* Registrar pago: el cliente vino y trajo plata por esta venta */}
                {pendiente > 0 && ventaPagoAbierto !== venta.id && (
                  <button
                    data-export-hide
                    onClick={() => abrirFormularioPago(venta)}
                    className="mt-1.5 ml-6 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Registrar pago
                  </button>
                )}

                {ventaPagoAbierto === venta.id && (
                  <div data-export-hide className="mt-2 ml-6 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg flex flex-wrap gap-2 items-stretch">
                    <FormattedNumberInput
                      value={montoPago}
                      onChange={setMontoPago}
                      placeholder="Monto"
                      className="flex-1 min-w-[100px] px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="flex-1 min-w-[110px] px-2 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => confirmarPago(venta)}
                        disabled={pagoMutation.isPending}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Guardar
                      </button>
                      <button
                        onClick={() => setVentaPagoAbierto(null)}
                        className="flex-1 sm:flex-none px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Cheques sueltos del cliente: la única parte de "otros movimientos" con registro
              real. Los ajustes manuales de saldo no tienen historial (ver renglón informativo
              del cierre) y por eso no pueden desglosarse acá. */}
          {cheques.length > 0 && mostrarCheques && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">
                Cheques
              </p>
              <div className="space-y-1">
                {cheques.map((cheque) => {
                  const estadoCheque = describirEstadoCheque(cheque);
                  return (
                    <div key={cheque.id} className="flex justify-between items-baseline gap-2 text-xs">
                      <span className="text-gray-600">
                        {formatearFechaCorta(cheque.fechaRecepcion)} · {cheque.banco || 'Suelto'}
                        {cheque.numeroSerie ? ` Nº${cheque.numeroSerie}` : ''}
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${estadoCheque.tono.chip}`}>
                          {estadoCheque.etiqueta}
                        </span>
                      </span>
                      <span className="font-medium text-gray-800 flex-shrink-0">{formatearDinero(cheque.monto)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cierre orientado a la deuda */}
          <div className="mt-4 pt-3 border-t-2 border-emerald-600 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total de las ventas incluidas</span>
              <span className="font-medium text-gray-800">{formatearDinero(totalIncluido)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pagado</span>
              <span className="font-medium text-gray-800">{formatearDinero(pagadoIncluido)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-gray-900">TOTAL A PAGAR</span>
              <span className="text-2xl font-bold text-red-600">{formatearDinero(totalAPagar)}</span>
            </div>

            {/* Informativo: el saldo de cuenta corriente es global y puede no coincidir con el
                total de arriba, que corresponde sólo a las ventas incluidas en este resumen. */}
            <div className="pt-2 mt-1 border-t border-gray-100 space-y-0.5">
              <div className="flex justify-between gap-2 text-xs">
                <span className="text-gray-400">Saldo de cuenta corriente (todas las ventas)</span>
                <span className={`font-medium flex-shrink-0 ${saldoFinal.tono.texto}`}>
                  {saldoFinal.etiqueta} $ {saldoFinal.monto}
                </span>
              </div>
              {hayOtrosMovimientos && (
                <div className="flex justify-between gap-2 text-xs">
                  <span className="text-gray-400">Incluye otros ajustes sin detalle disponible</span>
                  <span className="text-gray-500 flex-shrink-0">{formatearDinero(factura.diferenciaNoItemizada)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentaCorrienteCliente;
