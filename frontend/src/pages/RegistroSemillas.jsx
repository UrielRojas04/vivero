import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { registroSemillasApi } from '../api/registroSemillas.api';
import RegistroSemillaForm from '../components/RegistroSemillaForm';
import ComprobanteSemillaModal from '../components/ComprobanteSemillaModal';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { describirEstadoRegistroSemilla } from '../utils/registroSemillaDisplay';
import { calcularRangoQuincena, calcularRangoProximoMes, fechaStringDentroDeRango } from '../utils/quincenas';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Inbox, Sprout, Receipt, PackageCheck, CheckCircle2, ChevronDown, ChevronUp, Calendar, MessageSquare } from 'lucide-react';

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
  const partes = String(fecha).split('-');
  if (partes.length === 3) {
    const [anio, mes, dia] = partes;
    return new Date(Number(anio), Number(mes) - 1, Number(dia)).toLocaleDateString('es-AR');
  }
  return new Date(fecha).toLocaleDateString('es-AR');
};

const formatearCantidad = (registro) => {
  const numero = Number(registro.cantidad);
  const cantidadFmt = Number.isFinite(numero) ? numero.toLocaleString('es-AR') : registro.cantidad;
  const unidad = etiquetaUnidad(registro.unidadCantidad, registro.cantidad);
  return `${cantidadFmt} ${unidad}`.trim();
};

