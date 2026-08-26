import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, DollarSign, PackageSearch, AlertTriangle } from 'lucide-react';
import FormattedNumberInput from '../components/FormattedNumberInput';
import { proveedoresApi } from '../api/proveedores.api';
import { productosApi } from '../api/productos.api';
import { pedidosApi } from '../api/pedidos.api';
import { negociosApi } from '../api/negocios.api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errorMessage';
import { resolverEfectivo } from '../utils/costeo';
import { costoFinalDeLinea } from '../utils/pedidoCosteo';
import FilaItemPedido from '../components/pedidos/FilaItemPedido';

// Plantilla de columnas de la grilla de ítems (change pedido-planilla-editable, grupo 3 —
// Decisión 2 de design.md): se define UNA SOLA VEZ, a nivel de módulo, y la comparten la fila de
// encabezados y todas las filas de ítem (`FilaItemPedido`, variant="grid") — así nunca pueden
// desalinearse entre sí. Orden: producto · cant · [USD] · costo unit. · descuentos · IVA% ·
// envío% · total · quitar. La columna USD sólo existe si el proveedor elegido maneja dólares
// (Decisión 2: es una decisión de PROVEEDOR, nunca por fila — la plantilla entera cambia, no una
// celda suelta).
const GRID_COLS = 'grid-cols-[minmax(200px,2.2fr)_84px_110px_minmax(170px,1.1fr)_76px_76px_120px_40px]';
const GRID_COLS_USD = 'grid-cols-[minmax(200px,2.2fr)_84px_56px_110px_minmax(170px,1.1fr)_76px_76px_120px_40px]';

