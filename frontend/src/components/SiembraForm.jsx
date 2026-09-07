import React, { useState, useEffect } from 'react';
import { X, Sprout, Search, UserPlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import { clientesApi } from '../api/clientes.api';
import { registroSemillasApi } from '../api/registroSemillas.api';
import { calcularFechaSumandoDias } from '../utils/diasCrecimiento';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';

// Semillas totales de un RegistroSemilla, sólo cuando la unidad es convertible (change
// trazabilidad-semillas-siembras, 2026-09-04): SEMILLAS directo, SOBRES × contenidoPorSobre.
// GRAMOS (pedido del dueño 2026-09-05): reusa `totalSemillas`, ya calculado por el backend
// (RegistroSemillaServiceImpl) cuando el registro está vinculado a una VariedadPlanta con
// semillasPorGramo cargado -- evita duplicar acá esa conversión, que necesita el dato de la
// variedad y no sólo del registro. Sin ese dato (variedad vieja o sin vincular), totalSemillas
// llega null y sigue sin sugerir ninguna cantidad, igual que antes.
const calcularSemillasDeRegistro = (registro) => {
  if (!registro) return null;
  if (registro.unidadCantidad === 'SEMILLAS') return Number(registro.cantidad) || 0;
  if (registro.unidadCantidad === 'SOBRES') {
    return (Number(registro.cantidad) || 0) * (Number(registro.contenidoPorSobre) || 0);
  }
  if (registro.unidadCantidad === 'GRAMOS' && registro.totalSemillas != null) {
    return Number(registro.totalSemillas);
  }
  return null;
};

// Bandejas sugeridas = semillas del registro ÷ celdas de la bandeja, redondeado hacia abajo
// (Decisión 3 de design.md). Es sólo una sugerencia editable, nunca una validación.
const calcularBandejasSugeridas = (registro, bandeja) => {
  const semillas = calcularSemillasDeRegistro(registro);
  if (semillas == null || !bandeja?.cantidadCeldas) return null;
  return Math.floor(semillas / bandeja.cantidadCeldas);
};

const SiembraForm = ({ isOpen, siembra, registroSemillaInicial, onSave, onCancel }) => {
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  const [busquedaPlanta, setBusquedaPlanta] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [busquedaDueno, setBusquedaDueno] = useState('');
  const [showDuenoDropdown, setShowDuenoDropdown] = useState(false);
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [tipoDueno, setTipoDueno] = useState('jefe');
  const [modoFechaSiembra, setModoFechaSiembra] = useState('UN_DIA');
  const [busquedaRegistro, setBusquedaRegistro] = useState('');
  const [showRegistroDropdown, setShowRegistroDropdown] = useState(false);
  // "misma sesión" del formulario (Decisión 3 de design.md): una vez que el usuario toca la
  // cantidad a mano, ninguna sugerencia automática (ni por registro ni por bandeja) la vuelve
  // a pisar, hasta que se cierre y reabra el formulario.
  const [cantidadTocadaManualmente, setCantidadTocadaManualmente] = useState(false);
  const [formData, setFormData] = useState({
    variedadPlantaId: '',
    variedadBandejaId: '',
    fechaEstimada: '',
    fechaSiembraInicio: '',
    fechaSiembraFin: '',
    dueno: '',
    codigoLote: '',
    numeroSiembra: '',
    tipoOrigen: 'SOBRE',
    cantidad: '',
    registroSemillaId: '',
    clienteId: '',
    observaciones: ''
  });

  const { data: plantas = [] } = useQuery({
    queryKey: ['variedades-plantas'],
    queryFn: async () => {
      const res = await variedadesPlantasApi.getAll();
      return res.data;
    },
    enabled: isOpen
  });

  const { data: bandejas = [] } = useQuery({
    queryKey: ['variedades-bandejas'],
    queryFn: async () => {
      const res = await variedadesBandejasApi.getAll();
      return res.data;
    },
    enabled: isOpen
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      return await clientesApi.getAll();
    },
    enabled: isOpen
  });

  const { data: registrosSemilla = [] } = useQuery({
    queryKey: ['registro-semillas'],
    queryFn: async () => {
      const res = await registroSemillasApi.getAll();
      return res.data;
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      if (siembra) {
        const fechaSiembraInicio = siembra.fechaSiembraInicio || '';
        const fechaSiembraFin = siembra.fechaSiembraFin || '';
        setFormData({
          variedadPlantaId: siembra.variedadPlanta?.id?.toString() || '',
          variedadBandejaId: siembra.variedadBandeja?.id?.toString() || '',
          fechaEstimada: siembra.fechaEstimada || '',
          fechaSiembraInicio,
          fechaSiembraFin,
          dueno: siembra.dueno || '',
          codigoLote: siembra.codigoLote || '',
          numeroSiembra: siembra.numeroSiembra || '',
          tipoOrigen: siembra.tipoOrigen || 'SOBRE',
          cantidad: siembra.cantidad || '',
          registroSemillaId: siembra.registroSemillaId ? siembra.registroSemillaId.toString() : '',
          clienteId: siembra.clienteId ? siembra.clienteId.toString() : '',
          observaciones: siembra.observaciones || ''
        });
        setBusquedaPlanta(siembra.variedadPlanta?.nombre || '');
        setBusquedaDueno(siembra.dueno || '');
        setTipoDueno((siembra.dueno && siembra.dueno !== 'Jefe / Vivero propio') ? 'cliente' : 'jefe');
        setModoFechaSiembra(
          fechaSiembraFin && fechaSiembraFin !== fechaSiembraInicio ? 'RANGO' : 'UN_DIA'
        );
        // El campo ahora hace doble función (búsqueda de registro + código de lote libre,
        // pedido del dueño 2026-09-05): si la siembra tiene un registro vinculado usa su lote,
        // si no, cae al codigoLote tipeado a mano -- para no mostrar vacío un valor que sí
        // existe.
        setBusquedaRegistro(siembra.registroSemillaLote || siembra.codigoLote || '');
      } else {
        setFormData({
          variedadPlantaId: '',
          variedadBandejaId: '',
          fechaEstimada: '',
          fechaSiembraInicio: '',
          fechaSiembraFin: '',
          dueno: 'Jefe / Vivero propio',
          codigoLote: '',
          numeroSiembra: '',
          tipoOrigen: 'SOBRE',
          cantidad: '',
          registroSemillaId: '',
          clienteId: '',
          observaciones: ''
        });
        setBusquedaPlanta('');
        setBusquedaDueno('');
        setTipoDueno('jefe');
        setModoFechaSiembra('UN_DIA');
        setBusquedaRegistro('');
        // La precarga del registro (botón "Sembrar") se dispara en el efecto de abajo, no acá
        // -- ver comentario ahí para el motivo.
      }
      setShowDropdown(false);
      setShowDuenoDropdown(false);
      setShowRegistroDropdown(false);
      setCantidadTocadaManualmente(false);
    }
  }, [isOpen, siembra, registroSemillaInicial]);

  // Bug real corregido (2026-09-05, reportado por el dueño: "la primera vez la variedad no se
  // carga"): antes esta precarga vivía en el efecto de arriba, que corre apenas isOpen pasa a
  // true -- en ese instante `plantas` todavía es `[]` (el useQuery de variedades-plantas recién
  // arranca, enabled: isOpen) la PRIMERA vez que se abre el modal en la sesión. seleccionarRegistroSemilla
  // busca la variedad vinculada con `plantas.find(...)`, así que con `plantas` vacío nunca la
  // encontraba y la dejaba en blanco. Aperturas siguientes "funcionaban" de casualidad porque
  // React Query ya tenía `plantas` cacheado en memoria y lo devolvía poblado de entrada. Efecto
  // separado (no fusionado con el de arriba) para no resetear el resto del formulario cada vez
  // que `plantas` cambia de referencia mientras el modal sigue abierto.
  useEffect(() => {
    if (isOpen && !siembra && registroSemillaInicial) {
      seleccionarRegistroSemilla(registroSemillaInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, siembra, registroSemillaInicial, plantas]);

  const plantasFiltradas = busquedaPlanta 
    ? plantas.filter(p => p.nombre.toLowerCase().includes(busquedaPlanta.toLowerCase()))
    : plantas;

  const clientesMapeados = clientes.map(c => ({ id: c.id, nombre: c.nombreRazonSocial || `Cliente #${c.id}` }));

  const duenosFiltrados = busquedaDueno 
    ? clientesMapeados.filter(d => d.nombre.toLowerCase().includes(busquedaDueno.toLowerCase()))
    : clientesMapeados;

  // Pedido del dueño 2026-09-05: en modo "Cliente" ya no se acepta nombre libre (a diferencia
  // de Registro de Semilla / Variedad de Planta), tiene que ser un cliente real del catálogo --
  // por eso acá se guarda también el id, no sólo el nombre.
  const seleccionarDueno = (cliente) => {
    setBusquedaDueno(cliente.nombre);
    setFormData(prev => ({ ...prev, dueno: cliente.nombre, clienteId: cliente.id.toString() }));
    setShowDuenoDropdown(false);
  };

  // Crear cliente al vuelo desde este mismo buscador (pedido del dueño 2026-09-05, mismo
  // criterio que RegistroSemillaForm.jsx): el modelo de Cliente acá es sólo nombre + teléfono,
  // así que crearlo desde acá es el formulario completo. Sin campo de teléfono propio en este
  // buscador (a diferencia de Registro de Semillas), se crea sin teléfono -- editable después
  // desde la sección Clientes si hace falta.
  const crearClienteRapido = async () => {
    const nombre = busquedaDueno.trim();
    if (!nombre || creandoCliente) return;
    setCreandoCliente(true);
    try {
      const nuevo = await clientesApi.create({ nombreRazonSocial: nombre, telefono: '' });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      seleccionarDueno({ id: nuevo.id, nombre: nuevo.nombreRazonSocial });
      pushToast('success', `Cliente "${nuevo.nombreRazonSocial}" creado.`);
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo crear el cliente.'));
    } finally {
      setCreandoCliente(false);
    }
  };

  // Excluye CONSUMIDA (change trazabilidad-semillas-siembras, Decisión 4 de design.md): un
  // registro ya consumido no se ofrece para vincular en siembras nuevas.
  const registrosSemillaDisponibles = registrosSemilla.filter(r => r.estado !== 'CONSUMIDA');
  const registrosSemillaFiltrados = busquedaRegistro
    ? registrosSemillaDisponibles.filter(r =>
        (r.lote && r.lote.toLowerCase().includes(busquedaRegistro.toLowerCase())) ||
        (r.nombreQuienTrajo && r.nombreQuienTrajo.toLowerCase().includes(busquedaRegistro.toLowerCase()))
      )
    : registrosSemillaDisponibles;

  const seleccionarRegistroSemilla = (registro) => {
    setBusquedaRegistro(registro.lote);
    setShowRegistroDropdown(false);

    // Autocompleta la variedad de planta del registro, si tiene una vinculada del catálogo
    // (pedido del dueño 2026-09-04). Un registro con nombre libre (sin variedadPlantaId) no
    // tiene un id real para autocompletar acá -- se deja la selección de planta como estaba.
    const variedadVinculada = registro.variedadPlantaId != null
      ? plantas.find(p => p.id === registro.variedadPlantaId)
      : null;
    if (variedadVinculada) setBusquedaPlanta(variedadVinculada.nombre);

    // Autocompleta tipo y cantidad de bandeja con lo que ya se había cargado en el registro de
    // semilla (pedido del dueño 2026-09-05): son los mismos datos que RegistroSemillaForm.jsx ya
    // pide al recibir la semilla, no tiene sentido volver a elegirlos de cero acá.
    const bandejaVinculada = registro.variedadBandejaId != null
      ? bandejas.find(b => b.id === registro.variedadBandejaId)
      : null;

    // Autocompleta el dueño de la siembra con "quién trajo la semilla" del registro, sea
    // cliente real o nombre libre (pedido del dueño 2026-09-05: "que al pasar a siembra ese
    // registro de semilla también pase el dueño, sea cliente o no"). Mismo patrón "buscar o
    // escribir libre" que ya usa este mismo campo (ver seleccionarDueno/onChange más abajo).
    if (registro.nombreQuienTrajo) {
      if (registro.nombreQuienTrajo === 'Jefe / Vivero propio') {
        setTipoDueno('jefe');
        setBusquedaDueno('');
      } else {
        setTipoDueno('cliente');
        setBusquedaDueno(registro.nombreQuienTrajo);
      }
    }

    setFormData(prev => {
      const next = { ...prev, registroSemillaId: registro.id.toString(), codigoLote: registro.lote };
      if (bandejaVinculada) {
        next.variedadBandejaId = bandejaVinculada.id.toString();
      }
      if (!cantidadTocadaManualmente) {
        if (registro.cantidadBandejas != null) {
          // Directo del registro (dato real ya cargado ahí), no una sugerencia calculada.
          next.cantidad = registro.cantidadBandejas.toString();
        } else {
          // Registros viejos, de antes de que existiera cantidadBandejas: cae a la sugerencia
          // calculada como siempre, con la bandeja recién vinculada (o la que ya estaba elegida).
          const bandeja = bandejaVinculada || bandejas.find(b => b.id.toString() === prev.variedadBandejaId);
          const sugerida = calcularBandejasSugeridas(registro, bandeja);
          if (sugerida != null) next.cantidad = sugerida.toString();
        }
      }
      if (variedadVinculada) {
        next.variedadPlantaId = variedadVinculada.id.toString();
        const fechaEstimadaCalculada = calcularFechaSumandoDias(variedadVinculada, next.fechaSiembraFin);
        if (fechaEstimadaCalculada) next.fechaEstimada = fechaEstimadaCalculada;
      }
      if (registro.nombreQuienTrajo) {
        next.dueno = registro.nombreQuienTrajo;
        next.clienteId = registro.clienteId != null ? registro.clienteId.toString() : '';
      }
      return next;
    });
  };

  // Aplica cambios sobre las fechas de siembra y recalcula la fecha estimada de
  // entrega en base a fechaSiembraFin (último día sembrado), si hay una variedad
  // seleccionada. El usuario sigue pudiendo sobrescribir el valor propuesto a mano.
  const actualizarFechaSiembra = (updates) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };
      const planta = plantas.find(p => p.id.toString() === prev.variedadPlantaId);
      if (planta) {
        const fechaEstimadaCalculada = calcularFechaSumandoDias(planta, next.fechaSiembraFin);
        if (fechaEstimadaCalculada) {
          next.fechaEstimada = fechaEstimadaCalculada;
        }
      }
      return next;
    });
  };

  const seleccionarPlanta = (planta) => {
    setBusquedaPlanta(planta.nombre);
    setShowDropdown(false);
    const id = planta.id.toString();

    setFormData(prev => {
      const fechaEstimadaCalculada = calcularFechaSumandoDias(planta, prev.fechaSiembraFin);
      return {
        ...prev,
        variedadPlantaId: id,
        ...(fechaEstimadaCalculada ? { fechaEstimada: fechaEstimadaCalculada } : {})
      };
    });
  };

  // handlePlantaChange eliminado porque ahora usamos seleccionarPlanta

  const handleBandejaChange = (e) => {
    const id = e.target.value;
    const bandeja = bandejas.find(b => b.id.toString() === id);
    const registroVinculado = registrosSemilla.find(r => r.id.toString() === formData.registroSemillaId);

    if (registroVinculado) {
      setFormData(prev => {
        const next = { ...prev, variedadBandejaId: id };
        if (!cantidadTocadaManualmente) {
          const sugerida = calcularBandejasSugeridas(registroVinculado, bandeja);
          if (sugerida != null) next.cantidad = sugerida.toString();
        }
        return next;
      });
      return;
    }

    // Comportamiento histórico, sin registro de semilla vinculado: no cambia con este change.
    if (bandeja && bandeja.cantidadCeldas) {
      setFormData(prev => ({
        ...prev,
        variedadBandejaId: id,
        cantidad: bandeja.cantidadCeldas.toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, variedadBandejaId: id }));
    }
  };

  if (!isOpen) return null;

  // Aviso de semillas sobrantes (pedido del dueño 2026-09-04): la sugerencia de bandejas
  // redondea hacia abajo, así que puede quedar semilla del registro sin asignar a ninguna
  // bandeja -- se avisa en vez de ocultarlo, en vez de forzar una bandeja de más que quedaría
  // sembrada a medias.
  const bandejaSeleccionada = bandejas.find(b => b.id.toString() === formData.variedadBandejaId);
  const registroVinculadoActual = registrosSemilla.find(r => r.id.toString() === formData.registroSemillaId);
  const totalSemillasSugeridas = formData.cantidad && bandejaSeleccionada
    ? Math.round(parseFloat(formData.cantidad) * (bandejaSeleccionada.cantidadCeldas || 0))
    : null;
  let avisoSobranteSemillas = null;
  if (registroVinculadoActual && bandejaSeleccionada && totalSemillasSugeridas != null) {
    const semillasDelRegistro = calcularSemillasDeRegistro(registroVinculadoActual);
    if (semillasDelRegistro != null && totalSemillasSugeridas < semillasDelRegistro) {
      const sobrante = semillasDelRegistro - totalSemillasSugeridas;
      avisoSobranteSemillas = `Sobran ${sobrante.toLocaleString('es-AR')} semillas del registro sin usar en esta cantidad de bandejas.`;
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...formData,
      variedadPlanta: formData.variedadPlantaId ? { id: parseInt(formData.variedadPlantaId, 10) } : null,
      variedadBandeja: formData.variedadBandejaId ? { id: parseInt(formData.variedadBandejaId, 10) } : null,
      cantidad: parseInt(formData.cantidad, 10),
      registroSemillaId: formData.tipoOrigen === 'SOBRE' && formData.registroSemillaId
        ? parseInt(formData.registroSemillaId, 10)
        : null,
      clienteId: formData.clienteId ? parseInt(formData.clienteId, 10) : null
    });
  };

  const isEditMode = !!siembra;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Content */}
      <div className="bg-paper border border-line-strong rounded-none sm:rounded-panel w-full h-full sm:h-auto max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-screen sm:max-h-[90vh]">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-soft rounded-base flex items-center justify-center text-accent-ink">
              <Sprout className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">
              {isEditMode ? 'Editar Siembra' : 'Nueva Siembra'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-faint hover:text-body hover:bg-canvas rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Reorden del modal (pedido del dueño 2026-09-05), de arriba a abajo: Origen ->
                Variedad + Dueño -> Código de Lote + Número de Siembra -> Cantidad + Tipo de
                Bandeja -> Fechas de siembra y entrega -> Observaciones. */}
            <div>
              <label className="block text-sm font-medium text-body mb-2">
                Origen de la Semilla *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipoOrigen: 'SOBRE' }))}
                  className={`flex items-center justify-center p-3 rounded-base border-2 transition-all cursor-pointer ${
                    formData.tipoOrigen === 'SOBRE'
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-body hover:bg-canvas'
                  }`}
                >
                  Sobre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, tipoOrigen: 'SUELTO', registroSemillaId: '' }));
                    setBusquedaRegistro('');
                    setShowRegistroDropdown(false);
                  }}
                  className={`flex items-center justify-center p-3 rounded-base border-2 transition-all cursor-pointer ${
                    formData.tipoOrigen === 'SUELTO'
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-body hover:bg-canvas'
                  }`}
                >
                  Suelto
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Variedad de Planta *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-faint" />
                  </div>
                  <input
                    type="text"
                    required={!formData.variedadPlantaId}
                    placeholder="Buscar variedad..."
                    value={busquedaPlanta}
                    onChange={(e) => {
                      setBusquedaPlanta(e.target.value);
                      setShowDropdown(true);
                      if (formData.variedadPlantaId) {
                        setFormData(prev => ({ ...prev, variedadPlantaId: '' }));
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => {
                      // Pequeño delay para permitir el click en la opción
                      setTimeout(() => setShowDropdown(false), 200);
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-paper border border-line-strong rounded-panel max-h-48 overflow-y-auto">
                      {plantasFiltradas.length > 0 ? (
                        plantasFiltradas.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              seleccionarPlanta(p);
                            }}
                            className="px-4 py-2 hover:bg-canvas cursor-pointer text-sm"
                          >
                            {p.nombre}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-muted">No se encontraron plantas</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Dueño *
                </label>
                <select
                  value={tipoDueno}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTipoDueno(val);
                    if (val === 'jefe') {
                      setBusquedaDueno('');
                      setFormData({ ...formData, dueno: 'Jefe / Vivero propio', clienteId: '' });
                    } else {
                      setBusquedaDueno('');
                      setFormData({ ...formData, dueno: '', clienteId: '' });
                    }
                  }}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors bg-paper mb-2"
                >
                  <option value="jefe">Jefe / Vivero propio</option>
                  <option value="cliente">Cliente</option>
                </select>

                {tipoDueno === 'cliente' && (
                  <div className="relative mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-faint" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Buscar cliente o escribir un nombre..."
                      value={busquedaDueno}
                      onChange={(e) => {
                        // Pedido del dueño 2026-09-05: mismo patrón "buscar o escribir libre" que
                        // ya usa RegistroSemilla -- si no coincide con ningún cliente real, se
                        // guarda igual como nombre libre (sólo sirve para buscar en el listado).
                        // Editar el texto después de haber elegido un cliente lo desvincula.
                        setBusquedaDueno(e.target.value);
                        setFormData({ ...formData, dueno: e.target.value, clienteId: '' });
                        setShowDuenoDropdown(true);
                      }}
                      onFocus={() => setShowDuenoDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowDuenoDropdown(false), 200);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    />
                    {showDuenoDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-paper border border-line-strong rounded-panel max-h-48 overflow-y-auto">
                        {duenosFiltrados.length > 0 ? (
                          duenosFiltrados.map(d => (
                            <div
                              key={d.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                seleccionarDueno(d);
                              }}
                              className="px-4 py-2 hover:bg-canvas cursor-pointer text-sm"
                            >
                              {d.nombre}
                            </div>
                          ))
                        ) : busquedaDueno ? (
                          <div>
                            <div className="px-4 py-2 text-sm text-muted">Sin coincidencias: se guardará como nombre libre</div>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                crearClienteRapido();
                              }}
                              disabled={creandoCliente}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent-ink hover:bg-canvas cursor-pointer border-t border-line disabled:opacity-50 disabled:cursor-wait"
                            >
                              <UserPlus className="w-4 h-4" />
                              {creandoCliente ? 'Creando...' : `Crear cliente "${busquedaDueno}"`}
                            </button>
                          </div>
                        ) : (
                          <div className="px-4 py-2 text-sm text-muted">No hay clientes</div>
                        )}
                      </div>
                    )}
                    {formData.clienteId && (
                      <p className="mt-1 text-xs text-accent-ink">Vinculado a cliente existente</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pedido del dueño 2026-09-05: cuando el origen es Suelto, este campo no aplica y
                  se deja el hueco vacío (no colapsa Número de Siembra a ancho completo). */}
              {formData.tipoOrigen === 'SOBRE' ? (
                <div>
                  <label className="block text-sm font-medium text-body mb-1">
                    Código de Lote *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-faint" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Buscar registro de semilla o tipear el código de lote..."
                      value={busquedaRegistro}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setBusquedaRegistro(valor);
                        setShowRegistroDropdown(true);
                        // Este campo reemplaza al viejo input de "Código de Lote" (pedido del
                        // dueño 2026-09-05): eran dos cajas mostrando el mismo valor una vez
                        // elegido un registro. Ahora, tipear texto libre acá (sin elegir ningún
                        // registro del desplegable) escribe directo codigoLote -- mismo patrón
                        // "buscar o escribir libre" que ya usan Cliente/Variedad.
                        setFormData(prev => ({
                          ...prev,
                          codigoLote: valor,
                          registroSemillaId: prev.registroSemillaId ? '' : prev.registroSemillaId
                        }));
                      }}
                      onFocus={() => setShowRegistroDropdown(true)}
                      onBlur={() => setTimeout(() => setShowRegistroDropdown(false), 200)}
                      className="w-full pl-9 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    />
                    {showRegistroDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-paper border border-line-strong rounded-panel max-h-48 overflow-y-auto">
                        {registrosSemillaFiltrados.length > 0 ? (
                          registrosSemillaFiltrados.map(r => (
                            <div
                              key={r.id}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                seleccionarRegistroSemilla(r);
                              }}
                              className="px-4 py-2 hover:bg-canvas cursor-pointer text-sm"
                            >
                              <span className="font-semibold">{r.lote}</span> — {r.nombreQuienTrajo}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-muted">Sin registros disponibles</div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">Elegí un registro existente (autocompleta variedad y cantidad de bandejas sugerida) o escribí el código de lote directamente.</p>
                </div>
              ) : (
                <div />
              )}
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Número de Siembra *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  required
                  value={formData.numeroSiembra}
                  onChange={(e) => setFormData({ ...formData, numeroSiembra: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Tipo de Bandeja *
                </label>
                <select
                  required
                  value={formData.variedadBandejaId}
                  onChange={handleBandejaChange}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors bg-paper"
                >
                  <option value="">Seleccionar bandeja...</option>
                  {bandejas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Cantidad Inicial (Bandejas) *
                </label>
                <div className="relative">
                  <FormattedNumberInput
                    required
                    value={formData.cantidad}
                    onChange={(val) => {
                      setCantidadTocadaManualmente(true);
                      setFormData({ ...formData, cantidad: val });
                    }}
                    className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
                {totalSemillasSugeridas != null && (
                  <p className="mt-1 text-xs text-accent-ink font-medium font-mono tabular-nums">
                    {totalSemillasSugeridas.toLocaleString('es-AR')} semillas
                  </p>
                )}
                {avisoSobranteSemillas && (
                  <p className="mt-1 text-xs text-warn-ink font-medium">
                    {avisoSobranteSemillas}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-2">
                Fecha de Siembra *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModoFechaSiembra('UN_DIA');
                    actualizarFechaSiembra({ fechaSiembraFin: formData.fechaSiembraInicio });
                  }}
                  className={`flex items-center justify-center p-3 rounded-base border-2 transition-all cursor-pointer ${
                    modoFechaSiembra === 'UN_DIA'
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-body hover:bg-canvas'
                  }`}
                >
                  Un día
                </button>
                <button
                  type="button"
                  onClick={() => setModoFechaSiembra('RANGO')}
                  className={`flex items-center justify-center p-3 rounded-base border-2 transition-all cursor-pointer ${
                    modoFechaSiembra === 'RANGO'
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-body hover:bg-canvas'
                  }`}
                >
                  Rango de días
                </button>
              </div>
            </div>

            {modoFechaSiembra === 'UN_DIA' ? (
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Fecha de Siembra *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fechaSiembraInicio}
                  onChange={(e) => actualizarFechaSiembra({
                    fechaSiembraInicio: e.target.value,
                    fechaSiembraFin: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-body mb-1">
                    Sembrado Desde *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaSiembraInicio}
                    onChange={(e) => actualizarFechaSiembra({ fechaSiembraInicio: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">
                    Sembrado Hasta *
                  </label>
                  <input
                    type="date"
                    required
                    min={formData.fechaSiembraInicio}
                    value={formData.fechaSiembraFin}
                    onChange={(e) => actualizarFechaSiembra({ fechaSiembraFin: e.target.value })}
                    className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Fecha Est. de Entrega *
              </label>
              <input
                type="date"
                required
                value={formData.fechaEstimada}
                onChange={(e) => setFormData({ ...formData, fechaEstimada: e.target.value })}
                className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-body mb-1">
                Observaciones
              </label>
              <textarea
                rows={2}
                placeholder="Ej: se usó sólo la mitad del sobre de 10kg..."
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-none"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-line">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-paper bg-accent border border-transparent rounded-base hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors cursor-pointer"
            >
              Guardar Siembra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiembraForm;
