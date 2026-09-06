import React, { useState, useEffect } from 'react';
import { X, Sprout, Search, UserPlus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import { calcularFechaRestandoDias, calcularFechaSumandoDias } from '../utils/diasCrecimiento';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';

const UNIDADES = [
  { value: 'SEMILLAS', label: 'Semillas' },
  { value: 'SOBRES', label: 'Sobres' },
  { value: 'GRAMOS', label: 'Gramos' },
];

const hoyISO = () => new Date().toISOString().split('T')[0];

const RegistroSemillaForm = ({ isOpen, registro, onSave, onCancel }) => {
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [busquedaVariedad, setBusquedaVariedad] = useState('');
  const [showVariedadDropdown, setShowVariedadDropdown] = useState(false);
  // Guard de un solo sentido (pedido del dueño 2026-09-05, mismo patrón que
  // cantidadTocadaManualmente en SiembraForm.jsx): la sugerencia de bandejas sólo depende de
  // totalSemillas y la bandeja elegida hacia acá, nunca al revés, así que no hay riesgo de loop
  // como el que obligó a sacar los guards de la sincronización de fechas más abajo.
  const [cantidadBandejasTocadaManualmente, setCantidadBandejasTocadaManualmente] = useState(false);
  // Bug real corregido (2026-09-05, reportado por el dueño): la primera versión de esta
  // sincronización usaba guards "pegajosos" (una vez tocado un campo a mano, quedaba bloqueado
  // para el resto de la sesión del formulario) -- pero al ser bidireccional, apenas el usuario
  // tocaba las DOS fechas una vez cada una (para probar cada dirección), las dos quedaban
  // bloqueadas para siempre y ningún cambio posterior recalculaba nada ("se hace el cálculo la
  // primera vez nada más"). Ahora es sincronización en vivo sin guards: cualquier cambio en una
  // de las dos fechas recalcula la otra a partir de la variedad, siempre. No hay riesgo de loop
  // porque cada handler sólo escribe el campo contrario dentro de su propio setFormData, nunca
  // llama al handler del otro campo.
  const [formData, setFormData] = useState({
    fechaRecepcion: hoyISO(),
    fechaEntrega: '',
    fechaSiembraProgramada: '',
    lote: '',
    clienteId: '',
    nombreQuienTrajo: '',
    telefonoContacto: '',
    descripcionSemilla: '',
    variedadPlantaId: '',
    cantidad: '',
    unidadCantidad: 'SEMILLAS',
    contenidoPorSobre: '',
    contenidoPorSobreUnidad: 'SEMILLAS',
    variedadBandejaId: '',
    cantidadBandejas: '',
    observaciones: '',
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      return await clientesApi.getAll();
    },
    enabled: isOpen,
  });

  const { data: variedades = [] } = useQuery({
    queryKey: ['variedades-plantas'],
    queryFn: async () => {
      const res = await variedadesPlantasApi.getAll();
      return res.data;
    },
    enabled: isOpen,
  });

  const { data: bandejas = [] } = useQuery({
    queryKey: ['variedades-bandejas'],
    queryFn: async () => {
      const res = await variedadesBandejasApi.getAll();
      return res.data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      if (registro) {
        setFormData({
          fechaRecepcion: registro.fechaRecepcion || hoyISO(),
          fechaEntrega: registro.fechaEntrega || '',
          fechaSiembraProgramada: registro.fechaSiembraProgramada || '',
          lote: registro.lote || '',
          clienteId: registro.clienteId ? registro.clienteId.toString() : '',
          nombreQuienTrajo: registro.nombreQuienTrajo || '',
          telefonoContacto: registro.telefonoContacto || '',
          descripcionSemilla: registro.descripcionSemilla || '',
          variedadPlantaId: registro.variedadPlantaId ? registro.variedadPlantaId.toString() : '',
          cantidad: registro.cantidad ?? '',
          unidadCantidad: registro.unidadCantidad || 'SEMILLAS',
          contenidoPorSobre: registro.contenidoPorSobre ?? '',
          contenidoPorSobreUnidad: registro.contenidoPorSobreUnidad || 'SEMILLAS',
          variedadBandejaId: registro.variedadBandejaId ? registro.variedadBandejaId.toString() : '',
          cantidadBandejas: registro.cantidadBandejas ?? '',
          observaciones: registro.observaciones || '',
        });
        setBusquedaCliente(registro.nombreQuienTrajo || '');
        setBusquedaVariedad(registro.descripcionSemilla || '');
      } else {
        setFormData({
          fechaRecepcion: hoyISO(),
          fechaEntrega: '',
          fechaSiembraProgramada: '',
          lote: '',
          clienteId: '',
          nombreQuienTrajo: '',
          telefonoContacto: '',
          descripcionSemilla: '',
          variedadPlantaId: '',
          cantidad: '',
          unidadCantidad: 'SEMILLAS',
          contenidoPorSobre: '',
          contenidoPorSobreUnidad: 'SEMILLAS',
          variedadBandejaId: '',
          cantidadBandejas: '',
          observaciones: '',
        });
        setBusquedaCliente('');
        setBusquedaVariedad('');
      }
      setShowClienteDropdown(false);
      setShowVariedadDropdown(false);
      // Al editar un registro que ya tenía cantidadBandejas cargado, se trata como "ya tocado"
      // -- si no, el efecto de sugerencia lo pisaría apenas se abre el modal.
      setCantidadBandejasTocadaManualmente(!!registro?.cantidadBandejas);
    }
  }, [isOpen, registro]);

  const clientesFiltrados = busquedaCliente
    ? clientes.filter((c) => (c.nombreRazonSocial || '').toLowerCase().includes(busquedaCliente.toLowerCase()))
    : clientes;

  const seleccionarCliente = (cliente) => {
    setBusquedaCliente(cliente.nombreRazonSocial);
    setFormData((prev) => ({
      ...prev,
      clienteId: cliente.id.toString(),
      nombreQuienTrajo: cliente.nombreRazonSocial,
      telefonoContacto: cliente.telefono || '',
    }));
    setShowClienteDropdown(false);
  };

  // Crear cliente al vuelo desde este mismo buscador (pedido del dueño 2026-09-05): antes,
  // sin coincidencia, la única opción era guardar como nombre libre -- acá el nombre libre nunca
  // se volvía un Cliente real, aunque el usuario supiera que iba a volver a tratar con esa
  // persona. El modelo de Cliente en este sistema es literalmente sólo nombre + teléfono (sin
  // CUIT, email ni dirección), así que crearlo acá es el formulario completo, no una versión
  // resumida. invalidateQueries refresca la lista para que aparezca en futuras búsquedas.
  const crearClienteRapido = async () => {
    const nombre = busquedaCliente.trim();
    if (!nombre || creandoCliente) return;
    setCreandoCliente(true);
    try {
      const nuevo = await clientesApi.create({ nombreRazonSocial: nombre, telefono: formData.telefonoContacto || '' });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      seleccionarCliente(nuevo);
      pushToast('success', `Cliente "${nuevo.nombreRazonSocial}" creado.`);
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo crear el cliente.'));
    } finally {
      setCreandoCliente(false);
    }
  };

  const handleBusquedaClienteChange = (valor) => {
    setBusquedaCliente(valor);
    setShowClienteDropdown(true);
    // Si el usuario edita el texto después de haber elegido un cliente existente, se desvincula
    // (Decisión 2: el nombre libre siempre queda disponible como alternativa sin fricción).
    setFormData((prev) => ({
      ...prev,
      clienteId: '',
      nombreQuienTrajo: valor,
    }));
  };

  const variedadesFiltradas = busquedaVariedad
    ? variedades.filter((v) => v.nombre.toLowerCase().includes(busquedaVariedad.toLowerCase()))
    : variedades;

  const seleccionarVariedad = (variedad) => {
    setBusquedaVariedad(variedad.nombre);
    setFormData((prev) => {
      const next = {
        ...prev,
        variedadPlantaId: variedad.id.toString(),
        descripcionSemilla: variedad.nombre,
      };
      // Si ya hay alguna de las dos fechas cargada, aprovecha para sugerir la otra ahora que se
      // conoce la variedad (pedido del dueño 2026-09-05, simétrico en ambas direcciones).
      if (prev.fechaEntrega) {
        const calculada = calcularFechaRestandoDias(variedad, prev.fechaEntrega);
        if (calculada) next.fechaSiembraProgramada = calculada;
      } else if (prev.fechaSiembraProgramada) {
        const calculada = calcularFechaSumandoDias(variedad, prev.fechaSiembraProgramada);
        if (calculada) next.fechaEntrega = calculada;
      }
      return next;
    });
    setShowVariedadDropdown(false);
  };

  // Mismo patrón exacto que handleBusquedaClienteChange (pedido del dueño 2026-09-04): "buscar
  // o escribir libre" -- si el usuario edita el texto después de elegir una variedad del
  // catálogo, se desvincula y queda como nombre libre.
  const handleBusquedaVariedadChange = (valor) => {
    setBusquedaVariedad(valor);
    setShowVariedadDropdown(true);
    setFormData((prev) => ({
      ...prev,
      variedadPlantaId: '',
      descripcionSemilla: valor,
    }));
  };

  // Fecha de siembra estimada = fecha de entrega pedida por el cliente - días de crecimiento
  // de la variedad elegida (pedido del dueño 2026-09-05): con esto, el dueño sólo tiene que
  // elegir la variedad y preguntarle al cliente cuándo la viene a buscar. Sólo funciona cuando
  // hay una variedad real del catálogo vinculada (con nombre libre no hay días de crecimiento
  // de dónde sacar el cálculo) -- en ese caso queda para completar a mano, como hoy.
  const handleFechaEntregaChange = (valor) => {
    setFormData((prev) => {
      const next = { ...prev, fechaEntrega: valor };
      if (prev.variedadPlantaId) {
        const variedad = variedades.find((v) => v.id.toString() === prev.variedadPlantaId);
        const calculada = calcularFechaRestandoDias(variedad, valor);
        if (calculada) next.fechaSiembraProgramada = calculada;
      }
      return next;
    });
  };

  // Dirección inversa (pedido del dueño 2026-09-05: "asi como pasa viceversa"): fecha de
  // entrega sugerida = fecha de siembra elegida + días de crecimiento de la variedad.
  const handleFechaSiembraChange = (valor) => {
    setFormData((prev) => {
      const next = { ...prev, fechaSiembraProgramada: valor };
      if (prev.variedadPlantaId) {
        const variedad = variedades.find((v) => v.id.toString() === prev.variedadPlantaId);
        const calculada = calcularFechaSumandoDias(variedad, valor);
        if (calculada) next.fechaEntrega = calculada;
      }
      return next;
    });
  };

  // Vista previa en vivo del total en semillas (pedido del dueño 2026-09-05): mismo cálculo que
  // después hace el backend (RegistroSemillaServiceImpl), pero acá para mostrarlo mientras se
  // completa el formulario, antes de guardar. Cubre GRAMOS directo y SOBRES con contenido en
  // gramos -- ambos necesitan VariedadPlanta.semillasPorGramo, que no siempre está cargado; en
  // ese caso se avisa por qué no hay total en vez de mostrar nada sin explicación.
  //
  // Movido antes del `if (!isOpen) return null` de más abajo (a diferencia de cómo vivía antes)
  // porque ahora también alimenta el useEffect de sugerencia de bandejas: un hook nunca puede
  // quedar después de un return condicional (Rules of Hooks), así que todo lo que ese efecto
  // necesita tiene que calcularse antes.
  const variedadSeleccionada = formData.variedadPlantaId
    ? variedades.find((v) => v.id.toString() === formData.variedadPlantaId)
    : null;

  let totalSemillasPreview = null;
  let avisoSemillasPorGramo = null;

  const necesitaSemillasPorGramo =
    formData.unidadCantidad === 'GRAMOS' ||
    (formData.unidadCantidad === 'SOBRES' && formData.contenidoPorSobreUnidad === 'GRAMOS');

  if (necesitaSemillasPorGramo && formData.cantidad !== ''
      && (formData.unidadCantidad === 'GRAMOS' || formData.contenidoPorSobre !== '')) {
    if (variedadSeleccionada?.semillasPorGramo != null) {
      const base = formData.unidadCantidad === 'GRAMOS'
        ? Number(formData.cantidad)
        : Number(formData.cantidad) * Number(formData.contenidoPorSobre);
      totalSemillasPreview = base * Number(variedadSeleccionada.semillasPorGramo);
    } else if (formData.variedadPlantaId) {
      avisoSemillasPorGramo = 'Esta variedad no tiene "semillas por gramo" cargado en su ficha (Configuración → Variedades de Plantas) -- no se puede calcular el total.';
    } else {
      avisoSemillasPorGramo = 'Vinculá una variedad del catálogo para calcular el total de semillas.';
    }
  } else if (formData.unidadCantidad === 'SOBRES' && formData.contenidoPorSobreUnidad !== 'GRAMOS'
      && formData.cantidad !== '' && formData.contenidoPorSobre !== '') {
    totalSemillasPreview = Number(formData.cantidad) * Number(formData.contenidoPorSobre);
  } else if (formData.unidadCantidad === 'SEMILLAS' && formData.cantidad !== '') {
    // Bug real corregido (2026-09-05, reportado por el dueño: "al seleccionar el tipo de
    // bandejas que se autocomplete la cantidad" no pasaba nada con SEMILLAS): faltaba esta rama
    // -- con unidad SEMILLAS, `cantidad` YA es el total, no hace falta ninguna conversión, pero
    // sin ponerlo acá totalSemillasPreview quedaba null para siempre en el caso más común, y la
    // sugerencia de bandejas (que depende de este valor) nunca se disparaba.
    totalSemillasPreview = Number(formData.cantidad);
  }

  // Sugerencia de cantidad de bandejas (pedido del dueño 2026-09-05): totalSemillas ÷ celdas de
  // la bandeja elegida, redondeado hacia abajo -- mismo cálculo que ya usa Siembra
  // (calcularBandejasSugeridas en SiembraForm.jsx), sólo editable, nunca una validación.
  const bandejaSeleccionada = formData.variedadBandejaId
    ? bandejas.find((b) => b.id.toString() === formData.variedadBandejaId)
    : null;

  useEffect(() => {
    if (cantidadBandejasTocadaManualmente) return;
    if (totalSemillasPreview != null && bandejaSeleccionada?.cantidadCeldas) {
      const sugerida = Math.floor(totalSemillasPreview / bandejaSeleccionada.cantidadCeldas);
      setFormData((prev) => ({ ...prev, cantidadBandejas: sugerida.toString() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSemillasPreview, bandejaSeleccionada, cantidadBandejasTocadaManualmente]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      fechaEntrega: formData.fechaEntrega || null,
      fechaSiembraProgramada: formData.fechaSiembraProgramada || null,
      clienteId: formData.clienteId ? parseInt(formData.clienteId, 10) : null,
      variedadPlantaId: formData.variedadPlantaId ? parseInt(formData.variedadPlantaId, 10) : null,
      cantidad: formData.cantidad === '' ? null : Number(formData.cantidad),
      contenidoPorSobre: formData.unidadCantidad !== 'SOBRES' || formData.contenidoPorSobre === ''
        ? null
        : parseInt(formData.contenidoPorSobre, 10),
      contenidoPorSobreUnidad: formData.unidadCantidad !== 'SOBRES' ? null : formData.contenidoPorSobreUnidad,
      variedadBandejaId: formData.variedadBandejaId ? parseInt(formData.variedadBandejaId, 10) : null,
      cantidadBandejas: formData.cantidadBandejas === '' ? null : parseInt(formData.cantidadBandejas, 10),
    });
  };

  // Aviso de semillas sobrantes (pedido del dueño 2026-09-05: "si hay 500 semillas y yo escogí
  // bandeja de 400 que me indique que sobran 100"): mismo cálculo y mismo criterio que ya usa
  // Siembra (SiembraForm.jsx) -- la sugerencia de bandejas redondea hacia abajo, así que con la
  // cantidad de bandejas actual (sugerida o editada a mano) puede sobrar semilla sin asignar.
  const semillasUsadasConCantidadActual = formData.cantidadBandejas && bandejaSeleccionada
    ? Math.round(parseFloat(formData.cantidadBandejas) * (bandejaSeleccionada.cantidadCeldas || 0))
    : null;

  let avisoSobranteSemillas = null;
  if (totalSemillasPreview != null && semillasUsadasConCantidadActual != null
      && semillasUsadasConCantidadActual < totalSemillasPreview) {
    const sobrante = totalSemillasPreview - semillasUsadasConCantidadActual;
    avisoSobranteSemillas = `+${Math.round(sobrante).toLocaleString('es-AR')}`;
  }

  const isEditMode = !!registro;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-ink/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      <div className="bg-paper border border-line-strong rounded-none sm:rounded-panel w-full h-full sm:h-auto max-w-lg overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-screen sm:max-h-[90vh]">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-soft rounded-base flex items-center justify-center text-accent-ink">
              <Sprout className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-ink">
              {isEditMode ? 'Editar Registro de Semilla' : 'Nuevo Registro de Semilla'}
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
                  required
                  placeholder="Buscar variedad o escribir un nombre..."
                  value={busquedaVariedad}
                  onChange={(e) => handleBusquedaVariedadChange(e.target.value)}
                  onFocus={() => setShowVariedadDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowVariedadDropdown(false), 200);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
                {showVariedadDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-paper border border-line-strong rounded-panel max-h-48 overflow-y-auto">
                    {variedadesFiltradas.length > 0 ? (
                      variedadesFiltradas.map((v) => (
                        <div
                          key={v.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            seleccionarVariedad(v);
                          }}
                          className="px-4 py-2 hover:bg-canvas cursor-pointer text-sm"
                        >
                          {v.nombre}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-muted">
                        {busquedaVariedad ? 'Sin coincidencias: se guardará como nombre libre' : 'No hay variedades cargadas'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formData.variedadPlantaId && (
                <p className="mt-1 text-xs text-accent-ink">Vinculado a variedad del catálogo</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Fecha de Siembra Programada
                </label>
                <input
                  type="date"
                  value={formData.fechaSiembraProgramada}
                  onChange={(e) => handleFechaSiembraChange(e.target.value)}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
                <p className="mt-1 text-xs text-muted">
                  {formData.variedadPlantaId
                    ? 'Se completa sola con la variedad y cualquiera de las dos fechas (editable).'
                    : 'Opcional. Se completa sola si cargás variedad y fecha de entrega.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Fecha de Entrega
                </label>
                <input
                  type="date"
                  value={formData.fechaEntrega}
                  onChange={(e) => handleFechaEntregaChange(e.target.value)}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
                <p className="mt-1 text-xs text-muted">Cuándo el cliente pasa a buscar la planta lista. Con la variedad elegida, se completa junto con la fecha de siembra (cualquiera de las dos calcula la otra).</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-body mb-1">
                  Lote *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PL154303, 043, 18KR..."
                  value={formData.lote}
                  onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Quién trajo la semilla *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-faint" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Buscar cliente o escribir un nombre..."
                  value={busquedaCliente}
                  onChange={(e) => handleBusquedaClienteChange(e.target.value)}
                  onFocus={() => setShowClienteDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowClienteDropdown(false), 200);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
                {showClienteDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-paper border border-line-strong rounded-panel max-h-48 overflow-y-auto">
                    {clientesFiltrados.length > 0 ? (
                      clientesFiltrados.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            seleccionarCliente(c);
                          }}
                          className="px-4 py-2 hover:bg-canvas cursor-pointer text-sm"
                        >
                          {c.nombreRazonSocial}
                        </div>
                      ))
                    ) : busquedaCliente ? (
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
                          {creandoCliente ? 'Creando...' : `Crear cliente "${busquedaCliente}"`}
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-2 text-sm text-muted">No hay clientes</div>
                    )}
                  </div>
                )}
              </div>
              {formData.clienteId && (
                <p className="mt-1 text-xs text-accent-ink">Vinculado a cliente existente</p>
              )}
            </div>

            {/* Siempre visible (antes se ocultaba con formData.clienteId, escondiendo el
                teléfono recién autocompletado al elegir un cliente en seleccionarCliente).
                Sigue editable aunque venga autocompletado, por si el teléfono del cliente
                está desactualizado para esta entrega puntual. */}
            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Teléfono de contacto
              </label>
              <input
                type="tel"
                inputMode="tel"
                placeholder="Opcional"
                value={formData.telefonoContacto}
                onChange={(e) => {
                  // Bug real corregido (2026-09-05, reportado por el dueño): type="tel" es sólo
                  // semántico (teclado numérico en mobile), el navegador no bloquea letras. Ahora
                  // que este campo se usa para crear un Cliente real (ver crearClienteRapido),
                  // filtramos a mano lo que no sea dígito o separador típico de teléfono.
                  const filtrado = e.target.value.replace(/[^\d+\-() ]/g, '');
                  setFormData({ ...formData, telefonoContacto: filtrado });
                }}
                className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1 whitespace-nowrap">
                  {/* Pedido del dueño 2026-09-05: la etiqueta sigue la unidad elegida (Cantidad
                      de Sobres / de Semillas / de Gramos) en vez de quedar genérica siempre --
                      más claro qué se está cargando en cada caso, no sólo con SOBRES. */}
                  {/* whitespace-nowrap (bug real, 2026-09-05, reportado por el dueño): la
                      etiqueta se cortaba en 2 líneas dentro de la columna angosta del grid de 3.
                      El espacio no separable antes del "*" ya evitaba que quedara huérfano solo,
                      pero el resto de la frase todavía podía cortarse antes. */}
                  Cantidad de {(UNIDADES.find((u) => u.value === formData.unidadCantidad)?.label || '').toLowerCase()}{' *'}
                </label>
                <FormattedNumberInput
                  required
                  value={formData.cantidad}
                  onChange={(val) => setFormData({ ...formData, cantidad: val })}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Unidad *
                </label>
                <select
                  required
                  value={formData.unidadCantidad}
                  onChange={(e) => setFormData({ ...formData, unidadCantidad: e.target.value })}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors bg-paper"
                >
                  {UNIDADES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              {formData.unidadCantidad === 'SOBRES' && (
                <div>
                  <label className="block text-sm font-medium text-body mb-1">
                    Contenido x Sobre
                  </label>
                  {/* Bug real corregido (2026-09-05, reportado por el dueño): input y select
                      lado a lado no entraban en esta columna (1 de 3 en la grilla) sin achicar
                      demasiado el input -- apilados, el input usa todo el ancho disponible. */}
                  <FormattedNumberInput
                    value={formData.contenidoPorSobre}
                    onChange={(val) => setFormData({ ...formData, contenidoPorSobre: val })}
                    placeholder={formData.contenidoPorSobreUnidad === 'GRAMOS' ? 'Ej: 10' : 'Ej: 1000'}
                    className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                  {/* Pedido del dueño 2026-09-05: la hoja de papel real anota tanto "1 sobre
                      10.000 semillas c/u" como "3 sobres 10gr c/u" -- el sobre a veces se
                      define por conteo, a veces por peso. */}
                  <select
                    value={formData.contenidoPorSobreUnidad}
                    onChange={(e) => setFormData({ ...formData, contenidoPorSobreUnidad: e.target.value })}
                    className="w-full mt-2 px-2 py-1.5 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors bg-paper text-sm"
                  >
                    <option value="SEMILLAS">semillas</option>
                    <option value="GRAMOS">gramos</option>
                  </select>
                </div>
              )}
            </div>

            {/* No se muestra con unidad SEMILLAS (bug corregido junto con el de arriba): ahí
                totalSemillasPreview es literalmente el mismo número que ya se ve en el campo
                "Cantidad de semillas", mostrarlo de nuevo acá abajo es ruido, no información
                nueva -- a diferencia de SOBRES/GRAMOS, donde sí es una conversión real. */}
            {formData.unidadCantidad !== 'SEMILLAS' && (totalSemillasPreview != null || avisoSemillasPorGramo) && (
              <p className={`text-xs -mt-2 ${avisoSemillasPorGramo ? 'text-warn-ink' : 'text-accent-ink'}`}>
                {totalSemillasPreview != null
                  ? `= ${Math.round(totalSemillasPreview).toLocaleString('es-AR')} semillas`
                  : avisoSemillasPorGramo}
              </p>
            )}

            {/* Bandejas estimadas (pedido del dueño 2026-09-05): planificación al recibir la
                semilla, no una siembra real todavía -- por eso vive acá y no obliga a nada.
                Ambos campos opcionales; cantidadBandejas se autocompleta con totalSemillas ÷
                celdas de la bandeja elegida (useEffect de arriba), pero siempre editable. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">
                  Tipo de Bandeja
                </label>
                <select
                  value={formData.variedadBandejaId}
                  onChange={(e) => {
                    // Recalcula al toque, en el mismo cambio de bandeja (pedido del dueño
                    // 2026-09-05: "si cambio a bandejas de 280 que también recalcule la
                    // cantidad") -- no depende sólo del useEffect de arriba (que igual sigue
                    // sirviendo para cuando cambia la cantidad de semillas con la bandeja ya
                    // elegida), sino que también lo hace directo acá, mismo patrón ya probado en
                    // handleBandejaChange de SiembraForm.jsx.
                    //
                    // Bug real corregido (2026-09-05, reportado por el dueño: al EDITAR una
                    // ficha que ya traía cantidadBandejas guardado, cambiar de bandeja no
                    // recalculaba nada): el guard arrancaba en `true` para no pisar ese valor
                    // apenas se abre el modal (ver reset effect más arriba), pero eso también
                    // bloqueaba el recálculo cuando el usuario, ya adentro, elige otra bandeja a
                    // propósito -- justo la acción que SÍ tiene que recalcular, porque una
                    // cantidad pensada para bandejas de 400 no significa nada con bandejas de
                    // 280. Elegir una bandeja nueva siempre recalcula, ignora el guard, y lo
                    // vuelve a poner en `false` (la cantidad vuelve a ser "sugerida", no "tocada
                    // a mano") -- el guard sigue protegiendo sólo contra que ESCRIBIR la cantidad
                    // de semillas pise un número que el usuario tipeó a mano en este campo.
                    const id = e.target.value;
                    const nuevaBandeja = bandejas.find((b) => b.id.toString() === id);
                    if (totalSemillasPreview != null && nuevaBandeja?.cantidadCeldas) {
                      setCantidadBandejasTocadaManualmente(false);
                    }
                    setFormData((prev) => {
                      const next = { ...prev, variedadBandejaId: id };
                      if (totalSemillasPreview != null && nuevaBandeja?.cantidadCeldas) {
                        next.cantidadBandejas = Math.floor(totalSemillasPreview / nuevaBandeja.cantidadCeldas).toString();
                      }
                      return next;
                    });
                  }}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors bg-paper"
                >
                  <option value="">Sin especificar</option>
                  {bandejas.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1 flex items-center justify-between gap-2">
                  Cantidad de Bandejas
                  {/* Pedido del dueño 2026-09-05: "con un simple +100" -- semilla sobrante sin
                      asignar con la cantidad de bandejas actual, al lado del campo en vez de una
                      oración aparte abajo. */}
                  {avisoSobranteSemillas && (
                    <span className="text-warn-ink font-mono tabular-nums font-normal">{avisoSobranteSemillas}</span>
                  )}
                </label>
                <FormattedNumberInput
                  value={formData.cantidadBandejas}
                  onChange={(val) => {
                    setCantidadBandejasTocadaManualmente(true);
                    setFormData({ ...formData, cantidadBandejas: val });
                  }}
                  placeholder="Ej: 25"
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">
                Observaciones
              </label>
              <textarea
                rows={2}
                placeholder="Ej: 10gr c/u, $12.500 c/6..."
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
              Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistroSemillaForm;
