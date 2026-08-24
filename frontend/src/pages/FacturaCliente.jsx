import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFacturaActiva, getHistorialFacturas, cerrarFactura, agregarConceptoFactura, registrarPagoFactura, abrirFacturaManual, rechazarPagoFactura } from '../api/facturas.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { ArrowLeft, CheckCircle, FileText, Plus, Receipt, CreditCard, Box, Tag, FileClock, History, XCircle, FileImage } from 'lucide-react';
import FormattedNumberInput from '../components/FormattedNumberInput';
import { toPng } from 'html-to-image';
const formatFecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatFechaLarga = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

const formatearDinero = (valor) => {
  const numero = Number(valor) || 0;
  return `$${numero.toLocaleString('es-AR')}`;
};

const FacturaCliente = () => {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { pushToast, askConfirm } = useUIStore();
  
  const [factura, setFactura] = useState(null);
  const [historial, setHistorial] = useState([]);
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

  useEffect(() => {
    fetchFacturaData();
    fetchHistorial();
  }, [clienteId]);

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
      // Wait for React to re-render without the UI elements and with fixed width
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(facturaRef.current, {
        quality: 1.0,
        backgroundColor: '#f9fafb', // gray-50
        width: 1000,
        style: { width: '1000px', transform: 'scale(1)', transformOrigin: 'top left', margin: '0' },
        pixelRatio: 2
      });
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
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
  }

  const renderFacturaCompleta = (f, isActive = false) => {
    if (!f) return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
        <Receipt className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Sin Factura Activa</h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          El cliente no tiene ventas pendientes de facturar. Al registrar una nueva venta en Vivero, se abrirá una nueva factura automáticamente.
        </p>
        <button
          onClick={handleAbrirManual}
          className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-2 font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Abrir Factura Manualmente
        </button>
      </div>
    );

    return (
      <div 
        className={`space-y-6 ${isExporting ? 'p-6 bg-gray-50' : ''}`} 
        ref={isActive ? facturaRef : null}
      >
        {/* Cabecera de la Factura */}
        <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden ${isExporting ? 'shadow-none border-gray-300' : ''}`}>
          <div className="absolute top-0 right-0 p-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${f.estado === 'ABIERTA' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {f.estado}
            </span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Factura #{f.id} - {f.clienteNombre}
              </h2>
              <p className="text-sm text-gray-500 flex items-center">
                <FileClock className="w-4 h-4 mr-1.5" />
                Apertura: {formatFechaLarga(f.fechaApertura)}
                {f.fechaCierre && ` — Cierre: ${formatFechaLarga(f.fechaCierre)}`}
              </p>
            </div>
            {!isExporting && isActive && f.estado === 'ABIERTA' && (
              <div className="flex flex-wrap gap-2 no-export">
                <button
                  onClick={handleDescargarImagen}
                  className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center gap-2 font-medium transition-colors"
                >
                  <FileImage className="w-4 h-4" /> Descargar 
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Agregar Concepto
                </button>
                <button
                  onClick={() => {
                    setPagoMonto(factura.saldoDeudor > 0 ? factura.saldoDeudor : '');
                    setIsPagoModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-2 font-medium transition-colors"
                >
                  <CreditCard className="w-4 h-4" /> Registrar Pago
                </button>
                <button
                  onClick={handleCerrarFactura}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Cerrar Factura
                </button>
              </div>
            )}
          </div>
        </div>

        {!isExporting && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-export">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Ventas</p>
              <p className="text-lg font-bold text-gray-900">{formatearDinero(f.totalVentas)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase">Total Conceptos</p>
              <p className="text-lg font-bold text-gray-900">{formatearDinero(f.totalConceptos)}</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-600 uppercase">Pagos Recibidos</p>
              <p className="text-lg font-bold text-emerald-700">{formatearDinero(f.totalPagos)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${f.saldoDeudor > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className={`text-xs font-semibold uppercase ${f.saldoDeudor > 0 ? 'text-red-600' : 'text-emerald-700'}`}>Saldo Deudor</p>
              <p className={`text-lg font-bold ${f.saldoDeudor > 0 ? 'text-red-700' : 'text-emerald-800'}`}>{formatearDinero(f.saldoDeudor)}</p>
            </div>
          </div>
        )}

        {/* Desglose de Ventas (Simplificado como Remito/Factura) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
            <Tag className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="font-bold text-gray-800">Detalle de Artículos</h3>
          </div>
          {f.ventas && f.ventas.length > 0 ? (
            <div className={isExporting ? "w-full" : "overflow-x-auto"}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase border-b-2 border-gray-300">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-center border-r border-gray-300">Fecha</th>
                    <th className="px-6 py-3 font-semibold w-20 text-center border-r border-gray-300">Cant.</th>
                    <th className="px-6 py-3 font-semibold border-r border-gray-300">Descripción</th>
                    <th className="px-6 py-3 font-semibold text-right border-r border-gray-300">Unitario</th>
                    <th className="px-6 py-3 font-semibold text-right">Subtotal</th>
                    <th className="px-6 py-3 font-semibold text-center bg-emerald-100 border-l border-r border-emerald-300">Método Pago</th>
                    <th className="px-6 py-3 font-semibold text-center bg-emerald-100">Abonó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300 border-b border-gray-300">
                  {[...f.ventas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(v => {
                    const pagosVenta = f.pagos ? f.pagos.filter(p => p.ventaId === v.id) : [];
                    const totalAbonado = pagosVenta.filter(p => !p.estado || p.estado === 'ACREDITADO').reduce((sum, p) => sum + p.monto, 0);
                    const totalVenta = v.detalles.reduce((sum, d) => sum + d.subtotal, 0);

                    let paymentBgClass = 'bg-emerald-100';
                    let paymentTextClass = 'text-emerald-800';
                    let paymentBorderClass = 'border-emerald-300';
                    let statusText = formatearDinero(totalAbonado);

                    if (totalAbonado === 0) {
                      paymentBgClass = 'bg-red-100';
                      paymentTextClass = 'text-red-700';
                      paymentBorderClass = 'border-red-300';
                      statusText = 'No abonó';
                    } else if (totalAbonado < totalVenta) {
                      paymentBgClass = 'bg-orange-100';
                      paymentTextClass = 'text-orange-700';
                      paymentBorderClass = 'border-orange-300';
                    }
                    
                    return (
                      <React.Fragment key={v.id}>
                        {v.detalles.map((d, index) => (
                          <tr key={d.id} className="hover:bg-gray-50/50">
                            {index === 0 && (
                              <td rowSpan={v.detalles.length} className="px-6 py-3 text-sm text-gray-500 text-center align-middle border-r border-gray-300">
                                {formatFecha(v.fecha)}
                              </td>
                            )}
                            <td className="px-6 py-3 text-sm text-gray-900 text-center font-medium border-r border-gray-300">{d.cantidad}</td>
                            <td className="px-6 py-3 text-sm text-gray-700 border-r border-gray-300">{d.productoNombre}</td>
                            <td className="px-6 py-3 text-sm text-gray-500 text-right border-r border-gray-300">{formatearDinero(d.subtotal / d.cantidad)}</td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{formatearDinero(d.subtotal)}</td>
                            {index === 0 && (
                              totalAbonado > 0 ? (
                                <>
                                  <td rowSpan={v.detalles.length} className={`px-6 py-3 text-sm ${paymentTextClass} text-center align-middle ${paymentBgClass} border-l border-r ${paymentBorderClass}`}>
                                    <div className="flex flex-col gap-1 items-center justify-center">
                                      {pagosVenta.map(p => (
                                        <div key={p.id} className="flex items-center gap-1">
                          <span className={p.estado === 'RECHAZADO' ? 'text-red-700 font-bold' : ''}>
                            {p.estado === 'RECHAZADO' ? `${p.metodoPago}(RECHAZADO)` : p.metodoPago}
                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td rowSpan={v.detalles.length} className={`px-6 py-3 text-sm font-bold ${paymentTextClass} text-right align-middle ${paymentBgClass}`}>
                                    {statusText}
                                  </td>
                                </>
                              ) : (
                                <td colSpan="2" rowSpan={v.detalles.length} className={`px-6 py-3 text-sm font-bold ${paymentTextClass} text-center align-middle ${paymentBgClass} border-l ${paymentBorderClass}`}>
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
                    <tr key={`pago-${p.id}`} className="border-t border-emerald-300 bg-emerald-50">
                      <td className="px-6 py-3 text-sm text-gray-500 text-center align-middle border-r border-gray-300">
                        {formatFecha(p.fecha)}
                      </td>
                      <td colSpan="4" className="px-6 py-3 text-sm text-gray-500 text-right font-medium">
                        Pago a cuenta
                      </td>
                      <td className="px-6 py-3 text-sm text-emerald-800 text-center align-middle bg-emerald-100 border-l border-r border-emerald-300">
                        <div className="flex items-center justify-center gap-1">
                          <span className={isRechazado ? 'text-red-700 font-bold' : ''}>
                            {isRechazado ? `${p.metodoPago}(RECHAZADO)` : p.metodoPago}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-3 text-sm font-bold text-right align-middle bg-emerald-100 ${isRechazado ? 'text-red-700 line-through opacity-70' : 'text-emerald-800'}`}>
                        {formatearDinero(p.monto)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase">
                      Total Artículos
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-gray-900 border-r border-gray-300">
                      {formatearDinero(f.totalVentas)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase border-r border-gray-300">
                      Total Abonado
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                      {formatearDinero(f.pagos ? f.pagos.filter(p => !p.estado || p.estado === 'ACREDITADO').reduce((sum, p) => sum + p.monto, 0) : 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">No hay artículos registrados.</div>
          )}
        </div>

        {/* Conceptos Extra Separados */}
        {f.conceptos && f.conceptos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
              <Box className="w-5 h-5 text-gray-400 mr-2" />
              <h3 className="font-bold text-gray-800">Conceptos Adicionales</h3>
            </div>
            <div className={isExporting ? "w-full" : "overflow-x-auto"}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Fecha</th>
                    <th className="px-6 py-3 font-semibold">Descripción</th>
                    <th className="px-6 py-3 font-semibold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...f.conceptos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).map(c => (
                    <tr key={c.id}>
                      <td className="px-6 py-3 text-sm text-gray-600">{formatFecha(c.fecha)}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{c.descripcion}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{formatearDinero(c.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Total a Pagar Final */}
        <div className="flex justify-end mt-4">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-6 py-4 flex items-center gap-6 min-w-[300px]">
            <span className="text-sm font-bold text-gray-600 uppercase">Total a Pagar</span>
            <span className={`text-2xl font-black ml-auto ${f.saldoDeudor > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {formatearDinero(f.saldoDeudor)}
            </span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/facturas')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Detalle de Facturación {factura?.clienteNombre ? `- ${factura.clienteNombre}` : ''}
        </h1>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('activa')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'activa' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Factura Activa
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'historial' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <History className="w-4 h-4 mr-2" />
          Historial ({historial.length})
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
            <div className="bg-white p-12 text-center rounded-xl border border-gray-100 shadow-sm">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sin Historial</h3>
              <p className="text-gray-500">Este cliente no tiene facturas históricas en Vivero.</p>
            </div>
          ) : (
            historial.filter(h => h.estado === 'CERRADA').map(h => {
              const isExpanded = expandedFacturaId === h.id;
              return (
                <div key={h.id} className="relative">
                  {/* Tarjeta Resumen */}
                  <div 
                    onClick={() => setExpandedFacturaId(isExpanded ? null : h.id)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isExpanded ? 'border-emerald-500 shadow-md mb-4' : 'border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${isExpanded ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Factura #{h.id}</h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <FileClock className="w-3 h-3" />
                          Cerrada el {formatFechaLarga(h.fechaCierre)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-500 uppercase">Total Facturado</p>
                      <p className="text-lg font-bold text-gray-900">{formatearDinero(h.totalVentas + h.totalConceptos)}</p>
                    </div>
                  </div>
                  
                  {/* Detalle Expandido */}
                  {isExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 ml-4 md:ml-8 border-l-2 border-emerald-200 pl-4 md:pl-8 py-2 overflow-x-auto">
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={async () => {
                            const el = document.getElementById(`factura-historial-${h.id}`);
                            if (!el) return;
                            try {
                              pushToast('info', 'Generando imagen...');
                              setIsExporting(true);
                              await new Promise(resolve => setTimeout(resolve, 100));
                              const dataUrl = await toPng(el, { 
                                quality: 1.0, 
                                backgroundColor: '#f9fafb',
                                width: 1000,
                                style: { width: '1000px', transform: 'scale(1)', transformOrigin: 'top left', margin: '0' },
                                pixelRatio: 2
                              });
                              const link = document.createElement('a');
                              link.download = `Factura_Cerrada_${h.id}_${h.clienteNombre}.png`;
                              link.href = dataUrl;
                              link.click();
                            } catch (err) { pushToast('error', 'Error al generar imagen'); }
                            finally { setIsExporting(false); }
                          }}
                          className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center gap-2 font-medium transition-colors text-sm"
                        >
                          <FileImage className="w-4 h-4" /> Descargar Factura
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Agregar Concepto a Factura</h3>
              <form onSubmit={handleAgregarConcepto} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input
                    type="text"
                    required
                    value={conceptoDesc}
                    onChange={e => setConceptoDesc(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                    placeholder="Ej. Intereses por mora, Transporte, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                  <FormattedNumberInput
                    required
                    value={conceptoMonto}
                    onChange={setConceptoMonto}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                    placeholder="0"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Registrar Pago a Factura</h3>
              <form onSubmit={handleRegistrarPago} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                  <FormattedNumberInput
                    required
                    value={pagoMonto}
                    onChange={setPagoMonto}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                  <select
                    value={pagoMetodo}
                    onChange={e => setPagoMetodo(e.target.value)}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                {pagoMetodo === 'CHEQUE' && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                      <input
                        type="text"
                        required
                        value={pagoBanco}
                        onChange={e => setPagoBanco(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de Serie</label>
                      <input
                        type="text"
                        required
                        value={pagoNumeroSerie}
                        onChange={e => setPagoNumeroSerie(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cobro</label>
                      <input
                        type="date"
                        required
                        value={pagoFechaCobro}
                        onChange={e => setPagoFechaCobro(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white px-3 py-2 border"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsPagoModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
  );
};

export default FacturaCliente;