const generarIdLinea = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `linea-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

const BORRADOR_KEY = 'pedido-nuevo-borrador';

// Persistencia del borrador en localStorage (pedido puntual del usuario, 2026-08-25): el pedido que
// se está armando no debe perderse si el usuario recarga la página (F5) o navega a otra sección y
// vuelve. Se guarda SOLO el estado que compone al pedido en sí (proveedor, ítems, cotización,
// observaciones) — nunca estado transitorio de UI (combobox de búsqueda abierto, texto a medio
// tipear en el sub-formulario de "crear producto nuevo", errores de validación, isSubmitting), que
// no tiene sentido que sobreviva a un F5. Todo acceso a localStorage va envuelto en try/catch: en
// modo incógnito estricto o con la cuota llena puede tirar — el borrador es una comodidad, nunca
// debe romper la página si falla.
const cargarBorrador = () => {
  try {
    const raw = localStorage.getItem(BORRADOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const guardarBorrador = (borrador) => {
  try {
    localStorage.setItem(BORRADOR_KEY, JSON.stringify(borrador));
  } catch {
    // Silencioso a propósito: el borrador es una comodidad, no una garantía.
  }
};

const limpiarBorrador = () => {
  try {
    localStorage.removeItem(BORRADOR_KEY);
  } catch {
    // Silencioso a propósito, mismo criterio que guardarBorrador.
  }
};

// Colapsa una lista de descuentos ({porcentaje, ...}) en un único porcentaje efectivo (cascada:
// producto de factores, mismo criterio que CostoCalculator/costeo.js). Se usa en DOS momentos
// distintos (pedido puntual 2026-08-21, reemplaza la vieja precarga colapsada de un solo campo):
// nunca para precargar la UI (ahí se muestra la lista completa, con nombre, sin colapsar) — sólo
// para armar el payload al enviar (`descuentoPactadoPorcentaje`, el único campo que el backend
// necesita) y, opcionalmente, para el cálculo en vivo si hiciera falta un único número.
const descuentoColapsado = (descuentos) => {
  if (!descuentos || descuentos.length === 0) return '';
  let factor = 1;
  let huboAlguno = false;
  descuentos.forEach((d) => {
    const p = parseFloat(d.porcentaje);
    if (!Number.isNaN(p)) {
      factor *= (1 - p / 100);
      huboAlguno = true;
    }
  });
  if (!huboAlguno) return '';
  const efectivo = (1 - factor) * 100;
  return efectivo.toFixed(2);
};

// Arma el texto de desglose ("Nombre1 X.XX%; Nombre2 Y.YY%") de una lista de descuentos
// pactados, mismo formato exacto que ya arma `aplicarDesglose` en MovimientoStockServiceImpl.java
// para producto_descuentos — así el texto que el usuario ve acá es consistente con el que
// terminaría viendo más adelante en el movimiento de stock. Filas sin nombre o con porcentaje no
// numérico se ignoran (no deberían llegar acá: `validate()` ya las bloquea antes de armar el
// payload). Lista vacía => null (no hay nada que desglosar).
const descuentoDetalleTexto = (descuentos) => {
  if (!descuentos || descuentos.length === 0) return null;
  const partes = descuentos
    .filter((d) => d.nombre && d.nombre.trim() && d.porcentaje !== '' && d.porcentaje !== null && !Number.isNaN(parseFloat(d.porcentaje)))
    .map((d) => `${d.nombre.trim()} ${parseFloat(d.porcentaje).toFixed(2)}%`);
  return partes.length > 0 ? partes.join('; ') : null;
};

// Defaults de costeo pactado de una línea nueva, sugeridos desde el perfil del proveedor (grupo
// 8, tarea 8.5): copia visible y editable, nunca un valor que gobierne en vivo (OQ3, mismo
// criterio que ProductoForm.jsx). Con IVA incluido se sugiere '0' explícito — no vacío — para
// que, si el usuario no toca el campo, el producto que nazca de esta línea (tarea 8.2) quede en
// 0% y no herede el 21% de la unidad de negocio.
//
// Descuentos pactados (arreglo 2026-08-21, reemplaza el colapso a un único número sin nombre):
// se precarga la lista COMPLETA del proveedor (proveedor.descuentosPorDefecto ya viene como
// [{nombre, porcentaje}] desde el backend) tal cual — con nombre, sin colapsar — para que el
// usuario la vea, la edite y pueda agregar un descuento adicional específico de esta compra
// (ej. "Volumen" puntual) sin perder el desglose. El colapso a un solo % sólo ocurre al armar el
// payload (ver descuentoColapsado / handleSubmit).
const defaultsCosteoDesdeProveedor = (proveedor) => {
  if (!proveedor) {
    return { ivaPactadoPorcentaje: '', envioPactadoPorcentaje: '', descuentosPactados: [] };
  }
  return {
    ivaPactadoPorcentaje: proveedor.ivaIncluidoEnPrecio
      ? '0'
      : (proveedor.ivaPorDefectoPorcentaje !== null && proveedor.ivaPorDefectoPorcentaje !== undefined
          ? String(proveedor.ivaPorDefectoPorcentaje) : ''),
    envioPactadoPorcentaje: proveedor.costoEnvioPorDefectoPorcentaje !== null && proveedor.costoEnvioPorDefectoPorcentaje !== undefined
      ? String(proveedor.costoEnvioPorDefectoPorcentaje) : '',
    descuentosPactados: (proveedor.descuentosPorDefecto || []).map((d) => ({
      nombre: d.nombre || '',
      porcentaje: d.porcentaje ?? '',
    })),
  };
};

const lineaVacia = (defaultsCosteo = {}) => ({
  lineaId: generarIdLinea(),
  productoId: '',
  productoNombre: '',
  // Línea "pendiente de crear" (grupo 13 de tasks.md, reemplaza la Decisión 3 original): este
  // campo viaja al backend en vez de productoId cuando el producto todavía no existe en el
  // catálogo. El Producto real recién nace al confirmar la recepción. Ya NO se pide precio de
  // venta acá (Decisión de la sesión del 2026-08-20): el producto nace con precio = costo
  // pactado (margen 0%) y el usuario carga el % de ganancia después, en Productos.
  productoNombreNuevo: '',
  cantidadPedida: '',
  costoUnitarioPactado: '',
  // Moneda pactada de ESTA línea (config-costeo-por-proveedor, grupo 7 de tasks.md): 'ARS' u
  // 'USD'. Sólo puede pasar a 'USD' si el proveedor elegido maneja dólares (tarea 7.1) — el
  // checkbox correspondiente sólo se renderiza en ese caso.
  monedaLinea: 'ARS',
  // Costeo pactado de la línea, sugerido desde el perfil del proveedor y editable línea por
  // línea (grupo 8, Decisión 8 de design.md): sólo gobierna de verdad cuando la línea es
  // "pendiente de crear" — para un producto ya existente, su propia configuración (ProductoForm)
  // sigue mandando.
  ivaPactadoPorcentaje: defaultsCosteo.ivaPactadoPorcentaje ?? '',
  envioPactadoPorcentaje: defaultsCosteo.envioPactadoPorcentaje ?? '',
  // Lista de descuentos pactados con nombre (arreglo 2026-08-21, reemplaza el único campo
  // `descuentoPactadoPorcentaje` string): mismo patrón que `descuentos` en ProductoForm.jsx. Se
  // colapsa a un único % (+ detalle textual) recién al armar el payload en handleSubmit.
  descuentosPactados: defaultsCosteo.descuentosPactados ?? [],
});

// Antigüedad legible del prellenado de cotización (tarea 7.2, OQ2): "nunca se muestra sin
// fecha" — si no hay fecha, no hay prellenado que mostrar.
const formatAntiguedad = (fechaIso) => {
  if (!fechaIso) return null;
  const dias = Math.floor((Date.now() - new Date(fechaIso).getTime()) / (1000 * 60 * 60 * 24));
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'hace 1 día';
  return `hace ${dias} días`;
};

// Página de alta de pedido a proveedor (rediseño 2026-08-20, reemplaza el modal PedidoForm):
// proveedor, ítems (producto existente o creado en el momento con stock 0 — Decisión 3), cantidad
// y costo unitario pactado por ítem, con total en vivo. Extendido por config-costeo-por-proveedor
// (grupos 7/8 de tasks.md) con moneda por línea, cotización del pedido y precarga del perfil de
// costeo del proveedor.
//
// Rediseño a grilla tipo planilla (change pedido-planilla-editable, grupo 2-3, design.md
// Decisiones 2/3/8): `ProductoSearchSelect` (grupo 12) y `TablaCosteoProductoExistente` (reapertura
// puntual de la Decisión 6, 2026-08-25) vivían acá adentro. `ProductoSearchSelect` se extrajo tal
// cual a `components/pedidos/ProductoSearchSelect.jsx` (tarea 2.2, misma API). El bloque de ítems
// se reescribió como grilla CSS Grid (`FilaItemPedido` en `components/pedidos/`, tarea 3.4);
// `TablaCosteoProductoExistente` se eliminó (tarea 3.13): sus cuatro columnas (Costo unit. · IVA %
// · Envío % · Costo final) son ahora columnas de la grilla principal, con el mismo cálculo único
// (`costoFinalDeLinea`/`desgloseDeLinea` de utils/pedidoCosteo.js) y el mismo aviso de auto-ratchet
// conservado dentro de `FilaItemPedido`.

const PedidoNuevo = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();

  // Restauración del borrador (ver cargarBorrador arriba): si hay un borrador guardado en
  // localStorage, arranca desde ahí en vez de vacío. Los inicializadores son funciones (lazy
  // initial state) para que cargarBorrador() sólo corra una vez, en el primer render.
  const [proveedorId, setProveedorId] = useState(() => cargarBorrador()?.proveedorId ?? '');
  const [observaciones, setObservaciones] = useState(() => cargarBorrador()?.observaciones ?? '');
  // Gate de proveedor obligatorio (change pedido-planilla-editable, grupo 5 — Decisión 7 de
  // design.md): el estado inicial de `items` ya NO es `[lineaVacia()]` — arranca vacío cuando no
  // hay proveedor (caso normal, entrada limpia). La primera fila se crea recién al elegir
  // proveedor (ver el useEffect de precarga de defaults, más abajo). Único caso donde `items`
  // arranca con contenido sin haber elegido proveedor todavía: un borrador viejo restaurado que
  // se guardó ANTES de este gate — esos ítems NUNCA se descartan (Decisión 7), se muestran
  // deshabilitados hasta que el usuario elija proveedor.
  const [items, setItems] = useState(() => {
    const borrador = cargarBorrador();
    return Array.isArray(borrador?.items) && borrador.items.length > 0 ? borrador.items : [];
  });
  // Cotización del dólar de ESTE pedido (grupo 7, tarea 7.2 — OQ2). SIEMPRE se pide de nuevo:
  // nace vacía al entrar a la página y sólo se sugiere un prellenado editable cuando aparece la
  // primera línea en USD — nunca se aplica sola. Excepción: si había un borrador con una
  // cotización ya cargada por el propio usuario en esta sesión de armado, esa sí se restaura (no
  // es el prellenado automático — es lo que el usuario ya había tipeado antes del F5).
  const [cotizacionDolar, setCotizacionDolar] = useState(() => cargarBorrador()?.cotizacionDolar ?? '');
  const [cotizacionTocada, setCotizacionTocada] = useState(() => cargarBorrador()?.cotizacionTocada ?? false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Evita que el useEffect de reset-por-cambio-de-proveedor (más abajo) pise el borrador recién
  // restaurado: ese efecto corre también en el primer render (dispara con [proveedorId] apenas se
  // monta), y sin este guard reemplazaría los ivaPactadoPorcentaje/envioPactadoPorcentaje/
  // descuentosPactados/cotizacionDolar ya restaurados por los defaults "en blanco" del proveedor.
  //
  // Bug encontrado y corregido en el grupo 6 de este change (tarea 6.1, verificación de F5): la
  // guarda ORIGINAL era un booleano consumido una sola vez (`useRef(true)` + "si true, poner en
  // false y salir"). Bajo `React.StrictMode` (activo en `main.jsx`), React invoca cada efecto de
  // montaje DOS veces en desarrollo para detectar código no idempotente — el `.current` del ref
  // sobrevive esa doble invocación (es el mismo fiber, no un remount real), así que la PRIMERA
  // invocación consumía la guarda (true→false) y la SEGUNDA (inmediata, antes de que
  // `['proveedores']` siquiera resolviera) pasaba de largo y ejecutaba el reset de verdad —
  // pisando el borrador recién restaurado con los defaults de `proveedorSeleccionado` (que en ese
  // instante todavía era `null`, por eso el borrador quedaba con IVA/envío/descuentos en blanco
  // después de cada F5, reproducido con Playwright contra el dev stack real). La guarda nueva
  // compara el `proveedorId` ANTERIOR contra el actual (inicializada con el valor del primer
  // render, restaurado o no) en vez de un flag que se consume para siempre: ambas invocaciones de
  // StrictMode ven el mismo `proveedorId` sin cambios reales y saltean por igual — inmune a
  // cuántas veces React decida invocar el efecto de montaje.
  const proveedorIdAnteriorRef = useRef(proveedorId);

  // Sub-formulario de "producto pendiente de crear" (grupo 13 de tasks.md), abierto para una
  // línea puntual. Ya NO llama a la API: sólo captura el nombre y lo guarda en la línea local —
  // el Producto real recién nace al confirmar la recepción del pedido. Ya NO pide precio de
  // venta (Decisión de la sesión del 2026-08-20): el precio se calcula después, en Productos, a
  // partir del costo pactado + % de ganancia.
  const [creandoParaLinea, setCreandoParaLinea] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  // Estado de expansión de la sub-fila de descuentos (grupo 4, tarea 4.4 — Decisión 4 de
  // design.md): un `Set` de `lineaId`, para que varias filas puedan estar abiertas a la vez.
  // Deliberadamente NO se persiste en el borrador (ver el useEffect de guardado más abajo): es
  // estado transitorio de UI, no del pedido — no tiene sentido que sobreviva a un F5.
  const [lineasExpandidas, setLineasExpandidas] = useState(() => new Set());

  const toggleExpansionLinea = (lineaId) => {
    setLineasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(lineaId)) next.delete(lineaId); else next.add(lineaId);
      return next;
    });
  };

  // Auto-expandir (tarea 4.6): al presionar "+" en la celda de descuentos, y al confirmar una
  // línea pendiente que ya trae descuentos por defecto del proveedor (ver
  // confirmarProductoPendiente más abajo) — para compensar el clic extra que introduce la sub-fila
  // expandible. No hace nada si la fila ya estaba expandida.
  const expandirLinea = (lineaId) => {
    setLineasExpandidas((prev) => {
      if (prev.has(lineaId)) return prev;
      const next = new Set(prev);
      next.add(lineaId);
      return next;
    });
  };

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => productosApi.getAll(),
  });

  // Defaults de IVA/envío de la unidad de negocio activa (mismo mecanismo que ProductoForm.jsx),
  // sólo necesarios para resolver el fallback de un producto existente que no tiene su propio
  // IVA/envío cargado (pedido 1: vista de solo lectura de "Configuración actual del producto").
  const { data: negocios } = useQuery({
    queryKey: ['negocios'],
    queryFn: () => negociosApi.getAll(),
  });
  const unidadActivaData = negocios?.find((n) => n.id.toString() === unidadNegocioActiva);
  const ivaDefaultUnidad = unidadActivaData?.ivaPorcentaje ?? 0;
  const costoEnvioDefaultUnidad = unidadActivaData?.costoEnvioPorcentaje ?? 0;

  const proveedorSeleccionado = proveedores.find((p) => String(p.id) === String(proveedorId)) || null;
  const manejaDolares = !!proveedorSeleccionado?.manejaDolares;
  const hayLineaUsd = items.some((it) => it.monedaLinea === 'USD');
  const antiguedadCotizacion = formatAntiguedad(proveedorSeleccionado?.fechaUltimaCotizacion);
  // Plantilla de columnas de la grilla (tarea 3.2): la columna USD existe o no para la grilla
  // entera, según el proveedor — nunca por fila.
  const gridColsClass = manejaDolares ? GRID_COLS_USD : GRID_COLS;

  // Al elegir (o cambiar) el proveedor: precargar el perfil de costeo por defecto en todas las
  // líneas actuales (grupo 8, tarea 8.5), editable línea por línea a partir de acá. Si el
  // proveedor no maneja dólares, ninguna línea puede quedar en USD (tarea 7.1) — se fuerzan a
  // ARS. La cotización del pedido se resetea: es un dato de ESTE proveedor, nunca sobrevive a un
  // cambio de proveedor dentro del mismo formulario.
  useEffect(() => {
    if (proveedorIdAnteriorRef.current === proveedorId) {
      return;
    }
    proveedorIdAnteriorRef.current = proveedorId;
    const defaults = defaultsCosteoDesdeProveedor(proveedorSeleccionado);
    setItems((prev) => {
      // Gate de proveedor (grupo 5, tarea 5.1): caso normal — no había ítems (entrada limpia sin
      // proveedor todavía) — elegir proveedor crea la primera fila en vez de dejar la grilla
      // vacía. Si `prev` ya tenía ítems (borrador restaurado con o sin proveedor previo), se
      // preserva la rama de abajo tal cual estaba: precargar los defaults en cada línea.
      if (prev.length === 0) {
        return proveedorSeleccionado ? [lineaVacia(defaults)] : prev;
      }
      return prev.map((it) => ({
        ...it,
        monedaLinea: proveedorSeleccionado?.manejaDolares ? it.monedaLinea : 'ARS',
        ivaPactadoPorcentaje: defaults.ivaPactadoPorcentaje,
        envioPactadoPorcentaje: defaults.envioPactadoPorcentaje,
        // Copia una nueva instancia de array por línea (nunca la misma referencia compartida
        // entre ítems: cada línea edita su propia lista de descuentos sin pisar la de las demás).
        descuentosPactados: defaults.descuentosPactados.map((d) => ({ ...d })),
      }));
    });
    setCotizacionDolar('');
    setCotizacionTocada(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proveedorId]);

  // Prellenado editable de la cotización (tarea 7.2): sólo cuando aparece la primera línea en
  // USD y el usuario todavía no tocó el campo. Nunca se aplica sola: queda en el input, el
  // usuario la confirma (dejándola) o la reemplaza antes de guardar.
  useEffect(() => {
    if (hayLineaUsd && !cotizacionTocada && cotizacionDolar === '' && proveedorSeleccionado?.ultimaCotizacionConocida != null) {
      setCotizacionDolar(String(proveedorSeleccionado.ultimaCotizacionConocida));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayLineaUsd]);

  // Guardado del borrador (ver cargarBorrador/guardarBorrador arriba) con debounce de 400ms para
  // no escribir en localStorage en cada tecla. Se dispara ante cualquier cambio del estado que
  // compone al pedido — proveedor, observaciones, ítems (con todos sus campos: producto, cantidad,
  // costo, moneda, costeo pactado), cotización del dólar. Deliberadamente NO depende de
  // errors/isSubmitting/creandoParaLinea/nuevoNombre: son estado transitorio de UI, no del pedido.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      guardarBorrador({ proveedorId, observaciones, items, cotizacionDolar, cotizacionTocada });
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [proveedorId, observaciones, items, cotizacionDolar, cotizacionTocada]);

  // Cancelar (botón "Cancelar", flecha "Volver" y tecla Escape comparten este mismo handler): es
  // una señal explícita de "no quiero este pedido" — se limpia el borrador para que la próxima vez
  // que entren a "Nuevo Pedido" no aparezca este intento descartado. No hay confirmación previa acá
  // (no existía en el flujo original; no se agrega una nueva por fuera del alcance de este cambio).
  const handleVolver = () => {
    limpiarBorrador();
    navigate('/pedidos');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !creandoParaLinea) handleVolver();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creandoParaLinea]);

  const actualizarLinea = (lineaId, campo, valor) => {
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId ? { ...it, [campo]: valor } : it)));
  };

  const toggleMonedaLinea = (lineaId) => {
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId
      ? { ...it, monedaLinea: it.monedaLinea === 'USD' ? 'ARS' : 'USD' }
      : it)));
  };

  // Manejo de la lista de descuentos pactados por línea (arreglo 2026-08-21, mismo patrón que
  // handleAddDescuento/handleDescuentoNombreChange/etc. de ProductoForm.jsx, pero indexado
  // también por lineaId porque acá hay una lista por cada ítem, no una sola global).
  const agregarDescuentoLinea = (lineaId) => {
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId
      ? { ...it, descuentosPactados: [...it.descuentosPactados, { nombre: '', porcentaje: '' }] }
      : it)));
  };

  const quitarDescuentoLinea = (lineaId, index) => {
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId
      ? { ...it, descuentosPactados: it.descuentosPactados.filter((_, i) => i !== index) }
      : it)));
  };

  const actualizarDescuentoLinea = (lineaId, index, campo, valor) => {
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId
      ? { ...it, descuentosPactados: it.descuentosPactados.map((d, i) => (i === index ? { ...d, [campo]: valor } : d)) }
      : it)));
  };

  const seleccionarProducto = (lineaId, productoId, textoBuscado = '') => {
    if (productoId === '__nuevo__') {
      setCreandoParaLinea(lineaId);
      // Bug reportado 2026-08-21: al elegir "+ Crear producto nuevo…" se perdía el texto que el
      // usuario ya había tipeado en el buscador, obligándolo a escribirlo de nuevo. Se precarga
      // con lo que estaba buscando en vez de arrancar vacío.
      setNuevoNombre(textoBuscado);
      return;
    }
    const producto = productos.find((p) => String(p.id) === String(productoId));
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId ? {
      ...it,
      productoId,
      productoNombre: producto ? producto.nombre : '',
      // Si la línea venía "pendiente de crear", elegir un producto existente la reemplaza.
      productoNombreNuevo: '',
      // Reapertura puntual de la Decisión 6, sólo IVA/envío (pedido explícito del usuario, sesión
      // del 2026-08-25): al elegir un producto YA EXISTENTE, estos dos campos (ahora editables,
      // ver TablaCosteoProductoExistente) se precargan con el valor EFECTIVO actual de la ficha
      // (mismo resolverEfectivo que el resto del archivo) — nunca con el default del proveedor,
      // que sólo gobierna líneas "pendiente de crear". Si el usuario los deja igual al precargarse,
      // el backend no toca la ficha del producto al confirmar la recepción; si los cambia, sí.
      ivaPactadoPorcentaje: producto ? String(resolverEfectivo(producto.ivaPorcentaje, ivaDefaultUnidad)) : it.ivaPactadoPorcentaje,
      envioPactadoPorcentaje: producto ? String(resolverEfectivo(producto.costoEnvioPorcentaje, costoEnvioDefaultUnidad)) : it.envioPactadoPorcentaje,
      // Ampliación 2026-08-25 (mismo pedido del dueño del negocio, ahora también descuentos): al
      // elegir un producto YA EXISTENTE, precargar `descuentosPactados` con los descuentos
      // ACTUALES de la ficha (`producto.descuentos`, ya viene como [{nombre, porcentaje}] desde el
      // backend) — mismo momento que IVA/envío arriba. Si el usuario los deja igual, el backend no
      // toca la ficha al confirmar la recepción (ver actualizarDescuentosSiDistinto); si los
      // cambia, sí.
      descuentosPactados: producto
        ? (producto.descuentos || []).map((d) => ({ nombre: d.nombre || '', porcentaje: d.porcentaje ?? '' }))
        : it.descuentosPactados,
    } : it)));
  };

  // Bug reportado 2026-08-21 (pedido 2 de esta sesión: "sólo aparece 1 de 2 descuentos" al crear
  // un producto pendiente para INGCO): la causa raíz identificada fue una CACHE DE REACT-QUERY
  // desactualizada — Proveedores.jsx guardaba su alta/edición en su propio useState local sin
  // invalidar el ['proveedores'] compartido que leen PedidoNuevo/Pedidos/ProductoForm (fix ya
  // aplicado en Proveedores.jsx, ver comentario junto a su useQueryClient). Pero ESE fix por sí
  // solo no alcanza para el caso en que el usuario YA tenía el proveedor seleccionado en este
  // pedido ANTES de que sus datos cambiaran: el useEffect de precarga de abajo depende sólo de
  // [proveedorId], nunca se re-dispara si el proveedor no cambia pero sus datos sí — la línea
  // queda con el snapshot congelado del momento en que se seleccionó. Dos mitigaciones:
  // 1) refetchear ['proveedores'] al abrir el <select> de proveedor (onFocus más abajo), para que
  //    una selección nueva siempre parta de datos frescos.
  // 2) este botón explícito por línea, que fuerza un fetch fresco y reaplica
  //    defaultsCosteoDesdeProveedor SOLO a esa línea puntual — nunca a todas, para no pisar en
  //    silencio ediciones manuales que el usuario ya haya hecho en otras líneas.
  const recargarDefaultsProveedorLinea = async (lineaId) => {
    if (!proveedorId) return;
    try {
      const frescos = await queryClient.fetchQuery({ queryKey: ['proveedores'], queryFn: () => proveedoresApi.getAll() });
      const proveedorFresco = (frescos || []).find((p) => String(p.id) === String(proveedorId));
      if (!proveedorFresco) {
        pushToast('error', 'No se pudo recargar el proveedor.');
        return;
      }
      const defaults = defaultsCosteoDesdeProveedor(proveedorFresco);
      setItems((prev) => prev.map((it) => (it.lineaId === lineaId ? {
        ...it,
        ivaPactadoPorcentaje: defaults.ivaPactadoPorcentaje,
        envioPactadoPorcentaje: defaults.envioPactadoPorcentaje,
        descuentosPactados: defaults.descuentosPactados.map((d) => ({ ...d })),
      } : it)));
      pushToast('success', 'Valores por defecto del proveedor recargados.');
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudieron recargar los valores del proveedor.'));
    }
  };

  const agregarLinea = () => setItems((prev) => [...prev, lineaVacia(defaultsCosteoDesdeProveedor(proveedorSeleccionado))]);

  const eliminarLinea = (lineaId) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.lineaId !== lineaId) : prev));
  };

  // Grupo 13 de tasks.md (reemplaza la Decisión 3 original): ya NO se crea el Producto acá.
  // Sólo se captura el nombre y queda guardado en la línea local (productoNombreNuevo, sin
  // productoId) — el alta real ocurre recién al confirmar la recepción del pedido, y sólo para
  // lo que efectivamente llegó. Ya NO se pide precio de venta (Decisión de la sesión del
  // 2026-08-20): el costoUnitarioPactado de la línea se usa como costoProducto y precio inicial.
  const confirmarProductoPendiente = () => {
    if (!nuevoNombre.trim()) {
      pushToast('error', 'El nombre del producto nuevo es requerido.');
      return;
    }
    const lineaId = creandoParaLinea;
    setItems((prev) => prev.map((it) => (it.lineaId === lineaId ? {
      ...it,
      productoId: '',
      productoNombre: '',
      productoNombreNuevo: nuevoNombre.trim(),
    } : it)));
    setCreandoParaLinea(null);
    // Auto-expandir (tarea 4.6): si la línea recién confirmada como "pendiente" ya trae
    // descuentos precargados por defecto del proveedor, mostrarlos de entrada en vez de dejarlos
    // escondidos detrás de un clic extra.
    const lineaActual = items.find((it) => it.lineaId === lineaId);
    if (lineaActual && lineaActual.descuentosPactados.length > 0) {
      expandirLinea(lineaId);
    }
  };

  // Fix del bug del total (change pedido-planilla-editable, grupo 1): ANTES este `reduce` sumaba
  // `cantidad × costoUnitarioPactado` crudo, sin pasar por la cadena de costeo (IVA, envío,
  // descuentos) — mientras cada fila SÍ mostraba su costo final real. El total de acá (usado tanto
  // en el header como en el footer, misma variable) ahora suma el costo final real de cada línea,
  // vía `costoFinalDeLinea` de utils/pedidoCosteo.js — la misma función que usan
  // TablaCosteoProductoExistente y la vista previa de línea pendiente, para que los tres puntos no
  // puedan volver a divergir (design.md, Decisión 1). Una línea a medio cargar o USD sin
  // cotización aporta 0, igual que antes.
  const total = items.reduce((acc, it) => {
    const cant = parseFloat(it.cantidadPedida) || 0;
    return acc + cant * costoFinalDeLinea(it, productos, cotizacionDolar);
  }, 0);

  const validate = () => {
    const newErrors = {};
    if (!proveedorId) newErrors.proveedorId = 'Seleccioná un proveedor';
    if (items.length === 0) newErrors.items = 'Agregá al menos un ítem';
    items.forEach((it) => {
      if (!it.productoId && !it.productoNombreNuevo) newErrors[`producto-${it.lineaId}`] = 'Elegí un producto';
      if (!it.cantidadPedida || parseFloat(it.cantidadPedida) <= 0) newErrors[`cantidad-${it.lineaId}`] = 'Cantidad > 0';
      if (it.costoUnitarioPactado === '' || it.costoUnitarioPactado === null || parseFloat(it.costoUnitarioPactado) < 0) {
        newErrors[`costo-${it.lineaId}`] = 'Costo requerido';
      }
      // Trampa detectada en producción (2026-08-20): un proveedor con IVA aparte y sin un %
      // por defecto configurado (ej. Shimura, donde varía por ítem entre 21% y 10,5%) deja el
      // campo IVA PACTADO vacío al precargar. Si el usuario no lo completa a mano, el producto
      // que nazca de esa línea queda con ivaPorcentaje=null y hereda el 21% de la unidad en
      // silencio — nunca lo que el usuario quería. Obligar a completarlo evita ese salto.
      if (proveedorSeleccionado && !proveedorSeleccionado.ivaIncluidoEnPrecio
          && (proveedorSeleccionado.ivaPorDefectoPorcentaje === null || proveedorSeleccionado.ivaPorDefectoPorcentaje === undefined)
          && it.ivaPactadoPorcentaje === '') {
        newErrors[`iva-${it.lineaId}`] = 'Este proveedor no tiene un IVA por defecto: completá el % de esta línea (o 0 si no aplica).';
      }
      // Validación de la lista de descuentos pactados (arreglo 2026-08-21, mismo criterio que
      // ProductoForm.jsx): aplica a CUALQUIER línea con descuentos cargados (ampliación
      // 2026-08-25 — antes sólo aplicaba a "pendiente de crear"; ahora un producto existente
      // también edita descuentos acá, mismo criterio que IVA/envío). Cada fila cargada necesita
      // nombre y un % >= 0; una fila vacía a medio completar (sólo nombre o sólo %) también se
      // marca inválida, no se ignora en silencio.
      if (it.descuentosPactados.length > 0) {
        const nombreFaltante = it.descuentosPactados.some((d) => !d.nombre || !d.nombre.trim());
        const porcentajeInvalido = it.descuentosPactados.some((d) => {
          const p = d.porcentaje === '' || d.porcentaje === null || d.porcentaje === undefined ? NaN : parseFloat(d.porcentaje);
          return Number.isNaN(p) || p < 0;
        });
        if (nombreFaltante) {
          newErrors[`descuentos-${it.lineaId}`] = 'Cada descuento debe tener un nombre.';
        } else if (porcentajeInvalido) {
          newErrors[`descuentos-${it.lineaId}`] = 'El porcentaje de cada descuento debe ser un número mayor o igual a 0.';
        }
      }
    });
    // Guard de moneda (tarea 7.2/7.4): con al menos una línea en USD, la cotización del pedido
    // es obligatoria — nunca se asume, nunca se completa sola con la última conocida sin que el
    // usuario la deje puesta a propósito.
    if (hayLineaUsd && (!cotizacionDolar || parseFloat(cotizacionDolar) <= 0)) {
      newErrors.cotizacionDolar = 'Cargá la cotización del dólar para este pedido: hay al menos una línea en USD.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      proveedorId: parseInt(proveedorId, 10),
      observaciones: observaciones.trim() || null,
      // Cotización del pedido (tarea 7.3): sólo viaja si hay alguna línea en USD; si no, null —
      // no tiene sentido guardar una cotización que ningún ítem usa.
      cotizacionDolar: hayLineaUsd ? parseFloat(cotizacionDolar) : null,
      // Tarea 13.11 (ajustada por la Decisión de la sesión del 2026-08-20, reabierta 2026-08-25
      // para IVA/envío y AHORA TAMBIÉN descuentos — ver TablaCosteoProductoExistente/
      // seleccionarProducto): una línea a producto existente manda productoId y NO manda datos de
      // producto nuevo; una línea "pendiente de crear" manda productoNombreNuevo y NO manda
      // productoId ni precio de venta (ya no se pide — el producto nace a costo pactado, sin
      // margen, y el precio se ajusta después en Productos). Ambos casos mandan moneda de la línea
      // (grupo 7), ivaPactadoPorcentaje/envioPactadoPorcentaje Y AHORA TAMBIÉN
      // descuentoPactadoPorcentaje/Detalle (ampliación de hoy, mismo criterio): para un producto
      // existente el backend decide en confirmarRecepcion si esos valores se persisten como nuevo
      // default de la ficha (sólo si son distintos del efectivo con el que se precargó la línea).
      detalles: items.map((it) => {
        const base = it.productoId ? {
          productoId: parseInt(it.productoId, 10),
        } : {
          productoNombreNuevo: it.productoNombreNuevo,
        };
        // Colapso de la lista de descuentos pactados (arreglo 2026-08-21, ahora para AMBOS tipos
        // de línea): el backend sólo necesita el % efectivo total de la cascada
        // (descuentoPactadoPorcentaje) + el desglose textual (descuentoPactadoDetalle) — mismo
        // contrato que ya usa MovimientoStock.descuentoPorcentaje/descuentoDetalle. La lista con
        // nombre vive sólo acá, en el frontend.
        const descuentoColapsadoStr = descuentoColapsado(it.descuentosPactados);
        const pactado = {
          ivaPactadoPorcentaje: it.ivaPactadoPorcentaje !== '' ? parseFloat(it.ivaPactadoPorcentaje) : null,
          envioPactadoPorcentaje: it.envioPactadoPorcentaje !== '' ? parseFloat(it.envioPactadoPorcentaje) : null,
          descuentoPactadoPorcentaje: descuentoColapsadoStr !== '' ? parseFloat(descuentoColapsadoStr) : null,
          descuentoPactadoDetalle: descuentoDetalleTexto(it.descuentosPactados),
        };
        return {
          ...base,
          cantidadPedida: parseInt(it.cantidadPedida, 10),
          costoUnitarioPactado: parseFloat(it.costoUnitarioPactado),
          monedaLinea: it.monedaLinea,
          ...pactado,
        };
      }),
    };

    try {
      setIsSubmitting(true);
      await pedidosApi.create(payload);
      // Pedido creado con éxito: limpiar el borrador para que el próximo "Nuevo Pedido" arranque
      // limpio en vez de mostrar este pedido ya creado.
      limpiarBorrador();
      pushToast('success', 'Pedido creado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      navigate('/pedidos');
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo crear el pedido.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Arma las props comunes que consume `FilaItemPedido` en cualquiera de sus dos variantes
  // (grid/card, tarea 3.4): un único punto que arma los handlers cerrados sobre `it.lineaId` en
  // vez de duplicar la lista de props en los dos `.map()` de abajo (uno por variante, Decisión 6).
  const propsFila = (it) => ({
    linea: it,
    productos,
    manejaDolares,
    cotizacionDolar,
    errors,
    onActualizarCampo: (campo, valor) => actualizarLinea(it.lineaId, campo, valor),
    onSeleccionarProducto: (productoId, textoBuscado) => seleccionarProducto(it.lineaId, productoId, textoBuscado),
    onToggleMoneda: () => toggleMonedaLinea(it.lineaId),
    onEliminar: () => eliminarLinea(it.lineaId),
    canEliminar: items.length > 1,
    // Auto-expandir la sub-fila al presionar "+" (tarea 4.6): agregar el descuento y expandir son
    // dos pasos separados en el estado, pero un único gesto para el usuario.
    onAgregarDescuento: () => { agregarDescuentoLinea(it.lineaId); expandirLinea(it.lineaId); },
    onQuitarDescuento: (index) => quitarDescuentoLinea(it.lineaId, index),
    onActualizarDescuento: (index, campo, valor) => actualizarDescuentoLinea(it.lineaId, index, campo, valor),
    onRecargarDefaultsProveedor: () => recargarDefaultsProveedorLinea(it.lineaId),
    creandoAqui: creandoParaLinea === it.lineaId,
    nuevoNombre,
    onChangeNuevoNombre: setNuevoNombre,
    onCancelarCrear: () => setCreandoParaLinea(null),
    onConfirmarCrear: confirmarProductoPendiente,
    expandida: lineasExpandidas.has(it.lineaId),
    onToggleExpansion: () => toggleExpansionLinea(it.lineaId),
    // Gate de proveedor (grupo 5 — Decisión 7 de design.md): sólo puede ser true con `items` no
    // vacío y `!proveedorId` — el caso de un borrador restaurado sin proveedor todavía elegido.
    disabled: !proveedorId,
  });

  return (
    // Rediseño a ancho completo (change pedido-planilla-editable, tarea 3.3, Decisión 3 de
    // design.md): la página deja de estar centrada en `max-w-4xl` — sólo la tarjeta de ítems usa
    // todo el ancho disponible. El header y los bloques de proveedor/observaciones/cotización
    // conservan su propio `max-w-4xl mx-auto`, igual que antes.
    <div className="w-full pb-10">
      <div className="max-w-4xl mx-auto flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleVolver}
          title="Volver a Pedidos"
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 truncate">
            Nuevo Pedido a Proveedor
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Elegí el proveedor y cargá los ítems del pedido.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Proveedor
              </label>
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                // Mitigación 1 del bug "sólo aparece 1 de 2 descuentos" (pedido 2, 2026-08-21):
                // refetchear el caché compartido ['proveedores'] al abrir el selector, para que
                // una elección de proveedor siempre parta de los datos más frescos en vez de
                // confiar en el staleTime de 30s (main.jsx) o en que otra pestaña haya invalidado
                // la query a tiempo.
                onFocus={() => queryClient.refetchQueries({ queryKey: ['proveedores'] })}
                className={`w-full px-4 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.proveedorId ? 'border-red-300' : 'border-gray-200'
                }`}
              >
                <option value="">-- Elegir proveedor --</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {errors.proveedorId && <p className="mt-1 text-xs text-red-500 font-medium">{errors.proveedorId}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Observaciones (opcional)
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                placeholder="Ej: entrega la semana que viene"
              />
            </div>
          </div>

          {/* Cotización del pedido (grupo 7, tarea 7.2 — OQ2): sólo aparece si hay al menos una
              línea en USD. SIEMPRE se pide de nuevo (nace vacía), el prellenado es sólo una
              sugerencia editable con su antigüedad a la vista, nunca se aplica sola. */}
          {hayLineaUsd && (
            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-4">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                Cotización del dólar para este pedido
              </label>
              <FormattedNumberInput
                value={cotizacionDolar}
                onChange={(val) => { setCotizacionDolar(val); setCotizacionTocada(true); }}
                placeholder="Ej: 1460"
                className={`w-full sm:w-48 px-4 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                  errors.cotizacionDolar ? 'border-red-300' : 'border-amber-200'
                }`}
              />
              {antiguedadCotizacion && proveedorSeleccionado?.ultimaCotizacionConocida != null && (
                <p className="mt-1 text-xs text-amber-700">
                  Último valor de {proveedorSeleccionado.nombre}: {Number(proveedorSeleccionado.ultimaCotizacionConocida).toLocaleString('es-AR')} — {antiguedadCotizacion}. Confirmá o editá antes de guardar.
                </p>
              )}
              <p className="mt-1 text-xs text-amber-600">
                Se pide en cada pedido: nunca se reutiliza sola una cotización anterior.
              </p>
              {errors.cotizacionDolar && <p className="mt-1 text-xs text-red-500 font-medium">{errors.cotizacionDolar}</p>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Ítems del pedido</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {items.length} {items.length === 1 ? 'ítem' : 'ítems'} · Total: <span className="font-semibold text-gray-600">${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={agregarLinea}
              disabled={!proveedorId}
              title={!proveedorId ? 'Elegí un proveedor antes de agregar ítems' : undefined}
              className={`flex items-center gap-1 text-sm font-medium shrink-0 ${
                !proveedorId ? 'text-gray-300 cursor-not-allowed' : 'text-emerald-600 hover:text-emerald-700 cursor-pointer'
              }`}
            >
              <Plus className="w-4 h-4" /> Agregar ítem
            </button>
          </div>

          {/* Gate de proveedor obligatorio (grupo 5 — Decisión 7 de design.md): sin proveedor Y
              sin ítems (caso normal, entrada limpia) se muestra un estado vacío en vez de la
              grilla — ninguna fila se renderiza todavía. */}
          {!proveedorId && items.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <PackageSearch className="w-9 h-9 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Elegí un proveedor para empezar a cargar ítems</p>
              <p className="text-xs text-gray-400 max-w-sm">
                El IVA, el envío y los descuentos por defecto de cada ítem salen de la configuración del proveedor.
              </p>
            </div>
          )}

          {/* Caso borrador restaurado con ítems y SIN proveedor (Decisión 7): las filas NUNCA se
              descartan — se muestran debajo de este aviso, con todos sus inputs deshabilitados
              (ver `disabled` en `propsFila`) hasta que se elija un proveedor. */}
          {!proveedorId && items.length > 0 && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Elegí un proveedor para seguir editando estos ítems.
            </div>
          )}

          {items.length > 0 && (
            <>
              {/* Grilla tipo planilla (change pedido-planilla-editable, grupo 3 — Decisión 2 de
                  design.md): una única plantilla de columnas (`gridColsClass`, tarea 3.1/3.2)
                  compartida por la fila de encabezados y por cada `FilaItemPedido` variant="grid",
                  que se renderiza como `className="contents"` para volverse hijas directas de ESTE
                  `div` grid — nunca redefinen la plantilla (así nunca pueden desalinearse).
                  Breakpoint de colapso `xl` (1280px), NO `lg` (tarea 3.12, verificado con Playwright
                  contra el dev stack real): el shell de la app (`DashboardLayout.jsx`, fuera del
                  alcance de este change) envuelve toda página en un contenedor `overflow-x-hidden`
                  fijo; con 9 columnas (caso USD) el ancho mínimo de la grilla (~1028px de columnas +
                  gaps) no entra en el área de contenido disponible entre `lg` y `xl` (sidebar fija de
                  256px descontada), así que a `lg` la grilla queda RECORTADA en silencio —sin
                  scrollbar, columnas de la derecha (IVA %, Envío %, Costo total y hasta el botón de
                  quitar) invisibles e inalcanzables— en vez de colapsar a tarjetas. Es exactamente el
                  riesgo "Densidad visual en 1024–1280px" de design.md, con la salida que el propio
                  documento pre-autoriza: bajar el breakpoint de colapso, nunca agregar scroll
                  horizontal (Decisión 6 lo prohíbe explícitamente por el dropdown/panel absolutos). */}
              <div className={`hidden xl:grid ${gridColsClass} gap-x-3 items-end pb-2 mb-1 border-b border-gray-200`}>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Producto</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Cant.</span>
                {manejaDolares && (
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center">USD</span>
                )}
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Costo unit.</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Descuentos</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">IVA %</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Envío %</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-right">Costo total</span>
                <span aria-hidden="true" />

                {items.map((it) => (
                  <FilaItemPedido key={it.lineaId} variant="grid" {...propsFila(it)} />
                ))}
              </div>

              {/* Colapso mobile/tablet/laptop chica (Decisión 6, breakpoint `xl` — ver comentario de
                  arriba): mismas filas, tarjeta apilada — nunca visible al mismo tiempo que la
                  grilla. */}
              <div className="xl:hidden divide-y divide-gray-100">
                {items.map((it) => (
                  <FilaItemPedido key={it.lineaId} variant="card" {...propsFila(it)} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="text-sm text-gray-600">
            Total: <span className="text-lg font-bold text-gray-900">${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleVolver}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Pedido'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PedidoNuevo;
