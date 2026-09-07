import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { siembrasApi } from '../api/siembras.api';
import SiembraForm from '../components/SiembraForm';
import FinalizarSiembraModal from '../components/FinalizarSiembraModal';
import PaseStockModal from '../components/PaseStockModal';
import ConversorBandejas from '../components/ConversorBandejas';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { parsearFechaLocal, formatearFechaLocal } from '../utils/fechaLocal';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Inbox, Sprout, CheckCircle2, PackagePlus, ChevronDown, ChevronUp, Calendar, MessageSquare } from 'lucide-react';

const Siembras = () => {
  const queryClient = useQueryClient();
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [siembras, setSiembras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('TODO'); // 'TODO' | 'NUMERO_SIEMBRA'
  const [showConversor, setShowConversor] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSiembra, setSelectedSiembra] = useState(null);
  // Precarga desde el botón "Sembrar" de Registro de Semillas (pedido del dueño 2026-09-05):
  // viaja como router state, no como query param, porque es un dato de un solo uso -- no tiene
  // sentido que sobreviva a un refresh de página ni que quede en el historial de navegación.
  const [registroSemillaParaSembrar, setRegistroSemillaParaSembrar] = useState(null);
  // Resalta la tarjeta/fila al llegar desde la notificación de la campana (pedido del dueño
  // 2026-09-05): mismo mecanismo de router state de un solo uso.
  const [siembraResaltada, setSiembraResaltada] = useState(null);
  
  // Finalizar Modal states (Old workflow)
  const [isFinalizarOpen, setIsFinalizarOpen] = useState(false);
  const [siembraToFinalizar, setSiembraToFinalizar] = useState(null);

  // Pasar a Stock Modal states (New workflow)
  const [isPaseStockOpen, setIsPaseStockOpen] = useState(false);
  const [siembraToPaseStock, setSiembraToPaseStock] = useState(null);

  const fetchSiembras = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await siembrasApi.getAll();
      setSiembras(response.data || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos suficientes para ver las siembras.');
      } else {
        setError('Ocurrió un error al cargar las siembras.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiembras();
  }, []);

  useEffect(() => {
    if (location.state?.registroSemillaParaSembrar) {
      setRegistroSemillaParaSembrar(location.state.registroSemillaParaSembrar);
      setSelectedSiembra(null);
      setIsFormOpen(true);
      // Limpia el state de router después de consumirlo: si el usuario refresca la página o
      // vuelve con el botón "Atrás" del navegador, el modal no se debe reabrir solo.
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state?.resaltarSiembraId) {
      const id = location.state.resaltarSiembraId;
      setSiembraResaltada(id);
      navigate(location.pathname, { replace: true, state: {} });
      const timeout = setTimeout(() => setSiembraResaltada(null), 2500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (siembraResaltada != null) {
      const el = document.getElementById(`siembra-${siembraResaltada}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [siembraResaltada]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (selectedSiembra) {
        await siembrasApi.update(selectedSiembra.id, formData);
      } else {
        await siembrasApi.create(formData);
      }
      setIsFormOpen(false);
      setSelectedSiembra(null);
      setRegistroSemillaParaSembrar(null);
      fetchSiembras();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      pushToast('success', 'Siembra guardada correctamente.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar la siembra.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await siembrasApi.delete(id);
      fetchSiembras();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      pushToast('success', 'Siembra eliminada.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar la siembra.'));
    }
  };

  const handleFinalizar = async (idProducto, cantidad) => {
    if (!siembraToFinalizar) return;
    try {
      await siembrasApi.finalizar(siembraToFinalizar.id, idProducto, cantidad);
      setIsFinalizarOpen(false);
      setSiembraToFinalizar(null);
      fetchSiembras();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      pushToast('success', 'Siembra finalizada y stock agregado al catálogo.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al finalizar la siembra.'));
    }
  };

  const handlePaseStock = async (requestData) => {
    if (!siembraToPaseStock) return;
    try {
      await siembrasApi.pasarAStock(siembraToPaseStock.id, requestData);
      setIsPaseStockOpen(false);
      setSiembraToPaseStock(null);
      fetchSiembras();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      pushToast('success', 'Siembra convertida en producto e ingresada al stock.');
    } catch (err) {
      console.error(err);
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al pasar la siembra a stock.'));
    }
  };

  const filteredSiembras = siembras.filter((s) => {
    if (s.estado === 'EN_STOCK') return false; // Ocultar las que ya pasaron a stock
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    // Modo exclusivo: sólo número de siembra, para no confundirlo con el código
    // de lote cuando ambos comparten el mismo valor numérico (ej. los dos "1").
    if (searchMode === 'NUMERO_SIEMBRA') {
      return !!(s.numeroSiembra && s.numeroSiembra.toLowerCase().includes(term));
    }

    return (s.variedadPlanta?.nombre && s.variedadPlanta.nombre.toLowerCase().includes(term)) ||
      (s.dueno && s.dueno.toLowerCase().includes(term)) ||
      (s.codigoLote && s.codigoLote.toLowerCase().includes(term)) ||
      (s.numeroSiembra && s.numeroSiembra.toLowerCase().includes(term));
  });

  // Orden por defecto por fecha de siembra ascendente (pedido del dueño 2026-09-06, mismo
  // criterio que ya se aplicó en Registro de Semillas): las sembradas más antiguas quedan
  // arriba. Sin fecha de inicio cargada (siembras viejas), el registro se manda al final.
  const siembrasOrdenadas = [...filteredSiembras].sort((a, b) => {
    const fechaA = a.fechaSiembraInicio ? parsearFechaLocal(a.fechaSiembraInicio).getTime() : Infinity;
    const fechaB = b.fechaSiembraInicio ? parsearFechaLocal(b.fechaSiembraInicio).getTime() : Infinity;
    return fechaA - fechaB;
  });

  const formatOrigen = (tipoOrigen) => {
    if (tipoOrigen === 'SUELTO') return 'Suelto';
    if (tipoOrigen === 'SOBRE') return 'Sobre';
    return '-';
  };

  // Devuelve null cuando la siembra no tiene fecha de siembra (siembras
  // históricas), para que la línea "Sembrado: ..." simplemente no se renderice
  // en lugar de mostrar un valor vacío.
  const formatPeriodoSiembra = (siembra) => {
    if (!siembra.fechaSiembraInicio) return null;
    const inicio = formatearFechaLocal(siembra.fechaSiembraInicio);
    if (!siembra.fechaSiembraFin || siembra.fechaSiembraFin === siembra.fechaSiembraInicio) {
      return inicio;
    }
    const fin = formatearFechaLocal(siembra.fechaSiembraFin);
    return `${inicio} - ${fin}`;
  };

  // Bug real corregido (2026-09-04): antes el progreso se calculaba SOLO en base a cuánto
  // faltaba para la fecha estimada, capado a una ventana de 30 días -- cualquier siembra con más
  // de 30 días por delante quedaba pegada en 10% sin moverse, sin importar cuánto tiempo pasara.
  // Ahora se calcula como tiempo transcurrido sobre tiempo total planeado (desde
  // fechaSiembraInicio hasta fechaEstimada), así que avanza de forma pareja durante todo el
  // ciclo. Si falta la fecha de inicio (siembras viejas sin ese dato), cae al criterio anterior
  // como red de seguridad. El color distingue tres estados: verde = Finalizada de verdad, rojo =
  // venció la fecha estimada y sigue En Proceso (necesita atención), ámbar = a 10 días o menos
  // (mismo margen que usa el aviso al pasar a stock, más abajo), gris = todavía con tiempo.
  const calcularProgresoSiembra = (siembra) => {
    if (!siembra.fechaEstimada) return { progress: 0, diffDays: null, colorClass: 'bg-line-strong' };

    const est = parsearFechaLocal(siembra.fechaEstimada);
    const now = new Date();
    const diffDays = Math.ceil((est - now) / (1000 * 60 * 60 * 24));

    let progress;
    if (diffDays <= 0) {
      progress = 100;
    } else if (siembra.fechaSiembraInicio) {
      const inicio = parsearFechaLocal(siembra.fechaSiembraInicio);
      const totalMs = est - inicio;
      const transcurridoMs = now - inicio;
      progress = totalMs > 0 ? (transcurridoMs / totalMs) * 100 : 100;
    } else {
      progress = diffDays > 30 ? 10 : 100 - diffDays * 3;
    }
    progress = Math.min(100, Math.max(0, Math.round(progress)));

    let colorClass = 'bg-line-strong';
    if (siembra.estado === 'FINALIZADA') {
      colorClass = 'bg-ok';
    } else if (diffDays <= 0) {
      colorClass = 'bg-danger';
    } else if (diffDays <= 10) {
      colorClass = 'bg-warn';
    }

    return { progress, diffDays, colorClass };
  };

  // Margen de aviso al pasar a stock antes de tiempo (pedido del dueño 2026-09-04): no bloquea
  // -- a veces hay una razón real para adelantarlo (plaga, clima, la estimación estaba mal) --
  // pero avisa si faltan más de 10 días para la fecha estimada y todavía está En Proceso.
  const MARGEN_AVISO_PASE_STOCK_DIAS = 10;

  const iniciarPaseAStock = (siembra) => {
    const { diffDays } = calcularProgresoSiembra(siembra);
    const faltaMucho = siembra.estado === 'EN_PROCESO' && diffDays !== null && diffDays > MARGEN_AVISO_PASE_STOCK_DIAS;

    const abrirModal = () => {
      setSiembraToPaseStock(siembra);
      setIsPaseStockOpen(true);
    };

    if (faltaMucho) {
      askConfirm({
        title: 'Pasar a stock antes de tiempo',
        message: `Todavía faltan ${diffDays} días para la fecha estimada de esta siembra. ¿Querés pasarla a stock igual?`,
        variant: 'warning',
        confirmLabel: 'Pasar a stock igual',
        cancelLabel: 'Cancelar',
        onConfirm: abrirModal,
      });
    } else {
      abrirModal();
    }
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'EN_STOCK':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-thead text-body border border-line">En Stock</span>;
      case 'FINALIZADA':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-ok-bg text-ok-ink">Finalizada</span>;
      case 'EN_PROCESO':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-thead text-body border border-line">En Proceso</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">Gestión de Siembras</h1>
            <Sprout className="w-6 h-6 text-accent" />
          </div>
          <p className="mt-1 text-sm text-muted">Administra los lotes en cultivo y su traspaso al catálogo.</p>
        </div>

        <div className="flex flex-row items-center gap-2 sm:gap-3 relative w-full sm:w-auto">
          <button
            onClick={() => setShowConversor(!showConversor)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-paper border border-line hover:bg-canvas text-body font-semibold px-4 py-2.5 rounded-base transition-all cursor-pointer text-sm sm:text-base"
          >
            Conversor
          </button>

          {showConversor && (
            <div className="absolute top-full right-0 left-0 sm:left-auto mt-2 z-20">
              <ConversorBandejas />
            </div>
          )}

          <button
            onClick={() => {
              setSelectedSiembra(null);
              setRegistroSemillaParaSembrar(null);
              setIsFormOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-accent hover:brightness-95 text-paper font-semibold px-4 sm:px-5 py-2.5 rounded-base transition-all cursor-pointer text-sm sm:text-base whitespace-nowrap"
          >
            <Plus className="w-5 h-5 hidden sm:block" />
            Nueva Siembra
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-paper rounded-panel border border-line p-4 flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-faint" />
          </span>
          <input
            type="text"
            placeholder={searchMode === 'NUMERO_SIEMBRA' ? 'Buscar sólo por número de siembra...' : 'Buscar por variedad, número de siembra, lote o dueño...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-line rounded-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-canvas/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-canvas rounded-base p-1 shrink-0">
          <button
            type="button"
            onClick={() => setSearchMode('TODO')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-base text-xs font-semibold transition-colors cursor-pointer ${
              searchMode === 'TODO' ? 'bg-paper text-ink' : 'text-muted hover:text-body'
            }`}
          >
            Todo
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('NUMERO_SIEMBRA')}
            className={`flex-1 md:flex-none px-3 py-1.5 rounded-base text-xs font-semibold transition-colors cursor-pointer ${
              searchMode === 'NUMERO_SIEMBRA' ? 'bg-paper text-accent-ink' : 'text-muted hover:text-body'
            }`}
          >
            Sólo Nº Siembra
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-bg border border-danger-line rounded-panel p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-danger-ink">Error</h3>
            <p className="mt-1 text-sm text-danger">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      ) : filteredSiembras.length === 0 ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center text-center">
          <Inbox className="w-12 h-12 text-faint mb-4" />
          <h3 className="text-lg font-semibold text-ink">No hay siembras</h3>
          <p className="mt-2 text-sm text-muted">Comienza registrando un nuevo lote en cultivo.</p>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards Layout */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {siembrasOrdenadas.map((siembra) => {
              const est = parsearFechaLocal(siembra.fechaEstimada);
              const { progress, diffDays, colorClass } = calcularProgresoSiembra(siembra);

              const isExpanded = expandedIds.has(siembra.id);

              return (
                <div
                  key={siembra.id}
                  id={`siembra-${siembra.id}`}
                  className={`bg-paper border rounded-panel overflow-hidden transition-colors duration-700 ${
                    siembraResaltada === siembra.id ? 'border-accent bg-accent-soft' : 'border-line'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(siembra.id)}
                    className="w-full text-left p-4 flex flex-col gap-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-base text-sm font-bold font-mono tabular-nums bg-accent-soft text-accent-ink border border-accent">
                          Nº {siembra.numeroSiembra || '-'}
                        </span>
                        {siembra.codigoLote && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-base text-sm font-bold font-mono tabular-nums bg-accent-soft text-accent-ink border border-accent">
                            Lote {siembra.codigoLote}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(siembra.estado)}
                    </div>

                    {/* Fecha de siembra visible sin abrir la tarjeta (pedido del dueño
                        2026-09-06, mismo criterio que Registro de Semillas). */}
                    {formatPeriodoSiembra(siembra) && (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <Calendar className="w-4 h-4 text-accent shrink-0" />
                        Sembrado: <span className="font-mono tabular-nums">{formatPeriodoSiembra(siembra)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center shrink-0">
                          <Sprout className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-ink text-sm truncate">
                          {siembra.variedadPlanta?.nombre || '-'}
                        </span>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-faint shrink-0" />
                        : <ChevronDown className="w-5 h-5 text-faint shrink-0" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-line pt-3">
                      {/* Tipo de bandeja ya se muestra al lado de "Cant. Inicial" más abajo, no
                          duplicarlo acá (pedido del dueño 2026-09-06). */}
                      <p className="text-xs text-muted">
                        {formatOrigen(siembra.tipoOrigen)}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-sm bg-canvas rounded-base p-3 border border-line">
                        <div>
                          <span className="text-muted block text-xs mb-0.5">Dueño</span>
                          <span className="font-medium text-ink">{siembra.dueno}</span>
                        </div>
                        <div>
                          <span className="text-muted block text-xs mb-0.5">Cant. Inicial</span>
                          <span className="font-medium text-ink font-mono tabular-nums">{siembra.cantidad} u</span>
                          <span className="font-medium text-ink">&nbsp;&nbsp;x&nbsp;&nbsp;{siembra.variedadBandeja?.nombre || '-'}</span>
                        </div>
                      </div>

                      {siembra.observaciones && (
                        <div className="flex items-start gap-2 bg-warn-bg border border-warn-line rounded-base p-2.5">
                          <MessageSquare className="w-4 h-4 text-warn-ink shrink-0 mt-0.5" />
                          <p className="text-sm font-semibold text-warn-ink">{siembra.observaciones}</p>
                        </div>
                      )}

                      {est && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-medium text-muted">Progreso Estimado</span>
                            <span className="text-xs font-semibold text-body font-mono tabular-nums">
                              {est.toLocaleDateString('es-AR')} {diffDays > 0 ? `(${diffDays}d)` : '(Lista)'}
                            </span>
                          </div>
                          <div className="w-full bg-thead rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${colorClass}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                        {(siembra.estado === 'FINALIZADA' || siembra.estado === 'EN_PROCESO') && (
                          <button
                            onClick={() => iniciarPaseAStock(siembra)}
                            className="flex-1 py-2 bg-accent-soft hover:brightness-95 text-accent-ink font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <PackagePlus className="w-4 h-4" /> Stock
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSiembra(siembra);
                            setIsFormOpen(true);
                          }}
                          className="flex-1 py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                        <button
                          onClick={() =>
                            askConfirm({
                              title: '¿Eliminar siembra?',
                              message: 'Esta acción no se puede deshacer.',
                              variant: 'danger',
                              confirmLabel: 'Eliminar',
                              onConfirm: () => handleDelete(siembra.id),
                            })
                          }
                          className="flex-1 py-2 bg-danger-bg hover:brightness-95 text-danger-ink font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Table Layout */}
          <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-thead border-b border-line">
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Variedad / Identificación</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Dueño</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Cant. Inicial</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Entrega Est.</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {siembrasOrdenadas.map((siembra) => (
                  <tr
                    key={siembra.id}
                    id={`siembra-${siembra.id}`}
                    className={`hover:bg-canvas transition-colors duration-700 group ${
                      siembraResaltada === siembra.id ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-ink">{siembra.variedadPlanta?.nombre || '-'}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-base text-xs font-bold font-mono tabular-nums bg-accent-soft text-accent-ink border border-accent">
                          Nº {siembra.numeroSiembra || '-'}
                        </span>
                        {siembra.codigoLote && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-base text-xs font-bold font-mono tabular-nums bg-accent-soft text-accent-ink border border-accent">
                            Lote {siembra.codigoLote}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-1">{formatOrigen(siembra.tipoOrigen)} • Bandeja: {siembra.variedadBandeja?.nombre || '-'}</div>
                      {formatPeriodoSiembra(siembra) && (
                        <div className="text-xs text-muted">Sembrado: {formatPeriodoSiembra(siembra)}</div>
                      )}
                      {siembra.observaciones && (
                        <div className="text-xs text-muted mt-0.5">{siembra.observaciones}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-body">
                      {siembra.dueno}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-body font-mono tabular-nums">
                      {siembra.cantidad} u.
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-body">
                      {(() => {
                        if (!siembra.fechaEstimada) return '-';
                        const est = parsearFechaLocal(siembra.fechaEstimada);
                        const { progress, diffDays, colorClass } = calcularProgresoSiembra(siembra);

                        return (
                          <div className="flex flex-col gap-1 w-32">
                            <span className="text-xs text-body font-mono tabular-nums">
                              {est.toLocaleDateString('es-AR')}
                              {diffDays > 0 ? ` (en ${diffDays} d)` : ' (Lista)'}
                            </span>
                            <div className="w-full bg-thead rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${colorClass}`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(siembra.estado)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {(siembra.estado === 'FINALIZADA' || siembra.estado === 'EN_PROCESO') && (
                          <button
                            onClick={() => iniciarPaseAStock(siembra)}
                            className="p-1.5 hover:bg-accent-soft text-accent-ink rounded-base transition-colors cursor-pointer"
                            title="Pasar a Stock"
                          >
                            <PackagePlus className="w-4.5 h-4.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSiembra(siembra);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-canvas text-body hover:text-accent-ink rounded-base transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() =>
                            askConfirm({
                              title: '¿Eliminar siembra?',
                              message: 'Esta acción no se puede deshacer.',
                              variant: 'danger',
                              confirmLabel: 'Eliminar',
                              onConfirm: () => handleDelete(siembra.id),
                            })
                          }
                          className="p-1.5 hover:bg-danger-bg text-body hover:text-danger rounded-base transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {isFormOpen && (
        <SiembraForm
          isOpen={isFormOpen}
          siembra={selectedSiembra}
          registroSemillaInicial={registroSemillaParaSembrar}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedSiembra(null);
            setRegistroSemillaParaSembrar(null);
          }}
        />
      )}

      {isFinalizarOpen && (
        <FinalizarSiembraModal
          isOpen={isFinalizarOpen}
          siembra={siembraToFinalizar}
          onFinalizar={handleFinalizar}
          onCancel={() => {
            setIsFinalizarOpen(false);
            setSiembraToFinalizar(null);
          }}
        />
      )}

      {isPaseStockOpen && (
        <PaseStockModal
          isOpen={isPaseStockOpen}
          siembra={siembraToPaseStock}
          onClose={() => {
            setIsPaseStockOpen(false);
            setSiembraToPaseStock(null);
          }}
          onConfirm={handlePaseStock}
        />
      )}
    </div>
  );
};

export default Siembras;