const RegistroSemillas = () => {
  const queryClient = useQueryClient();
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // Tarjetas mobile colapsadas por defecto (pedido del dueño 2026-09-05, mismo patrón que ya
  // usa Siembras.jsx): botones y detalle ocultos hasta hacer click en la tarjeta.
  const [expandedIds, setExpandedIds] = useState(new Set());
  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  // null | 'QUINCENA_ACTUAL' | 'QUINCENA_PROXIMA' | 'PROXIMO_MES' | 'CONSUMIDAS' -- un solo
  // filtro activo a la vez (pedido del dueño 2026-09-05: sumó "Próximo mes" y "Consumidas" a
  // los dos de quincena que ya existían). Arranca en 'QUINCENA_ACTUAL' (pedido del dueño
  // 2026-09-06): al entrar a la pantalla, lo relevante es lo que hay que sembrar YA, no toda la
  // agenda histórica -- el usuario puede sacarlo con un click si necesita ver todo.
  const [filtroActivo, setFiltroActivo] = useState('QUINCENA_ACTUAL');
  // Resalta la tarjeta al llegar desde la notificación de la campana (pedido del dueño
  // 2026-09-05): id de un solo uso, se limpia solo a los pocos segundos.
  const [registroResaltado, setRegistroResaltado] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState(null);

  const [isComprobanteOpen, setIsComprobanteOpen] = useState(false);
  const [registroComprobante, setRegistroComprobante] = useState(null);

  const fetchRegistros = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await registroSemillasApi.getAll();
      setRegistros(response.data || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos suficientes para ver los registros de semillas.');
      } else {
        setError('Ocurrió un error al cargar los registros de semillas.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  useEffect(() => {
    if (location.state?.resaltarRegistroId) {
      const id = location.state.resaltarRegistroId;
      // Se resetean los filtros para garantizar que la tarjeta resaltada esté visible, sin
      // importar qué filtro hubiera quedado activo de una visita anterior a esta pantalla.
      setFiltroActivo(null);
      setSearchTerm('');
      setRegistroResaltado(id);
      // Con las tarjetas colapsadas por defecto, resaltar sin expandir dejaría el detalle y los
      // botones escondidos justo en la tarjeta a la que se supone que hay que prestarle atención.
      setExpandedIds((prev) => new Set(prev).add(id));
      navigate(location.pathname, { replace: true, state: {} });
      const timeout = setTimeout(() => setRegistroResaltado(null), 2500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (registroResaltado != null) {
      const el = document.getElementById(`registro-semilla-${registroResaltado}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [registroResaltado]);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (selectedRegistro) {
        await registroSemillasApi.update(selectedRegistro.id, formData);
      } else {
        await registroSemillasApi.create(formData);
      }
      setIsFormOpen(false);
      setSelectedRegistro(null);
      fetchRegistros();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      pushToast('success', 'Registro de semilla guardado correctamente.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para registrar semillas (requiere ESCRIBIR_REGISTRO_SEMILLAS).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar el registro de semilla.'));
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await registroSemillasApi.delete(id);
      fetchRegistros();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      pushToast('success', 'Registro de semilla eliminado.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para eliminar registros de semillas (requiere ESCRIBIR_REGISTRO_SEMILLAS).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar el registro de semilla.'));
      }
    }
  };

  const handleConsumir = async (id) => {
    try {
      await registroSemillasApi.consumir(id);
      fetchRegistros();
      queryClient.invalidateQueries({ queryKey: ['bandejas-disponibles'] });
      pushToast('success', 'Registro marcado como consumido.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para consumir registros de semillas (requiere ESCRIBIR_REGISTRO_SEMILLAS).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al marcar el registro como consumido.'));
      }
    }
  };

  const handleSembrar = (registro) => {
    // Router state, no query param (pedido del dueño 2026-09-05): es un dato de un solo uso
    // para precargar el modal de Nueva Siembra, no tiene sentido que quede en la URL.
    navigate('/siembras', { state: { registroSemillaParaSembrar: registro } });
  };

  const filteredRegistros = registros.filter((r) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const coincide = (r.nombreQuienTrajo && r.nombreQuienTrajo.toLowerCase().includes(term)) ||
        (r.lote && r.lote.toLowerCase().includes(term)) ||
        (r.descripcionSemilla && r.descripcionSemilla.toLowerCase().includes(term));
      if (!coincide) return false;
    }

    if (filtroActivo === 'CONSUMIDAS') {
      return r.estado === 'CONSUMIDA';
    }

    if (filtroActivo) {
      // Un registro CONSUMIDA ya no es una siembra pendiente que mostrar (Decisión 5 de
      // design.md); SEMBRADAS sí sigue siendo relevante porque puede repartirse en tandas.
      if (r.estado === 'CONSUMIDA') return false;
      const { desde, hasta } = filtroActivo === 'PROXIMO_MES'
        ? calcularRangoProximoMes()
        : calcularRangoQuincena(filtroActivo === 'QUINCENA_ACTUAL' ? 0 : 1);
      if (!fechaStringDentroDeRango(r.fechaSiembraProgramada, desde, hasta)) return false;
    }

    return true;
  });

  // Las consumidas se agrupan al final (pedido del dueño 2026-09-05): sin filtro activo, antes
  // aparecían mezcladas con el resto por orden de creación -- una consumida podía salir arriba de
  // todo, tapando los registros realmente pendientes.
  //
  // Dentro de cada grupo, orden por fecha de siembra programada ascendente (pedido del dueño
  // 2026-09-06): lo que hay que sembrar primero va arriba de todo, para que quede claro en el
  // celular de los empleados. Se aplica siempre por defecto -- también con los filtros de
  // quincena/próximo mes activos, porque el sort corre DESPUÉS del filtro, sobre el resultado ya
  // filtrado. Sin fecha cargada, el registro se manda al final de su grupo (no hay forma de saber
  // qué tan urgente es).
  const registrosOrdenados = [...filteredRegistros].sort((a, b) => {
    const consumidaDiff = (a.estado === 'CONSUMIDA' ? 1 : 0) - (b.estado === 'CONSUMIDA' ? 1 : 0);
    if (consumidaDiff !== 0) return consumidaDiff;
    const fechaA = a.fechaSiembraProgramada ? new Date(a.fechaSiembraProgramada).getTime() : Infinity;
    const fechaB = b.fechaSiembraProgramada ? new Date(b.fechaSiembraProgramada).getTime() : Infinity;
    return fechaA - fechaB;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">Registro de Semillas</h1>
            <Sprout className="w-6 h-6 text-accent" />
          </div>
          <p className="mt-1 text-sm text-muted">Constancia de las semillas que los clientes traen para germinar.</p>
        </div>

        <button
          onClick={() => {
            setSelectedRegistro(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-accent hover:brightness-95 text-paper font-semibold px-4 sm:px-5 py-2.5 rounded-base transition-all cursor-pointer text-sm sm:text-base whitespace-nowrap"
        >
          <Plus className="w-5 h-5 hidden sm:block" />
          Nuevo Registro
        </button>
      </div>

      {/* Search + filtros de quincena */}
      <div className="bg-paper rounded-panel border border-line p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-faint" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, lote o semilla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-line rounded-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent bg-canvas/50 transition-all"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:shrink-0">
          <button
            type="button"
            onClick={() => setFiltroActivo(filtroActivo === 'QUINCENA_ACTUAL' ? null : 'QUINCENA_ACTUAL')}
            className={`px-3 py-2 rounded-base text-sm font-medium border transition-colors cursor-pointer text-center ${
              filtroActivo === 'QUINCENA_ACTUAL'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-body border-line hover:bg-canvas'
            }`}
          >
            Quincena actual
          </button>
          <button
            type="button"
            onClick={() => setFiltroActivo(filtroActivo === 'QUINCENA_PROXIMA' ? null : 'QUINCENA_PROXIMA')}
            className={`px-3 py-2 rounded-base text-sm font-medium border transition-colors cursor-pointer text-center ${
              filtroActivo === 'QUINCENA_PROXIMA'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-body border-line hover:bg-canvas'
            }`}
          >
            Próxima quincena
          </button>
          <button
            type="button"
            onClick={() => setFiltroActivo(filtroActivo === 'PROXIMO_MES' ? null : 'PROXIMO_MES')}
            className={`px-3 py-2 rounded-base text-sm font-medium border transition-colors cursor-pointer text-center ${
              filtroActivo === 'PROXIMO_MES'
                ? 'bg-accent text-paper border-accent'
                : 'bg-paper text-body border-line hover:bg-canvas'
            }`}
          >
            Próximo mes
          </button>
          <button
            type="button"
            onClick={() => setFiltroActivo(filtroActivo === 'CONSUMIDAS' ? null : 'CONSUMIDAS')}
            className={`px-3 py-2 rounded-base text-sm font-medium border transition-colors cursor-pointer text-center ${
              filtroActivo === 'CONSUMIDAS'
                ? 'bg-warn text-paper border-warn'
                : 'bg-paper text-body border-line hover:bg-canvas'
            }`}
          >
            Consumidas
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

      {loading ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      ) : filteredRegistros.length === 0 ? (
        <div className="bg-paper rounded-panel border border-line p-16 flex flex-col items-center justify-center text-center">
          <Inbox className="w-12 h-12 text-faint mb-4" />
          <h3 className="text-lg font-semibold text-ink">No hay registros de semillas</h3>
          <p className="mt-2 text-sm text-muted">Comenzá registrando la próxima entrega de un cliente.</p>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {registrosOrdenados.map((registro) => {
              const estadoInfo = describirEstadoRegistroSemilla(registro.estado);
              const isExpanded = expandedIds.has(registro.id);
              return (
              <div
                key={registro.id}
                id={`registro-semilla-${registro.id}`}
                className={`bg-paper border rounded-panel overflow-hidden transition-colors duration-700 ${
                  registroResaltado === registro.id ? 'border-accent bg-accent-soft' : 'border-line'
                }`}
              >
                {/* Colapsada por defecto (pedido del dueño 2026-09-05, mismo patrón que ya usa
                    Siembras.jsx): detalle y botones ocultos hasta hacer click en la tarjeta. */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(registro.id)}
                  className="w-full text-left p-4 flex flex-col gap-2 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-base text-sm font-bold font-mono tabular-nums bg-accent-soft text-accent-ink border border-accent">
                      Lote {registro.lote}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-base text-xs font-semibold ${estadoInfo.tono.chip}`}>
                      {registro.estado === 'SEMBRADAS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {estadoInfo.etiqueta}
                    </span>
                  </div>

                  {/* Fecha de siembra visible sin abrir la tarjeta (pedido del dueño 2026-09-06):
                      los empleados necesitan saber rápido qué toca sembrar, sin tener que
                      expandir el detalle de cada registro uno por uno. */}
                  {registro.fechaSiembraProgramada && (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
                      <Calendar className="w-4 h-4 text-accent shrink-0" />
                      A sembrar: <span className="font-mono tabular-nums">{formatearFecha(registro.fechaSiembraProgramada)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center shrink-0">
                        <Sprout className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-ink text-sm truncate">
                        {registro.descripcionSemilla}
                      </span>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-5 h-5 text-faint shrink-0" />
                      : <ChevronDown className="w-5 h-5 text-faint shrink-0" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 flex flex-col gap-3 border-t border-line pt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm bg-canvas rounded-base p-3 border border-line">
                      <div>
                        <span className="text-muted block text-xs mb-0.5">Quién trajo</span>
                        <span className="font-medium text-ink">{registro.nombreQuienTrajo}</span>
                      </div>
                      <div>
                        <span className="text-muted block text-xs mb-0.5">Cantidad</span>
                        <span className="font-medium text-ink font-mono tabular-nums">{formatearCantidad(registro)}</span>
                        {registro.unidadCantidad === 'SOBRES' && registro.contenidoPorSobre != null && (
                          <span className="block text-xs text-muted font-mono tabular-nums">
                            {/* Registros cargados antes de que existiera contenidoPorSobreUnidad quedaron
                                con el dato en blanco en la base -- se trata como SEMILLAS (bug real
                                2026-09-06: sin este default, esos registros mostraban el número sin
                                ninguna unidad al lado, no sólo los que de verdad eran en gramos). */}
                            {Number(registro.contenidoPorSobre).toLocaleString('es-AR')} {etiquetaUnidad(registro.contenidoPorSobreUnidad || 'SEMILLAS', registro.contenidoPorSobre)} c/u
                          </span>
                        )}
                        {registro.totalSemillas != null && (
                          <span className="block text-xs text-accent-ink font-mono tabular-nums">= {Number(registro.totalSemillas).toLocaleString('es-AR')} semillas</span>
                        )}
                      </div>
                    </div>

                    {/* "A sembrar" ya se muestra arriba, en el header colapsado de la tarjeta
                        (siempre visible) -- acá sólo queda la fecha de entrega, para no
                        duplicarla. */}
                    <p className="text-xs text-muted">Entrega: <span className="font-mono tabular-nums">{formatearFecha(registro.fechaEntrega)}</span></p>
                    {registro.observaciones && (
                      <div className="flex items-start gap-2 bg-warn-bg border border-warn-line rounded-base p-2.5">
                        <MessageSquare className="w-4 h-4 text-warn-ink shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-warn-ink">{registro.observaciones}</p>
                      </div>
                    )}

                    {/* Rediseño mobile (2026-09-05, reportado por el dueño): con 5 botones
                        posibles, flex-1 + flex-wrap apretaba los primeros 4 en una fila angosta
                        y dejaba el que sobraba (normalmente Eliminar) solo en la fila
                        siguiente, estirado a todo el ancho de la tarjeta. "Sembrar" (la acción
                        principal) queda como botón propio de ancho completo; el resto va en
                        una grilla fija de 2 columnas, que no estira un botón suelto aunque sea
                        impar (3, con CONSUMIDA). */}
                    <div className="pt-2 border-t border-line space-y-2">
                      {registro.estado !== 'CONSUMIDA' && (
                        <button
                          onClick={() => handleSembrar(registro)}
                          className="w-full py-2 bg-accent hover:brightness-95 text-paper font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Sprout className="w-4 h-4" /> Sembrar
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setRegistroComprobante(registro);
                            setIsComprobanteOpen(true);
                          }}
                          className="py-2 bg-accent-soft hover:brightness-95 text-accent-ink font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Receipt className="w-4 h-4" /> Comprobante
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRegistro(registro);
                            setIsFormOpen(true);
                          }}
                          className="py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                        {registro.estado !== 'CONSUMIDA' && (
                          <button
                            onClick={() =>
                              askConfirm({
                                title: '¿Consumir registro?',
                                message: 'Esta acción es definitiva: el registro dejará de aparecer como opción para vincular en siembras nuevas.',
                                confirmLabel: 'Consumir',
                                onConfirm: () => handleConsumir(registro.id),
                              })
                            }
                            className="py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                          >
                            <PackageCheck className="w-4 h-4" /> Consumir
                          </button>
                        )}
                        <button
                          onClick={() =>
                            askConfirm({
                              title: '¿Eliminar registro?',
                              message: 'Esta acción no se puede deshacer.',
                              variant: 'danger',
                              confirmLabel: 'Eliminar',
                              onConfirm: () => handleDelete(registro.id),
                            })
                          }
                          className="py-2 bg-danger-bg hover:brightness-95 text-danger-ink font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW: Table */}
          <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-thead border-b border-line">
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">A Sembrar</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Entrega</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Lote</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Quién trajo</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Semilla</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Cantidad</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {registrosOrdenados.map((registro) => {
                    const estadoInfo = describirEstadoRegistroSemilla(registro.estado);
                    return (
                    <tr
                      key={registro.id}
                      id={`registro-semilla-${registro.id}`}
                      className={`hover:bg-canvas transition-colors duration-700 group ${
                        registroResaltado === registro.id ? 'bg-accent-soft' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-body font-mono tabular-nums">
                        {formatearFecha(registro.fechaSiembraProgramada)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-body font-mono tabular-nums">
                        {formatearFecha(registro.fechaEntrega)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-base text-xs font-bold font-mono tabular-nums bg-accent-soft text-accent-ink border border-accent">
                          {registro.lote}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-body">
                        <div className="font-medium text-ink">{registro.nombreQuienTrajo}</div>
                        {registro.telefonoContacto && (
                          <div className="text-xs text-muted">{registro.telefonoContacto}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-body max-w-[240px] break-words">
                        {registro.descripcionSemilla}
                        {registro.observaciones && (
                          <div className="text-xs text-muted mt-0.5">{registro.observaciones}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-body font-mono tabular-nums">
                        {formatearCantidad(registro)}
                        {registro.unidadCantidad === 'SOBRES' && registro.contenidoPorSobre != null && (
                          <div className="text-xs text-muted">
                            {Number(registro.contenidoPorSobre).toLocaleString('es-AR')} {etiquetaUnidad(registro.contenidoPorSobreUnidad || 'SEMILLAS', registro.contenidoPorSobre)} c/u
                          </div>
                        )}
                        {registro.totalSemillas != null && (
                          <div className="text-xs text-accent-ink">= {Number(registro.totalSemillas).toLocaleString('es-AR')} semillas</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-base text-xs font-semibold ${estadoInfo.tono.chip}`}>
                          {registro.estado === 'SEMBRADAS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {estadoInfo.etiqueta}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {registro.estado !== 'CONSUMIDA' && (
                            <button
                              onClick={() => handleSembrar(registro)}
                              className="p-1.5 hover:bg-accent-soft text-accent-ink rounded-base transition-colors cursor-pointer"
                              title="Sembrar"
                            >
                              <Sprout className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setRegistroComprobante(registro);
                              setIsComprobanteOpen(true);
                            }}
                            className="p-1.5 hover:bg-accent-soft text-accent-ink rounded-base transition-colors cursor-pointer"
                            title="Ver comprobante"
                          >
                            <Receipt className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRegistro(registro);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 hover:bg-canvas text-body hover:text-accent-ink rounded-base transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-4.5 h-4.5" />
                          </button>
                          {registro.estado !== 'CONSUMIDA' && (
                            <button
                              onClick={() =>
                                askConfirm({
                                  title: '¿Consumir registro?',
                                  message: 'Esta acción es definitiva: el registro dejará de aparecer como opción para vincular en siembras nuevas.',
                                  confirmLabel: 'Consumir',
                                  onConfirm: () => handleConsumir(registro.id),
                                })
                              }
                              className="p-1.5 hover:bg-canvas text-body hover:text-ok-ink rounded-base transition-colors cursor-pointer"
                              title="Consumir"
                            >
                              <PackageCheck className="w-4.5 h-4.5" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              askConfirm({
                                title: '¿Eliminar registro?',
                                message: 'Esta acción no se puede deshacer.',
                                variant: 'danger',
                                confirmLabel: 'Eliminar',
                                onConfirm: () => handleDelete(registro.id),
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isFormOpen && (
        <RegistroSemillaForm
          isOpen={isFormOpen}
          registro={selectedRegistro}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setSelectedRegistro(null);
          }}
        />
      )}

      {isComprobanteOpen && (
        <ComprobanteSemillaModal
          isOpen={isComprobanteOpen}
          registro={registroComprobante}
          onClose={() => {
            setIsComprobanteOpen(false);
            setRegistroComprobante(null);
          }}
        />
      )}
    </div>
  );
};

export default RegistroSemillas;
