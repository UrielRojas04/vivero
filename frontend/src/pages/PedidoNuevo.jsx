import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, X, Plus, Trash2, PackagePlus, Search, Sparkles, DollarSign, RefreshCw } from 'lucide-react';
import FormattedNumberInput from '../components/FormattedNumberInput';
import { proveedoresApi } from '../api/proveedores.api';
import { productosApi } from '../api/productos.api';
import { pedidosApi } from '../api/pedidos.api';
import { negociosApi } from '../api/negocios.api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/errorMessage';
import { calcularCosto, resolverEfectivo } from '../utils/costeo';

const generarIdLinea = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `linea-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

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

// Combobox de búsqueda de producto para una línea del pedido (grupo 12, pedido puntual
// post-apply del usuario: reemplaza el <select> nativo, incómodo con catálogos grandes).
// Sigue el estilo visual del buscador de productos de NuevaVenta.jsx (icono Search, input
// con pl-10, lista de resultados filtrados debajo), pero cada línea tiene su PROPIO estado
// de búsqueda — no hay un buscador global compartido. Definido a nivel de módulo (no anidado
// dentro de PedidoNuevo) para que su estado interno no se resetee en cada render del padre.
// No reimplementa selección/alta: delega en `onSelect` (que en PedidoNuevo es `seleccionarProducto`).
//
// Fix de desborde (rediseño página completa, 2026-08-20): el nombre de producto ahora SIEMPRE
// trunca con ellipsis en vez de empujar el layout. La causa real del bug del modal viejo era que
// el <span> del nombre no tenía min-w-0 — en un flex row los hijos no se achican por debajo de su
// ancho de contenido (min-width:auto por default), así que `truncate` nunca llegaba a aplicarse
// y el botón (y sus ancestros) se estiraban para acomodar el texto completo. Acá se agrega
// min-w-0 explícito en el span truncado y un `title` nativo con el nombre completo.
const ProductoSearchSelect = ({ productos, productoId, productoNombre, productoNombreNuevo, onSelect, hasError }) => {
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(false);

  const esPendiente = !productoId && !!productoNombreNuevo;
  const buscando = editando || (!productoId && !esPendiente);

  const abrirBusqueda = () => {
    setBusqueda('');
    setEditando(true);
  };

  const handleSeleccionar = (id) => {
    onSelect(id, busqueda);
    setBusqueda('');
    setEditando(false);
  };

  const filtrados = busqueda
    ? productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos;

  if (!buscando) {
    if (esPendiente) {
      // Grupo 13: el producto NO existe todavía en el catálogo. Tratamiento sobrio (rediseño
      // 2026-08-20): el botón ya NO es una tarjeta amarilla entera — fondo/borde neutros, la
      // única señal de color es el badge chico "Nuevo", igual que para cualquier otra línea.
      return (
        <button
          type="button"
          onClick={abrirBusqueda}
          title={productoNombreNuevo}
          className={`w-full min-w-0 px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-300 transition-colors ${
            hasError ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate min-w-0 text-gray-800">{productoNombreNuevo}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Nuevo
            </span>
          </span>
          <span className="text-xs font-medium text-emerald-600 shrink-0">Cambiar</span>
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={abrirBusqueda}
        title={productoNombre}
        className={`w-full min-w-0 px-3 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-left flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-300 transition-colors ${
          hasError ? 'border-red-300' : 'border-gray-200'
        }`}
      >
        <span className="truncate min-w-0">{productoNombre}</span>
        <span className="text-xs font-medium text-emerald-600 shrink-0">Cambiar</span>
      </button>
    );
  }

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          autoFocus
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className={`w-full pl-8 pr-8 py-2 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${
            hasError ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {(productoId || esPendiente) && (
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Cancelar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {busqueda && (
        <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm divide-y divide-gray-50">
          {filtrados.length > 0 ? (
            filtrados.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSeleccionar(p.id)}
                className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="truncate min-w-0">{p.nombre}</span>
                <span className="text-xs text-gray-400 shrink-0">stock: {p.stock}</span>
              </div>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-gray-400">No se encontraron productos.</p>
          )}
          <div
            onClick={() => handleSeleccionar('__nuevo__')}
            className="px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer"
          >
            + Crear producto nuevo…
          </div>
        </div>
      )}
    </div>
  );
};

// Página de alta de pedido a proveedor (rediseño 2026-08-20, reemplaza el modal PedidoForm):
// proveedor, ítems (producto existente o creado en el momento con stock 0 — Decisión 3), cantidad
// y costo unitario pactado por ítem, con total en vivo. Extendido por config-costeo-por-proveedor
// (grupos 7/8 de tasks.md) con moneda por línea, cotización del pedido y precarga del perfil de
// costeo del proveedor. Mismo comportamiento funcional que el modal anterior — sólo cambia la
// presentación: página completa en vez de modal (más ancho para la tabla de ítems, que era
// justamente lo que faltaba) y un lenguaje visual más sobrio (menos bordes/colores por ítem,
// jerarquía por tipografía y espaciado).
// Bloque de solo lectura ("Configuración actual del producto") para una línea de pedido cuyo
// producto YA EXISTE en el catálogo (arreglo 2026-08-21, Decisión OQ3 de config-costeo-por-
// proveedor: "el proveedor no es una tercera capa de fallback en vivo"). Un producto existente se
// rige por SU PROPIA configuración ya cargada en ProductoForm.jsx (sus propios descuentos, IVA,
// envío) — nunca por los defaults del proveedor del pedido. Este bloque sólo la HACE VISIBLE acá,
// de solo lectura (sin inputs): no la gobierna, no la edita. Usa el mismo calcularCosto/
// resolverEfectivo que ProductoForm.jsx (sin conversión de moneda — mismo criterio que el
// desglose en vivo de ProductoForm, que tampoco convierte) para que el costo final coincida al
// centavo con lo que ProductoForm ya muestra para ese producto y con CostoCalculator en backend.
const ConfiguracionProductoExistente = ({ producto, ivaDefaultUnidad, costoEnvioDefaultUnidad }) => {
  if (!producto) return null;

  const ivaEfectivo = resolverEfectivo(producto.ivaPorcentaje, ivaDefaultUnidad);
  const envioEfectivo = resolverEfectivo(producto.costoEnvioPorcentaje, costoEnvioDefaultUnidad);
  const ivaHereda = producto.ivaPorcentaje === null || producto.ivaPorcentaje === undefined;
  const envioHereda = producto.costoEnvioPorcentaje === null || producto.costoEnvioPorcentaje === undefined;
  const porcentajesDescuento = (producto.descuentos || [])
    .map((d) => (d.porcentaje !== null && d.porcentaje !== undefined && d.porcentaje !== '' ? parseFloat(d.porcentaje) : NaN))
    .filter((p) => !Number.isNaN(p));
  const costoBase = producto.costoProducto ? parseFloat(producto.costoProducto) : 0;
  const desglose = calcularCosto(costoBase, porcentajesDescuento, ivaEfectivo, envioEfectivo);

  return (
    <div className="mt-2 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        Configuración actual del producto (no editable acá — se gobierna desde Productos)
      </p>
      {producto.descuentos && producto.descuentos.length > 0 ? (
        <p>
          Descuentos: {producto.descuentos.map((d) => `${d.nombre} ${parseFloat(d.porcentaje).toFixed(2)}%`).join('; ')}
        </p>
      ) : (
        <p className="italic text-gray-400">Sin descuentos cargados.</p>
      )}
      <p>
        IVA: <span className="font-semibold text-gray-700">{ivaEfectivo}%</span>
        {ivaHereda && <span className="text-gray-400"> (hereda de la unidad)</span>}
      </p>
      <p>
        Envío: <span className="font-semibold text-gray-700">{envioEfectivo}%</span>
        {envioHereda && <span className="text-gray-400"> (hereda de la unidad)</span>}
      </p>
      <p>
        Costo final: <span className="font-semibold text-gray-800">
          ${desglose.costoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        {' '}<span className="text-gray-400">({producto.monedaCosto || 'ARS'})</span>
      </p>
    </div>
  );
};

const PedidoNuevo = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();
  const { unidadNegocioActiva } = useAuthStore();

  const [proveedorId, setProveedorId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([lineaVacia()]);
  // Cotización del dólar de ESTE pedido (grupo 7, tarea 7.2 — OQ2). SIEMPRE se pide de nuevo:
  // nace vacía al entrar a la página y sólo se sugiere un prellenado editable cuando aparece la
  // primera línea en USD — nunca se aplica sola.
  const [cotizacionDolar, setCotizacionDolar] = useState('');
  const [cotizacionTocada, setCotizacionTocada] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-formulario de "producto pendiente de crear" (grupo 13 de tasks.md), abierto para una
  // línea puntual. Ya NO llama a la API: sólo captura el nombre y lo guarda en la línea local —
  // el Producto real recién nace al confirmar la recepción del pedido. Ya NO pide precio de
  // venta (Decisión de la sesión del 2026-08-20): el precio se calcula después, en Productos, a
  // partir del costo pactado + % de ganancia.
  const [creandoParaLinea, setCreandoParaLinea] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

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

  // Al elegir (o cambiar) el proveedor: precargar el perfil de costeo por defecto en todas las
  // líneas actuales (grupo 8, tarea 8.5), editable línea por línea a partir de acá. Si el
  // proveedor no maneja dólares, ninguna línea puede quedar en USD (tarea 7.1) — se fuerzan a
  // ARS. La cotización del pedido se resetea: es un dato de ESTE proveedor, nunca sobrevive a un
  // cambio de proveedor dentro del mismo formulario.
  useEffect(() => {
    const defaults = defaultsCosteoDesdeProveedor(proveedorSeleccionado);
    setItems((prev) => prev.map((it) => ({
      ...it,
      monedaLinea: proveedorSeleccionado?.manejaDolares ? it.monedaLinea : 'ARS',
      ivaPactadoPorcentaje: defaults.ivaPactadoPorcentaje,
      envioPactadoPorcentaje: defaults.envioPactadoPorcentaje,
      // Copia una nueva instancia de array por línea (nunca la misma referencia compartida entre
      // ítems: cada línea edita su propia lista de descuentos sin pisar la de las demás).
      descuentosPactados: defaults.descuentosPactados.map((d) => ({ ...d })),
    })));
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

  const handleVolver = () => navigate('/pedidos');

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
    setItems((prev) => prev.map((it) => (it.lineaId === creandoParaLinea ? {
      ...it,
      productoId: '',
      productoNombre: '',
      productoNombreNuevo: nuevoNombre.trim(),
    } : it)));
    setCreandoParaLinea(null);
  };

  const total = items.reduce((acc, it) => {
    const cant = parseFloat(it.cantidadPedida) || 0;
    const costo = parseFloat(it.costoUnitarioPactado) || 0;
    // Vista previa consistente con el backend (CostoCalculator/confirmarRecepcion): una línea en
    // USD se convierte a ARS por la cotización del pedido antes de sumar al total. Sin cotización
    // cargada todavía, la línea aporta 0 al total (no se puede mostrar un ARS inventado) en vez de
    // sumar el número crudo en USD como si fueran pesos.
    if (it.monedaLinea === 'USD') {
      const cotizacion = parseFloat(cotizacionDolar) || 0;
      return acc + cant * costo * cotizacion;
    }
    return acc + cant * costo;
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
      // ProductoForm.jsx): sólo aplica a líneas "pendiente de crear" — un producto existente no
      // edita descuentos acá. Cada fila cargada necesita nombre y un % >= 0; una fila vacía a
      // medio completar (sólo nombre o sólo %) también se marca inválida, no se ignora en
      // silencio.
      const esPendienteValidate = !it.productoId && !!it.productoNombreNuevo;
      if (esPendienteValidate && it.descuentosPactados.length > 0) {
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
      // Tarea 13.11 (ajustada por la Decisión de la sesión del 2026-08-20): una línea a producto
      // existente manda productoId y NO manda datos de producto nuevo; una línea "pendiente de
      // crear" manda productoNombreNuevo y NO manda productoId ni precio de venta (ya no se
      // pide — el producto nace a costo pactado, sin margen, y el precio se ajusta después en
      // Productos). Ambos casos mandan moneda de la línea (grupo 7); sólo una línea "pendiente"
      // manda además el costeo pactado (iva/envío/descuento — grupo 8, Decisión 8): para un
      // producto ya existente esos valores no se usan (gobierna su propia configuración).
      detalles: items.map((it) => {
        const base = it.productoId ? {
          productoId: parseInt(it.productoId, 10),
        } : {
          productoNombreNuevo: it.productoNombreNuevo,
        };
        // Colapso de la lista de descuentos pactados (arreglo 2026-08-21): el backend sólo
        // necesita el % efectivo total de la cascada (descuentoPactadoPorcentaje) + el desglose
        // textual (descuentoPactadoDetalle) — mismo contrato que ya usa
        // MovimientoStock.descuentoPorcentaje/descuentoDetalle. La lista con nombre vive sólo acá,
        // en el frontend.
        const descuentoColapsadoStr = descuentoColapsado(it.descuentosPactados);
        const pactado = it.productoId ? {} : {
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
      pushToast('success', 'Pedido creado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      navigate('/pedidos');
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo crear el pedido.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
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
              className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Agregar ítem
            </button>
          </div>

          <div className="mt-3 divide-y divide-gray-100">
            {items.map((it) => {
              const esPendiente = !it.productoId && !!it.productoNombreNuevo;
              return (
                <div key={it.lineaId} className="py-4 first:pt-2">
                  {/* Fila del producto: SIEMPRE en su propia línea, ancho completo — decoupleada
                      de los campos numéricos de abajo (que viven en su propia fila con anchos
                      fijos). Esto es lo que elimina el desborde horizontal del modal viejo: nada
                      depende de comprimirse dentro de una grilla compartida. */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <ProductoSearchSelect
                        productos={productos}
                        productoId={it.productoId}
                        productoNombre={it.productoNombre}
                        productoNombreNuevo={it.productoNombreNuevo}
                        onSelect={(productoId, textoBuscado) => seleccionarProducto(it.lineaId, productoId, textoBuscado)}
                        hasError={!!errors[`producto-${it.lineaId}`]}
                      />
                      {errors[`producto-${it.lineaId}`] && (
                        <p className="mt-1 text-xs text-red-500 font-medium">{errors[`producto-${it.lineaId}`]}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarLinea(it.lineaId)}
                      disabled={items.length === 1}
                      title="Quitar ítem"
                      className={`shrink-0 p-2 rounded-lg transition-colors ${
                        items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Fila de campos numéricos: anchos fijos (nunca se comprimen ni se cortan) y
                      flex-wrap para que, en pantallas muy angostas (320px), bajen de línea en vez
                      de desbordar. */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 pl-0">
                    <div className="w-[84px] shrink-0">
                      <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Cant.</label>
                      <FormattedNumberInput
                        value={it.cantidadPedida}
                        onChange={(val) => actualizarLinea(it.lineaId, 'cantidadPedida', val)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right ${
                          errors[`cantidad-${it.lineaId}`] ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    <div className="w-[132px] shrink-0">
                      <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Costo unit.</label>
                      <FormattedNumberInput
                        value={it.costoUnitarioPactado}
                        onChange={(val) => actualizarLinea(it.lineaId, 'costoUnitarioPactado', val)}
                        placeholder="0"
                        className={`w-full px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right ${
                          errors[`costo-${it.lineaId}`] ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    </div>

                    {/* Moneda de la línea (grupo 7, tarea 7.1): visible SÓLO si el proveedor
                        elegido maneja dólares. */}
                    {manejaDolares && (
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 cursor-pointer shrink-0 self-end pb-1.5">
                        <input
                          type="checkbox"
                          checked={it.monedaLinea === 'USD'}
                          onChange={() => toggleMonedaLinea(it.lineaId)}
                          className="cursor-pointer accent-emerald-600"
                        />
                        USD
                      </label>
                    )}
                  </div>

                  {/* Pedido 1 (arreglo 2026-08-21): un producto YA EXISTENTE se rige por su propia
                      configuración de costeo (ProductoForm.jsx), nunca por los defaults del
                      proveedor del pedido (OQ3). Acá sólo se la muestra, de solo lectura, para que
                      el usuario vea con qué costo real va a quedar el producto — no se confunde
                      con el "Costo unit." de arriba, que es el costo PACTADO de esta compra
                      puntual (puede diferir del costo de catálogo del producto). */}
                  {!esPendiente && it.productoId && (
                    <ConfiguracionProductoExistente
                      producto={productos.find((p) => String(p.id) === String(it.productoId))}
                      ivaDefaultUnidad={ivaDefaultUnidad}
                      costoEnvioDefaultUnidad={costoEnvioDefaultUnidad}
                    />
                  )}

                  {/* Costeo pactado de la línea (grupo 8, tarea 8.5), sólo relevante para una
                      línea "pendiente de crear": el producto que nazca de acá se crea con estos
                      valores, no con los del proveedor en ese momento (tarea 8.11). Para un
                      producto ya existente, su propia ficha en Productos gobierna.
                      Arreglo 2026-08-21: el viejo campo único "Desc. %" (sin nombre, sin vista
                      previa) se reemplaza por una lista de descuentos con nombre (mismo patrón que
                      ProductoForm.jsx) + una vista previa en vivo del costo final, para que el
                      efecto del descuento se vea ACÁ, antes de confirmar la recepción, en vez de
                      recién en el backend. */}
                  {esPendiente && (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-3">
                        <div className="w-[84px] shrink-0">
                          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">IVA %</label>
                          <FormattedNumberInput
                            value={it.ivaPactadoPorcentaje}
                            onChange={(val) => actualizarLinea(it.lineaId, 'ivaPactadoPorcentaje', val)}
                            placeholder="0"
                            className={`w-full px-2 py-1 rounded-lg border bg-white text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              errors[`iva-${it.lineaId}`] ? 'border-red-300' : 'border-gray-200'
                            }`}
                          />
                          {errors[`iva-${it.lineaId}`] && (
                            <p className="mt-0.5 text-[10px] text-red-500 leading-tight">{errors[`iva-${it.lineaId}`]}</p>
                          )}
                        </div>
                        <div className="w-[84px] shrink-0">
                          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Envío %</label>
                          <FormattedNumberInput
                            value={it.envioPactadoPorcentaje}
                            onChange={(val) => actualizarLinea(it.lineaId, 'envioPactadoPorcentaje', val)}
                            placeholder="0"
                            className="w-full px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Lista de descuentos pactados (nombre + %), agregable/quitable. */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-medium text-gray-400">Descuentos pactados</label>
                          <div className="flex items-center gap-2.5">
                            {/* Mitigación 2 del bug "sólo aparece 1 de 2 descuentos" (pedido 2,
                                2026-08-21): si el proveedor ya estaba seleccionado en este pedido
                                cuando le cambiaron el perfil de costeo, la precarga automática
                                (useEffect [proveedorId]) no se entera sola — este botón fuerza un
                                fetch fresco de ['proveedores'] y reaplica los defaults SOLO a
                                esta línea. */}
                            <button
                              type="button"
                              onClick={() => recargarDefaultsProveedorLinea(it.lineaId)}
                              title="Volver a traer IVA/envío/descuentos por defecto del proveedor (por si cambiaron después de seleccionarlo)"
                              className="flex items-center gap-0.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" /> Recargar del proveedor
                            </button>
                            <button
                              type="button"
                              onClick={() => agregarDescuentoLinea(it.lineaId)}
                              className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Agregar
                            </button>
                          </div>
                        </div>
                        {it.descuentosPactados.length === 0 ? (
                          <p className="text-[11px] text-gray-400 italic">Sin descuentos cargados.</p>
                        ) : (
                          <div className="space-y-1 mt-0.5">
                            {it.descuentosPactados.map((d, index) => (
                              <div key={index} className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={d.nombre}
                                  onChange={(e) => actualizarDescuentoLinea(it.lineaId, index, 'nombre', e.target.value)}
                                  placeholder="Ej: Proveedor, Volumen"
                                  className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <div className="w-16 shrink-0">
                                  <FormattedNumberInput
                                    value={d.porcentaje}
                                    onChange={(val) => actualizarDescuentoLinea(it.lineaId, index, 'porcentaje', val)}
                                    placeholder="%"
                                    className="w-full px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => quitarDescuentoLinea(it.lineaId, index)}
                                  className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                                  aria-label="Quitar descuento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {errors[`descuentos-${it.lineaId}`] && (
                          <p className="mt-0.5 text-[10px] text-red-500 leading-tight">{errors[`descuentos-${it.lineaId}`]}</p>
                        )}
                      </div>

                      {/* Vista previa en vivo del costo final (responde directo al reclamo "no se
                          está aplicando el descuento"): mismo utilitario calcularCosto que ya usa
                          ProductoForm.jsx, así el número que se ve acá coincide al centavo con lo
                          que el backend termina congelando en el movimiento al confirmar la
                          recepción. Con moneda USD, calcularCosto ya aplica la conversión por
                          cotizacionDolar del pedido antes del resto de la cadena. */}
                      {(() => {
                        const costoBaseLinea = it.costoUnitarioPactado !== '' ? parseFloat(it.costoUnitarioPactado) : NaN;
                        if (Number.isNaN(costoBaseLinea)) return null;
                        const porcentajesLinea = it.descuentosPactados
                          .map((d) => (d.porcentaje !== '' && d.porcentaje !== null && d.porcentaje !== undefined ? parseFloat(d.porcentaje) : NaN))
                          .filter((p) => !Number.isNaN(p));
                        const ivaLinea = it.ivaPactadoPorcentaje !== '' ? parseFloat(it.ivaPactadoPorcentaje) || 0 : 0;
                        const envioLinea = it.envioPactadoPorcentaje !== '' ? parseFloat(it.envioPactadoPorcentaje) || 0 : 0;
                        const cotizacionLinea = it.monedaLinea === 'USD' ? (parseFloat(cotizacionDolar) || 0) : null;
                        const previewDesglose = calcularCosto(
                          costoBaseLinea,
                          porcentajesLinea,
                          ivaLinea,
                          envioLinea,
                          it.monedaLinea,
                          cotizacionLinea,
                        );
                        return (
                          <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                            Costo final: <span className="font-semibold text-gray-800">
                              ${previewDesglose.costoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {previewDesglose.descuentoEfectivo > 0 && (
                              <span className="text-gray-400"> (desc. efectivo {previewDesglose.descuentoEfectivo.toFixed(2)}%)</span>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Sub-formulario de producto pendiente de crear, sólo visible para esta línea
                      (grupo 13: ya no llama a la API, sólo captura el nombre). Tratamiento sobrio
                      (rediseño 2026-08-20): gris neutro con acento ámbar puntual, no una tarjeta
                      ámbar entera. */}
                  {creandoParaLinea === it.lineaId && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <PackagePlus className="w-4 h-4" /> Producto nuevo — se crea al confirmar la recepción
                      </p>
                      <input
                        type="text"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        placeholder="Nombre del producto"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[11px] text-gray-500">
                        El precio de venta se configura después, en Productos.
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setCreandoParaLinea(null)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={confirmarProductoPendiente}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                        >
                          Usar en esta línea
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
