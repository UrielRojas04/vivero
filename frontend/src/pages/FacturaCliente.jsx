import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFacturaActiva, getHistorialFacturas, cerrarFactura, agregarConceptoFactura, registrarPagoFactura, abrirFacturaManual, rechazarPagoFactura } from '../api/facturas.api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errorMessage';
import api from '../api/axios';
import { ArrowLeft, CheckCircle, CheckCircle2, FileText, Plus, PlusCircle, Receipt, Box, Tag, FileClock, History, XCircle, Download, Lock, Phone, ChevronDown, ChevronUp, TrendingUp, AlertTriangle, PackageMinus } from 'lucide-react';
import FormattedNumberInput from '../components/FormattedNumberInput';
import { toPng } from 'html-to-image';
const formatFecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatFechaLarga = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

const formatearDinero = (valor) => {
  const numero = Number(valor) || 0;
  return `$${numero.toLocaleString('es-AR')}`;
};

// Chip neutro para el método de pago: separa "cómo se pagó" (siempre neutral, informativo)
// de "cuánto se abonó" (color semántico: ok/warn/danger), que es lo que la referencia
// visual muestra — el método nunca lleva el color de estado, sólo el monto lo lleva.
const MetodoPagoChip = ({ metodo, rechazado }) => (
  <span
    className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border whitespace-nowrap ${
      rechazado
        ? 'bg-danger-bg text-danger border-danger-line line-through'
        : 'bg-thead text-body border-line'
    }`}
  >
    {metodo}
  </span>
);

// Espera a que el próximo frame de pintado termine (doble rAF). Garantiza que un cambio
// de estado/estilo ya fue aplicado y reflejado en el layout antes de continuar, a
// diferencia de un setTimeout de duración fija que puede disparar antes de que el
// navegador termine de reflowar.
const esperarProximoFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

// html-to-image clona el nodo y "congela" el estilo COMPUTADO de cada descendiente tal
// como está en ese instante (ver cloneCSSStyle en su código fuente); la opción
// `width`/`style` de toPng sólo sobreescribe el ancho del nodo RAÍZ del clon. En mobile,
// donde el ancho real de pantalla es ~375-414px, eso deja a los hijos (tablas, columnas)
// congelados a su ancho angosto dentro de un lienzo más ancho: el contenido no reflowa,
// y columnas/filas enteras terminan sin renderizarse dentro de la imagen final.
// Para evitarlo, forzamos el ANCHO REAL del nodo en vivo a 1000px, esperamos el reflow
// real del navegador, y recién ahí lo capturamos: así cada descendiente ya tiene el
// layout correcto de 1000px cuando html-to-image copia sus estilos computados.
//
// IMPORTANTE: NO usar `position: fixed; left: -9999px` para "esconder" el nodo mientras
// reflowa (como se intentó antes). `cloneCSSStyle` (clone-node.js de html-to-image) copia
// el estilo COMPUTADO del nodo RAÍZ también sobre el clon raíz, incluyendo `position` y
// `left`. Ese clon se inserta luego dentro de un <foreignObject> de un SVG aislado (su
// propio "viewport" de renderizado, del tamaño exacto width x height pasado a toPng): al
// heredar `position: fixed; left: -9999px`, el contenido se posiciona 9999px a la
// izquierda DENTRO de ese SVG y queda fuera del área visible de la imagen final →
// resultado en blanco (reproducido en desktop y mobile, no sólo mobile). Por la misma
// razón tampoco sirve `opacity: 0` ni `visibility: hidden` en el nodo (se heredan/copian
// igual y el clon sale transparente/invisible). Por eso el nodo se ensancha EN SU
// POSICIÓN NORMAL del documento (sin tocar `position`); el flash de reflow de 1-2 frames
// se tapa con el overlay `isExporting` ya existente en el JSX, y `overflow: hidden` en
// <html>/<body> evita que aparezca un scroll horizontal momentáneo mientras el nodo mide
// 1000px de ancho.
const capturarNodoComoImagen = async (nodo) => {
  const estiloPrevio = {
    width: nodo.style.width,
    maxWidth: nodo.style.maxWidth,
  };
  const overflowPrevio = {
    html: document.documentElement.style.overflow,
    body: document.body.style.overflow,
  };

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  nodo.style.width = '1000px';
  nodo.style.maxWidth = '1000px';

  // Doble rAF: garantiza que el navegador ya reflowó el contenido al nuevo ancho
  // antes de medir la altura real y de pasársela a toPng.
  await esperarProximoFrame();

  try {
    const alturaReal = nodo.scrollHeight;
    return await toPng(nodo, {
      quality: 1.0,
      backgroundColor: '#f9fafb', // gray-50
      width: 1000,
      height: alturaReal,
      pixelRatio: 2
    });
  } finally {
    nodo.style.width = estiloPrevio.width;
    nodo.style.maxWidth = estiloPrevio.maxWidth;
    document.documentElement.style.overflow = overflowPrevio.html;
    document.body.style.overflow = overflowPrevio.body;
  }
};

const FacturaCliente = () => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { pushToast, askConfirm } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();

  const [factura, setFactura] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [devolucionesBandejas, setDevolucionesBandejas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activa'); // 'activa' | 'historial'
  const [isExporting, setIsExporting] = useState(false);

  const facturaRef = React.useRef(null);

  // Estado para el modal de nuevo concepto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conceptoDesc, setConceptoDesc] = useState('');
  const [conceptoMonto, setConceptoMonto] = useState('');

  // Estado para el modal de pago
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('EFECTIVO');
  const [pagoBanco, setPagoBanco] = useState('');
  const [pagoNumeroSerie, setPagoNumeroSerie] = useState('');
  const [pagoFechaCobro, setPagoFechaCobro] = useState('');

  // Estado para la factura del historial expandida
  const [expandedFacturaId, setExpandedFacturaId] = useState(null);

  const fetchFacturaData = async () => {
    try {
      setLoading(true);
      const data = await getFacturaActiva(clienteId);
      setFactura(data || null); // null if 204 No Content
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al cargar la factura activa'));
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    try {
      const data = await getHistorialFacturas(clienteId);
      setHistorial(data);
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al cargar historial'));
    }
  };

  // Sólo se pide en Vivero (unidadNegocioActiva === '1'): es el mismo gating que el chip
  // de saldo de bandejas (tarea 3.3), y estos datos sólo se muestran ahí. Se filtra acá,
  // en el frontend, a las DEVOLUCIONes: las ENTREGAs ya se ven reflejadas en la columna
  // Cant. de la tabla de ventas y mostrarlas de nuevo sería redundante.
  const fetchDevolucionesBandejas = async () => {
    try {
      const response = await api.get(`/clientes/${clienteId}/bandejas/historial`);
      setDevolucionesBandejas(response.data.filter((mov) => mov.tipo === 'DEVOLUCION'));
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al cargar el historial de bandejas'));
    }
  };

  useEffect(() => {
    fetchFacturaData();
    fetchHistorial();
    if (unidadNegocioActiva === '1') {
      fetchDevolucionesBandejas();
    }
  }, [clienteId, unidadNegocioActiva]);

  const handleCerrarFactura = () => {
    if (!factura) return;
    askConfirm({
      title: 'Cerrar Factura',
      message: '¿Estás seguro que deseas CERRAR esta factura? Se generará una nueva cuando el cliente compre de nuevo.',
      confirmLabel: 'Sí, cerrar factura',
      variant: 'primary',
      onConfirm: async () => {
        try {
          await cerrarFactura(factura.id);
          pushToast('success', 'Factura cerrada exitosamente');
          fetchFacturaData();
          fetchHistorial();
        } catch (err) {
          pushToast('error', getErrorMessage(err, 'Error al cerrar la factura'));
        }
      }
    });
  };

  const handleAgregarConcepto = async (e) => {
    e.preventDefault();
    if (!factura) return;
    if (!conceptoDesc.trim() || !conceptoMonto) return;

    try {
      const updatedFactura = await agregarConceptoFactura(factura.id, {
        descripcion: conceptoDesc,
        monto: parseFloat(conceptoMonto)
      });
      pushToast('success', 'Concepto extra agregado');
      setIsModalOpen(false);
      setConceptoDesc('');
      setConceptoMonto('');
      setFactura(updatedFactura);
      fetchHistorial();
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al agregar concepto'));
    }
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!factura) return;
    if (!pagoMonto) return;

    try {
      const updatedFactura = await registrarPagoFactura(factura.id, {
        monto: parseFloat(pagoMonto),
        metodoPago: pagoMetodo,
        banco: pagoMetodo === 'CHEQUE' ? pagoBanco : undefined,
        numeroSerie: pagoMetodo === 'CHEQUE' ? pagoNumeroSerie : undefined,
        fechaCobro: pagoMetodo === 'CHEQUE' ? pagoFechaCobro : undefined
      });
      pushToast('success', 'Pago registrado');
      setIsPagoModalOpen(false);
      setPagoMonto('');
      setPagoMetodo('EFECTIVO');
      setPagoBanco('');
      setPagoNumeroSerie('');
      setPagoFechaCobro('');
      setFactura(updatedFactura);
      fetchHistorial();
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al registrar pago'));
    }
  };

  const handleAbrirManual = async () => {
    try {
      await abrirFacturaManual(clienteId);
      pushToast('success', 'Factura abierta correctamente');
      fetchFacturaData();
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Error al abrir factura manual'));
    }
  };

  const handleDescargarImagen = async () => {
    if (!facturaRef.current) return;
    try {
      pushToast('info', 'Generando imagen...');
      setIsExporting(true);
      // Wait for React to re-render without the UI elements (buttons/stats hidden)
      await esperarProximoFrame();
      // Asegura que IBM Plex Sans (font-factura) ya esté descargada por el navegador antes
      // de capturar: si el primer clic en "Descargar" ocurre antes de que termine de bajar
      // el @font-face de Google Fonts, html-to-image congelaría el estilo computado todavía
      // con la fuente de fallback del sistema.
      await document.fonts.ready;

      const dataUrl = await capturarNodoComoImagen(facturaRef.current);
      const link = document.createElement('a');
      link.download = `Factura_${factura?.id}_${factura?.clienteNombre}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      pushToast('error', 'Error al generar la imagen. Intentá de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div></div>;
  }

  const renderFacturaCompleta = (f, isActive = false) => {
    if (!f) return (
      <div className="bg-paper p-12 text-center rounded-panel border border-line flex flex-col items-center">
        <Receipt className="w-16 h-16 text-faint mb-4" />
        <h3 className="text-xl font-bold text-ink mb-2">Sin Factura Activa</h3>
        <p className="text-muted max-w-md mx-auto mb-6">
          El cliente no tiene ventas pendientes de facturar. Al registrar una nueva venta en Vivero, se abrirá una nueva factura automáticamente.
        </p>
        <button
          onClick={handleAbrirManual}
          className="px-4 py-2 bg-accent-soft border border-accent text-accent-ink rounded-base hover:brightness-95 flex items-center gap-2 font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Abrir Factura Manualmente
        </button>
      </div>
    );

    // `devolucionesBandejas` es la lista completa del cliente (fetch único, sin scope por
    // factura — el backend no tiene un endpoint que la devuelva ya recortada). Cada factura
    // (activa o cerrada del historial) filtra acá su propio rango: desde su apertura hasta su
    // cierre, o hasta ahora si sigue activa.
    const devolucionesBandejasDeEstaFactura = devolucionesBandejas.filter((mov) => {
      const fechaMov = new Date(mov.fecha);
      if (fechaMov < new Date(f.fechaApertura)) return false;
      if (!isActive && f.fechaCierre && fechaMov > new Date(f.fechaCierre)) return false;
      return true;
    });

    // Bandejas adeudadas de ESTA factura (pedido del usuario, corrige el uso anterior de
    // f.saldoBandejas): NO es el saldo global del cliente — se calcula sumando la columna Cant.
    // de cada línea vendida en esta factura puntual (cada unidad de producto vendida sale en una
    // bandeja) y restando las devoluciones registradas dentro del rango de esta misma factura
    // (ya calculadas arriba). f.saldoBandejas (el campo del DTO, saldo global del cliente) queda
    // sin usar en esta pantalla a partir de acá, pero no se tocó el backend — sigue existiendo
    // por si hace falta en otro lado más adelante.
    const bandejasEntregadasEnEstaFactura = (f.ventas || []).reduce(
      (sum, v) => sum + v.detalles.reduce((s, d) => s + d.cantidad, 0), 0
    );
    const bandejasDevueltasEnEstaFactura = devolucionesBandejasDeEstaFactura.reduce((sum, mov) => sum + mov.cantidad, 0);
    // Bug real reportado por el usuario: si el cliente devuelve más bandejas de las que se llevó
    // DENTRO de esta factura puntual, el resultado daba negativo — confuso, porque en realidad
    // esas de más están pagando una deuda de una factura ANTERIOR, no una deuda negativa de ésta.
    // Se separa en dos números: el adeudado de esta factura nunca baja de 0, y lo que sobra
    // (si sobra) se muestra aparte, aclarando que corresponde a otra factura.
    const balanceBandejasEstaFactura = bandejasEntregadasEnEstaFactura - bandejasDevueltasEnEstaFactura;
    const bandejasAdeudadasEnEstaFactura = Math.max(0, balanceBandejasEstaFactura);
    const bandejasExcedentesDeEstaFactura = Math.max(0, -balanceBandejasEstaFactura);

    return (
      <div className={`${isExporting ? 'p-6 bg-canvas force-light-export' : ''}`} ref={isActive ? facturaRef : null}>
      <div className={`bg-paper border border-line rounded-panel overflow-hidden ${isExporting ? 'border-line-strong' : ''}`}>
        {/* Cabecera de la Factura */}
        <div className="bg-thead/60 p-6">
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-lg font-bold text-ink">
                  Factura #{f.id} - {f.clienteNombre}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${f.estado === 'ABIERTA' ? 'bg-ok-bg text-ok-ink' : 'bg-thead text-body border border-line'}`}>
                  {f.estado}
                </span>
              </div>
              {!isExporting && isActive && f.estado === 'ABIERTA' && (
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap w-full md:w-auto shrink-0">
                  <button
                    onClick={handleDescargarImagen}
                    className="px-4 py-2 bg-paper border-2 border-line-strong text-body hover:bg-canvas flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-body" /> Descargar
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-paper border-2 border-line-strong text-body hover:bg-canvas flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 text-body" /> Agregar Concepto
                  </button>
                  <button
                    onClick={() => {
                      setPagoMonto(factura.saldoDeudor > 0 ? factura.saldoDeudor : '');
                      setIsPagoModalOpen(true);
                    }}
                    className="px-4 py-2 bg-paper border-2 border-line-strong text-body hover:bg-canvas flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-xs transition-colors cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-body" /> Registrar Pago
                  </button>
                  <button
                    onClick={handleCerrarFactura}
                    className="px-4 py-2 bg-ink text-paper hover:brightness-110 flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-xs transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4" /> Cerrar Factura
                  </button>
                </div>
              )}
            </div>
            {f.clienteTelefono && (
              <p className="text-sm text-muted flex items-center gap-1 mt-2">
                <Phone className="w-3.5 h-3.5" />
                {f.clienteTelefono}
              </p>
            )}
            <p className="text-xs text-muted flex items-center mt-1">
              <FileClock className="w-3.5 h-3.5 mr-1.5" />
              Apertura: {formatFechaLarga(f.fechaApertura)}
              {f.fechaCierre && ` — Cierre: ${formatFechaLarga(f.fechaCierre)}`}
            </p>
            {/* Bandejas de ESTA factura (no el saldo global del cliente, ver el cálculo de
                bandejasAdeudadasEnEstaFactura más arriba) — igual que las devoluciones, es un
                hecho propio de este documento, no un saldo vigente, así que ya no hace falta
                limitarlo a la factura activa: también tiene sentido en las cerradas del
                historial. */}
            {unidadNegocioActiva === '1' && (
              <p className="text-xs text-muted flex items-center gap-1.5 mt-2">
                <span className="uppercase tracking-wide font-semibold">Bandejas Adeudadas</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium font-mono tabular-nums ${
                  bandejasAdeudadasEnEstaFactura > 0 ? 'bg-warn-bg text-warn-ink' : 'bg-thead text-body'
                }`}>
                  {bandejasAdeudadasEnEstaFactura} bandejas
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Indicadores de Resumen: barra de acento lateral, sin fondo de color pleno.
            Ocultos SOLO durante la exportación a imagen (ronda 5 — revierte la Decisión 5
            del checkpoint 6.1: ahí se había confirmado que debían aparecer en la imagen
            exportada; ahora el usuario pidió lo contrario). Siguen visibles en pantalla
            normalmente, mismo patrón `{!isExporting && (...)}` que ya usa la botonera del
            header más abajo.
            Patrón de barra tomado literal del mockup (Sistema-Vivero-Redisenio.dc.html,
            línea ~1021): "Total Ventas" lleva la barra de acento (decoración de marca, P3,
            no depende de datos) y valor neutral; "Total Conceptos" barra neutral
            (border-l-line-strong); "Pagos Recibidos" y "Saldo Deudor" son semánticos
            (P1, dependen de f.totalPagos / f.saldoDeudor) → ok / danger según corresponda. */}
        {!isExporting && (
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-line">
            <div className="p-4 border-l-4 border-l-accent border-r border-line">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-muted uppercase">Total Ventas</p>
                  <p className="text-2xl font-bold text-ink font-mono tabular-nums">{formatearDinero(f.totalVentas)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              </div>
            </div>
            <div className="p-4 border-l-4 border-l-line-strong">
              <p className="text-xs font-semibold text-muted uppercase">Total Conceptos</p>
              <p className="text-2xl font-bold text-ink font-mono tabular-nums">{formatearDinero(f.totalConceptos)}</p>
            </div>
            <div className="p-4 border-l-4 border-l-ok border-r border-line border-t border-line lg:border-t-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-ok-ink uppercase">Pagos Recibidos</p>
                  <p className="text-2xl font-bold text-ok-ink font-mono tabular-nums">{formatearDinero(f.totalPagos)}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-ok shrink-0 mt-0.5" />
              </div>
            </div>
            <div className={`p-4 border-l-4 border-t border-line lg:border-t-0 ${f.saldoDeudor > 0 ? 'border-l-danger' : 'border-l-ok'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-xs font-semibold uppercase ${f.saldoDeudor > 0 ? 'text-danger-ink' : 'text-ok-ink'}`}>Saldo Deudor</p>
                  <p className={`text-2xl font-bold font-mono tabular-nums ${f.saldoDeudor > 0 ? 'text-danger-ink' : 'text-ok-ink'}`}>{formatearDinero(f.saldoDeudor)}</p>
                </div>
                {f.saldoDeudor > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-ok shrink-0 mt-0.5" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Desglose de Ventas (Simplificado como Remito/Factura) */}
        <div className="border-t border-line">
          <div className="px-6 py-4 border-b border-line bg-thead/50 flex items-center">
            <Tag className="w-5 h-5 text-faint mr-2" />
            <h3 className="font-bold text-body">Detalle de Artículos</h3>
          </div>
          {f.ventas && f.ventas.length > 0 ? (
            <div className={isExporting ? "w-full" : "overflow-x-auto"}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-thead text-xs text-muted uppercase tracking-wide border-b-2 border-line-strong">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-center border-r border-line-strong">Fecha</th>
                    <th className="px-6 py-3 font-semibold w-20 text-center border-r border-line-strong">Cant.</th>
                    <th className="px-6 py-3 font-semibold border-r border-line-strong">Descripción</th>
                    <th className="px-6 py-3 font-semibold text-right border-r border-line-strong">Unitario</th>
                    <th className="px-6 py-3 font-semibold text-right border-r border-line-strong">Subtotal</th>
                    <th className="px-6 py-3 font-semibold text-center border-r border-line-strong">Método de Pago</th>
                    <th className="px-6 py-3 font-semibold text-right">Abonó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-strong border-b border-line-strong">
                  {/* f.ventas || [] (no sólo el spread): con la extensión de más arriba, esta
                      tabla ahora puede renderizarse con f.ventas null/vacío cuando lo único que
                      hay son devoluciones de bandejas — spreadear null tiraría TypeError. */}
                  {[...(f.ventas || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(v => {
                    const pagosVenta = f.pagos ? f.pagos.filter(p => p.ventaId === v.id) : [];
                    const totalAbonado = pagosVenta.filter(p => !p.estado || p.estado === 'ACREDITADO').reduce((sum, p) => sum + p.monto, 0);
                    const totalVenta = v.detalles.reduce((sum, d) => sum + d.subtotal, 0);

                    let paymentTextClass = 'text-ok-ink';
                    let statusText = formatearDinero(totalAbonado);
                    // Fondo de color con presencia real para las celdas de "Método de Pago" +
                    // "Abonó" (las dos últimas columnas) según cuánto se abonó de esta venta.
                    // Sólo esas dos celdas llevan el tinte — el resto de la fila (Fecha, Cant.,
                    // Descripción, Unitario, Subtotal) queda con fondo blanco normal. Cubre
                    // todo el rowSpan de la venta porque ambas celdas usan rowSpan.
                    let estadoBgClass = 'bg-ok-bg';

                    if (totalAbonado === 0) {
                      paymentTextClass = 'text-danger-ink';
                      statusText = 'No abonó';
                      estadoBgClass = 'bg-danger-bg';
                    } else if (totalAbonado < totalVenta) {
                      paymentTextClass = 'text-warn-ink';
                      estadoBgClass = 'bg-warn-bg';
                    }

                    return (
                      <React.Fragment key={v.id}>
                        {v.detalles.map((d, index) => (
                          <tr key={d.id}>
                            {index === 0 && (
                              <td rowSpan={v.detalles.length} className="px-6 py-3 text-sm text-body text-center align-middle border-r border-line-strong">
                                {formatFecha(v.fecha)}
                              </td>
                            )}
                            <td className="px-6 py-3 text-sm text-ink text-center font-medium border-r border-line-strong">{d.cantidad}</td>
                            <td className="px-6 py-3 text-sm text-body border-r border-line-strong">{d.productoNombre}</td>
                            <td className="px-6 py-3 text-sm text-body font-medium text-right font-mono tabular-nums border-r border-line-strong">{formatearDinero(d.subtotal / d.cantidad)}</td>
                            <td className="px-6 py-3 text-sm font-semibold text-ink text-right font-mono tabular-nums border-r border-line-strong">{formatearDinero(d.subtotal)}</td>
                            {index === 0 && (
                              totalAbonado > 0 ? (
                                <>
                                  <td rowSpan={v.detalles.length} className={`px-6 py-3 text-sm text-center align-middle border-r border-line-strong ${estadoBgClass}`}>
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                      {pagosVenta.map(p => (
                                        <MetodoPagoChip
                                          key={p.id}
                                          metodo={p.estado === 'RECHAZADO' ? `${p.metodoPago} (RECHAZADO)` : p.metodoPago}
                                          rechazado={p.estado === 'RECHAZADO'}
                                        />
                                      ))}
                                    </div>
                                  </td>
                                  <td rowSpan={v.detalles.length} className={`px-6 py-3 text-sm font-bold ${paymentTextClass} text-right align-middle font-mono tabular-nums ${estadoBgClass}`}>
                                    {statusText}
                                  </td>
                                </>
                              ) : (
                                <td colSpan="2" rowSpan={v.detalles.length} className={`px-6 py-3 text-sm font-bold ${paymentTextClass} text-center align-middle ${estadoBgClass}`}>
                                  {statusText}
                                </td>
                              )
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Pagos directos a la factura (sin ventaId) */}
                  {f.pagos && f.pagos.filter(p => !p.ventaId).sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(p => {
                    const isRechazado = p.estado === 'RECHAZADO';
                    return (
                    <tr key={`pago-${p.id}`} className="border-t border-ok-line bg-ok-bg">
                      <td className="px-6 py-3 text-sm text-body text-center align-middle border-r border-line-strong">
                        {formatFecha(p.fecha)}
                      </td>
                      <td colSpan="4" className="px-6 py-3 text-sm text-body text-right font-medium border-r border-line-strong">
                        Pago a cuenta
                      </td>
                      <td className="px-6 py-3 text-sm text-center align-middle border-r border-line-strong">
                        <MetodoPagoChip
                          metodo={isRechazado ? `${p.metodoPago} (RECHAZADO)` : p.metodoPago}
                          rechazado={isRechazado}
                        />
                      </td>
                      <td className={`px-6 py-3 text-sm font-bold text-right align-middle font-mono tabular-nums ${isRechazado ? 'text-danger-ink line-through opacity-70' : 'text-ok-ink'}`}>
                        {formatearDinero(p.monto)}
                      </td>
                    </tr>
                    );
                  })}

                </tbody>
                <tfoot className="bg-thead/70 border-t-2 border-line-strong">
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-right text-sm font-bold text-body uppercase border-r border-line-strong">
                      Total Artículos
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-ink font-mono tabular-nums border-r border-line-strong">
                      {formatearDinero(f.totalVentas)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-body uppercase border-r border-line-strong">
                      Total Abonado
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-ink font-mono tabular-nums">
                      {formatearDinero(f.pagos ? f.pagos.filter(p => !p.estado || p.estado === 'ACREDITADO').reduce((sum, p) => sum + p.monto, 0) : 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-muted">No hay artículos registrados.</div>
          )}
        </div>

        {/* Conceptos Extra Separados */}
        {f.conceptos && f.conceptos.length > 0 && (
          <div className="border-t border-line">
            <div className="px-6 py-4 border-b border-line bg-thead/50 flex items-center">
              <Box className="w-5 h-5 text-faint mr-2" />
              <h3 className="font-bold text-body">Conceptos Adicionales</h3>
            </div>
            <div className={isExporting ? "w-full" : "overflow-x-auto"}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-thead text-xs text-muted uppercase tracking-wide border-b-2 border-line-strong">
                  <tr>
                    <th className="px-6 py-3 font-semibold border-r border-line-strong">Fecha</th>
                    <th className="px-6 py-3 font-semibold border-r border-line-strong">Descripción</th>
                    <th className="px-6 py-3 font-semibold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-strong">
                  {[...f.conceptos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(c => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 text-sm text-body border-r border-line-strong">{formatFecha(c.fecha)}</td>
                      <td className="px-6 py-3 text-sm text-ink border-r border-line-strong">{c.descripcion}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-ink text-right font-mono tabular-nums">{formatearDinero(c.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Total a Pagar Final — pertenece a la tabla de arriba (ventas/pagos), por eso va antes
            de la tabla de devoluciones de bandejas, no después (pedido del usuario). */}
        <div className="border-t border-line px-6 py-4 flex items-center justify-end gap-6 flex-wrap">
          <span className="text-sm font-bold text-muted uppercase">Total a Pagar</span>
          <span className={`text-2xl font-black font-mono tabular-nums ${f.saldoDeudor > 0 ? 'text-danger' : 'text-ok-ink'}`}>
            {formatearDinero(f.saldoDeudor)}
          </span>
        </div>

        {/* Devoluciones de Bandejas: tabla propia y separada de la de arriba (pedido del
            usuario), con su propio encabezado — ya no son filas mezcladas con las ventas. Mismo
            criterio que ya se estableció: hecho histórico propio de esta factura (no un saldo
            vigente), así que se muestra tanto en la activa como en las cerradas del historial.
            Se renderiza siempre que la unidad sea Vivero (con o sin devoluciones) porque el
            total de "Bandejas Adeudadas" del pie tiene que verse igual, haya habido devolución o
            no en esta factura puntual. */}
        {unidadNegocioActiva === '1' && (
          <div className="border-t border-line">
            <div className="px-6 py-4 border-b border-line bg-thead/50 flex items-center">
              <PackageMinus className="w-5 h-5 text-faint mr-2" />
              <h3 className="font-bold text-body">Devoluciones de Bandejas</h3>
            </div>
            <div className={isExporting ? "w-full" : "overflow-x-auto"}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-thead text-xs text-muted uppercase tracking-wide border-b-2 border-line-strong">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-center border-r border-line-strong">Fecha</th>
                    <th className="px-6 py-3 font-semibold text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-strong border-b border-line-strong">
                  {devolucionesBandejasDeEstaFactura.length > 0 ? (
                    devolucionesBandejasDeEstaFactura.map((mov) => (
                      <tr key={mov.id}>
                        <td className="px-6 py-3 text-sm text-body text-center border-r border-line-strong">
                          {formatFecha(mov.fecha)}
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-ok-ink text-right font-mono tabular-nums">
                          {mov.cantidad}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-6 py-4 text-center text-sm text-muted">
                        Sin devoluciones registradas en esta factura.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-thead/70 border-t-2 border-line-strong">
                  <tr>
                    <td className="px-6 py-4 text-right text-sm font-bold text-body uppercase border-r border-line-strong">
                      Bandejas Adeudadas
                    </td>
                    <td className={`px-6 py-4 text-right text-lg font-bold font-mono tabular-nums ${bandejasAdeudadasEnEstaFactura > 0 ? 'text-warn-ink' : 'text-ok-ink'}`}>
                      {bandejasAdeudadasEnEstaFactura}
                      {/* Excedente: el cliente devolvió más bandejas de las que se llevó DENTRO
                          de esta factura puntual — esas de más están pagando una deuda de una
                          factura anterior, no corresponde restarlas de acá ni mostrar negativo. */}
                      {bandejasExcedentesDeEstaFactura > 0 && (
                        <span className="block text-xs font-normal text-ok-ink uppercase mt-0.5">
                          +{bandejasExcedentesDeEstaFactura} de más
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
      </div>
    );
  };

  // Se calcula una sola vez y se usa tanto para el contador de la pestaña como para el
  // render, para que no puedan volver a divergir (antes: el contador contaba `historial`
  // completo —incluida la factura ABIERTA que el endpoint también devuelve— mientras el
  // render filtraba sólo CERRADA). Orden descendente por fechaCierre: la más reciente primero.
  const facturasCerradas = [...historial]
    .filter(h => h.estado === 'CERRADA')
    .sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));

  return (
    <>
      {/* Overlay de exportación: tapa el "flash" de 1-2 frames mientras el nodo de la
          factura se ensancha a 1000px en su posición normal del documento (ver el
          comentario de capturarNodoComoImagen sobre por qué ya no se usa position:fixed
          en el nodo capturado). Va fuera del contenedor con animate-in/slide-in para no
          heredar un `transform` de esa animación, que rompería el fixed a pantalla
          completa. */}
      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-canvas flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent"></div>
          <p className="text-muted font-medium">Generando imagen...</p>
        </div>
      )}
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/facturas')}
          className="p-2 text-muted hover:text-body hover:bg-canvas rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-ink">
          Detalle de Facturación {factura?.clienteNombre ? `- ${factura.clienteNombre}` : ''}
        </h1>
      </div>

      <div className="flex gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab('activa')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center cursor-pointer ${activeTab === 'activa' ? 'border-accent text-accent-ink' : 'border-transparent text-muted hover:text-body hover:border-line-strong'}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Factura Activa
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center cursor-pointer ${activeTab === 'historial' ? 'border-accent text-accent-ink' : 'border-transparent text-muted hover:text-body hover:border-line-strong'}`}
        >
          <History className="w-4 h-4 mr-2" />
          Historial ({facturasCerradas.length})
        </button>
      </div>

      {activeTab === 'activa' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          {renderFacturaCompleta(factura, true)}
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
          {historial.length === 0 ? (
            <div className="bg-paper p-12 text-center rounded-panel border border-line">
              <History className="w-16 h-16 text-faint mx-auto mb-4" />
              <h3 className="text-xl font-bold text-ink mb-2">Sin Historial</h3>
              <p className="text-muted">Este cliente no tiene facturas históricas en Vivero.</p>
            </div>
          ) : (
            facturasCerradas.map(h => {
              const isExpanded = expandedFacturaId === h.id;
              const sinMovimientos = (!h.ventas || h.ventas.length === 0) && (!h.conceptos || h.conceptos.length === 0);
              return (
                <div key={h.id}>
                  {/* Tarjeta Resumen: fila superior (icono + identidad + chevron) y fila
                      inferior (total + saldo de cierre), en vez de las tres columnas lado a
                      lado que en mobile hacían que la fecha y el saldo se envolvieran
                      entrelazados por falta de ancho. */}
                  <div
                    onClick={() => setExpandedFacturaId(isExpanded ? null : h.id)}
                    role="button"
                    aria-expanded={isExpanded}
                    className={`bg-paper p-4 border transition-all cursor-pointer ${isExpanded ? 'border-accent rounded-t-panel border-b-0' : 'border-line hover:border-line-strong rounded-panel'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-3 rounded-full shrink-0 ${isExpanded ? 'bg-accent-soft text-accent-ink' : 'bg-thead text-muted'}`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-ink">Factura #{h.id}</h4>
                          <p className="text-sm text-muted flex items-center gap-1 whitespace-nowrap">
                            <FileClock className="w-3 h-3 shrink-0" />
                            {formatFecha(h.fechaApertura)} — {formatFecha(h.fechaCierre)}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-accent-ink shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-faint shrink-0" />
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-3">
                      {sinMovimientos ? (
                        <p className="text-sm font-semibold text-faint">Cerrada sin movimientos</p>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-muted uppercase">Total Facturado</p>
                            <p className="text-lg font-bold text-ink font-mono tabular-nums">{formatearDinero(h.totalVentas + h.totalConceptos)}</p>
                          </div>
                          <p className={`text-xs font-semibold text-right font-mono tabular-nums ${h.saldoDeudor > 0 ? 'text-danger' : 'text-ok-ink'}`}>
                            Cerró {h.saldoDeudor > 0 ? 'con saldo deudor' : 'saldada'}<br />{formatearDinero(h.saldoDeudor)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Detalle Expandido: continúa el mismo marco de la tarjeta hacia abajo,
                      sin sangría ni overflow-x-auto propio — mismo ancho y eje que la
                      factura activa (corrección del desplazamiento/recorte). */}
                  {isExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 border border-t-0 border-accent rounded-b-panel bg-paper">
                      {/* La botonera lleva su propio padding; el documento capturado
                          (id={`factura-historial-${h.id}`}) queda sin padding propio para
                          que su eje y su ancho coincidan con los de la factura activa —
                          es el mismo nodo que produce renderFacturaCompleta, sin sangría
                          adicional de este wrapper. */}
                      <div className="flex justify-end p-4 pb-0">
                        <button
                          onClick={async () => {
                            const el = document.getElementById(`factura-historial-${h.id}`);
                            if (!el) return;
                            try {
                              pushToast('info', 'Generando imagen...');
                              setIsExporting(true);
                              await esperarProximoFrame();
                              // Mismo motivo que en handleDescargarImagen: garantizar que
                              // IBM Plex Sans (font-factura) ya cargó antes de capturar.
                              await document.fonts.ready;
                              const dataUrl = await capturarNodoComoImagen(el);
                              const link = document.createElement('a');
                              link.download = `Factura_Cerrada_${h.id}_${h.clienteNombre}.png`;
                              link.href = dataUrl;
                              link.click();
                            } catch (err) { pushToast('error', 'Error al generar imagen'); }
                            finally { setIsExporting(false); }
                          }}
                          className="px-4 py-2 bg-paper border-2 border-line-strong text-body hover:bg-canvas flex items-center justify-center gap-2 font-bold uppercase tracking-wide text-xs transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-body" /> Descargar
                        </button>
                      </div>
                      <div id={`factura-historial-${h.id}`}>
                        {renderFacturaCompleta(h, false)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Agregar Concepto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-paper rounded-panel border border-line-strong w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-xl font-bold text-ink mb-4">Agregar Concepto a Factura</h3>
              <form onSubmit={handleAgregarConcepto} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Descripción</label>
                  <input
                    type="text"
                    required
                    value={conceptoDesc}
                    onChange={e => setConceptoDesc(e.target.value)}
                    className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border"
                    placeholder="Ej. Intereses por mora, Transporte, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Monto ($)</label>
                  <FormattedNumberInput
                    required
                    value={conceptoMonto}
                    onChange={setConceptoMonto}
                    className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-body bg-paper border border-line-strong rounded-base hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-paper bg-accent border border-transparent rounded-base hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {isPagoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsPagoModalOpen(false)}></div>
          <div className="relative bg-paper rounded-panel border border-line-strong w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-xl font-bold text-ink mb-4">Registrar Pago a Factura</h3>
              <form onSubmit={handleRegistrarPago} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Monto ($)</label>
                  <FormattedNumberInput
                    required
                    value={pagoMonto}
                    onChange={setPagoMonto}
                    className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Método de Pago</label>
                  <select
                    value={pagoMetodo}
                    onChange={e => setPagoMetodo(e.target.value)}
                    className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border cursor-pointer"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                {pagoMetodo === 'CHEQUE' && (
                  <div className="space-y-4 pt-2 border-t border-line">
                    <div>
                      <label className="block text-sm font-medium text-body mb-1">Banco</label>
                      <input
                        type="text"
                        required
                        value={pagoBanco}
                        onChange={e => setPagoBanco(e.target.value)}
                        className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-body mb-1">Número de Serie</label>
                      <input
                        type="text"
                        required
                        value={pagoNumeroSerie}
                        onChange={e => setPagoNumeroSerie(e.target.value)}
                        className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-body mb-1">Fecha de Cobro</label>
                      <input
                        type="date"
                        required
                        value={pagoFechaCobro}
                        onChange={e => setPagoFechaCobro(e.target.value)}
                        className="w-full border-line rounded-base focus:border-accent focus:ring-accent bg-paper px-3 py-2 border"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setIsPagoModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-body bg-paper border border-line-strong rounded-base hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-paper bg-accent border border-transparent rounded-base hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default FacturaCliente;
