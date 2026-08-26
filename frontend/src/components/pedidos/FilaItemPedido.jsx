import React from 'react';
import { Trash2, PackagePlus } from 'lucide-react';
import FormattedNumberInput from '../FormattedNumberInput';
import ProductoSearchSelect from './ProductoSearchSelect';
import CeldaDescuentos from './CeldaDescuentos';
import PanelDescuentosLinea from './PanelDescuentosLinea';
import { costoFinalDeLinea, desgloseDeLinea, porcentajesDescuentoDeLinea, efectivoCascadaDescuentos } from '../../utils/pedidoCosteo';

// Una fila de la grilla de ítems de PedidoNuevo.jsx (change pedido-planilla-editable, grupo 3 —
// Decisiones 2, 3, 6 y 9 de design.md). No guarda estado del pedido: todo lo que compone al
// pedido (línea, handlers) llega por props desde PedidoNuevo.jsx, que sigue siendo el único
// dueño de `items`.
//
// Dos variantes de render, elegidas por el padre según el breakpoint (mismo patrón que Pedidos.jsx:
// dos loops separados, uno "hidden xl:grid" y otro "xl:hidden" — nunca las dos visibles a la vez;
// breakpoint ajustado de `lg` a `xl` durante la implementación, ver Decisión 6 de design.md — el
// shell de la app envuelve toda página en `overflow-x-hidden` fijo y a `lg` la grilla de 9
// columnas recortaba en silencio entre 1024–1280px, sin scrollbar):
// - variant="grid": la fila entera es `className="contents"` para que sus celdas se vuelvan hijos
//   directos del `<div className="hidden xl:grid ...">` del padre y participen de la MISMA
//   plantilla de columnas que la fila de encabezados (Decisión 2 de design.md — nunca redefinir la
//   plantilla acá adentro).
// - variant="card": tarjeta apilada de ancho completo con pares etiqueta:valor, sin scroll
//   horizontal (Decisión 6). Es, a grandes rasgos, el layout vertical que la pantalla ya tenía
//   antes de este rediseño.
//
// Celda de descuentos (grupo 4 — Decisión 4 de design.md): la celda de la grilla es
// `CeldaDescuentos`, un resumen compacto de altura fija con chips + el efectivo de la cascada. Al
// hacer clic (o en el `+`, sólo para línea pendiente) se abre `PanelDescuentosLinea`, una sub-fila
// `col-span-full` con el editor completo. El estado de expansión (`expandida`/`onToggleExpansion`)
// es un `Set` de `lineaId` que vive en `PedidoNuevo.jsx` — esta fila no lo posee, sólo lo consume.
//
// Sub-formulario de "producto nuevo" (`creandoParaLinea`, Decisión 5 de design.md): mismo
// mecanismo de sub-fila `col-span-full`, disparado por su propio estado (`creandoAqui`) — no
// comparte el `Set` de expansión de descuentos porque lo abre `ProductoSearchSelect`, no un clic
// en la celda de descuentos.
const FilaItemPedido = ({
  linea,
  variant,
  productos,
  manejaDolares,
  cotizacionDolar,
  errors,
  onActualizarCampo,
  onSeleccionarProducto,
  onToggleMoneda,
  onEliminar,
  canEliminar,
  onAgregarDescuento,
  onQuitarDescuento,
  onActualizarDescuento,
  onRecargarDefaultsProveedor,
  creandoAqui,
  nuevoNombre,
  onChangeNuevoNombre,
  onCancelarCrear,
  onConfirmarCrear,
  expandida,
  onToggleExpansion,
  // Gate de proveedor (grupo 5 — Decisión 7 de design.md): true cuando la fila viene de un
  // borrador restaurado sin proveedor todavía elegido. La fila queda VISIBLE (nunca se descarta)
  // pero con todos sus inputs deshabilitados hasta que se elija un proveedor.
  disabled = false,
}) => {
  const esPendiente = !linea.productoId && !!linea.productoNombreNuevo;
  const esExistente = !esPendiente && !!linea.productoId;
  const producto = esExistente ? productos.find((p) => String(p.id) === String(linea.productoId)) : null;

  // Único cálculo de costo de línea del change (Decisión 1 de design.md): se reusa
  // `desgloseDeLinea`/`costoFinalDeLinea` de utils/pedidoCosteo.js — la misma función que el total
  // del header/footer — para que esta celda nunca pueda divergir del número que se suma arriba.
  const desglose = desgloseDeLinea(linea, productos, cotizacionDolar);
  const costoFinal = costoFinalDeLinea(linea, productos, cotizacionDolar);
  const costoBaseFicha = producto?.costoProducto ? parseFloat(producto.costoProducto) : 0;
  // Mismo criterio que MovimientoStockServiceImpl (guardado.getCostoBase() vs
  // producto.getCostoProducto()): aviso de auto-ratchet, conservado tal cual (tarea 3.10).
  const disparaAjuste = esExistente && desglose ? desglose.costoBaseConvertido > costoBaseFicha : false;

  // Fuente de los descuentos para la celda-resumen (ampliación 2026-08-25, ver comentario de
  // `porcentajesDescuentoDeLinea` en utils/pedidoCosteo.js): ya no depende del tipo de línea —
  // `linea.descuentosPactados` para AMBOS casos (producto existente y pendiente), porque las dos
  // son editables por igual ahora. Para una línea existente, `descuentosPactados` se precarga con
  // los descuentos actuales de la ficha en `seleccionarProducto` (PedidoNuevo.jsx).
  const descuentosFuente = linea.descuentosPactados;
  const descuentosConNombre = (descuentosFuente || []).filter((d) => (
    d.nombre && d.porcentaje !== '' && d.porcentaje !== null && d.porcentaje !== undefined && !Number.isNaN(parseFloat(d.porcentaje))
  ));
  // Efectivo total de la cascada (Decisión 4 de design.md: "y, cuando la cascada da algo, el
  // efectivo total"): sólo tiene sentido mostrarlo con 2+ descuentos — con uno solo, el chip ya
  // muestra ese mismo número y repetirlo es ruido. Reusa `porcentajesDescuentoDeLinea` (misma
  // fuente que el cálculo real del costo, nunca una lectura distinta de `descuentosFuente`) para
  // que el efectivo mostrado acá nunca pueda divergir del que realmente se aplicó al costo.
  const efectivoPorcentaje = descuentosConNombre.length > 1
    ? efectivoCascadaDescuentos(porcentajesDescuentoDeLinea(linea))
    : null;

  const errorProducto = errors[`producto-${linea.lineaId}`];
  const errorCantidad = errors[`cantidad-${linea.lineaId}`];
  const errorCosto = errors[`costo-${linea.lineaId}`];
  const errorIva = errors[`iva-${linea.lineaId}`];
  const errorDescuentos = errors[`descuentos-${linea.lineaId}`];

  const costoFormateado = desglose
    ? `$${costoFinal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
  const notaUsd = linea.monedaLinea === 'USD' && linea.costoUnitarioPactado !== '' && !Number.isNaN(parseFloat(linea.costoUnitarioPactado))
    ? `US$ ${parseFloat(linea.costoUnitarioPactado).toLocaleString('es-AR')}`
    : null;

  const avisoAutoRatchet = disparaAjuste ? (
    <p className="text-[11px] text-amber-600">
      ⚠️ Este costo es mayor al de la ficha (${costoBaseFicha.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) — al
      confirmar, el costo y el precio de venta del producto se van a actualizar solos hacia este valor.
    </p>
  ) : null;

  const inputClass = (hasError) => `w-full px-2.5 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-right ${
    hasError ? 'border-red-300' : 'border-gray-200'
  }`;

  const botonQuitar = (
    <button
      type="button"
      onClick={onEliminar}
      disabled={disabled || !canEliminar}
      title="Quitar ítem"
      className={`shrink-0 p-2 rounded-lg transition-colors ${
        disabled || !canEliminar ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
      }`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );

  // Celda-resumen de descuentos (grupo 4 — Decisión 4 de design.md, ampliado 2026-08-25):
  // `CeldaDescuentos` es editable para cualquier tipo de línea ahora, ya no distingue
  // sólo-lectura/editable por `esExistente`.
  const celdaDescuentos = (
    <CeldaDescuentos
      descuentos={descuentosConNombre}
      efectivoPorcentaje={efectivoPorcentaje}
      expandida={!!expandida}
      onToggle={onToggleExpansion}
      onAgregar={onAgregarDescuento}
      disabled={disabled}
    />
  );

  // Sub-fila del editor de descuentos (Decisión 4, ampliada 2026-08-25): ahora se abre para
  // cualquier tipo de línea (existente o pendiente) mientras esté expandida — antes era exclusiva
  // de la línea pendiente.
  const panelDescuentos = expandida ? (
    <PanelDescuentosLinea
      descuentos={linea.descuentosPactados}
      error={errorDescuentos}
      onAgregar={onAgregarDescuento}
      onQuitar={onQuitarDescuento}
      onActualizar={onActualizarDescuento}
      onRecargarDefaultsProveedor={onRecargarDefaultsProveedor}
    />
  ) : null;

  // Sub-formulario de "producto pendiente de crear" (Decisión 5 de design.md): mismo mecanismo de
  // sub-fila `col-span-full` que el editor de descuentos, con su propio disparador
  // (`creandoAqui`, controlado por `ProductoSearchSelect` al elegir "+ Crear producto nuevo…").
  const subFormularioNuevo = creandoAqui ? (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
      <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
        <PackagePlus className="w-4 h-4" /> Producto nuevo — se crea al confirmar la recepción
      </p>
      <input
        type="text"
        value={nuevoNombre}
        onChange={(e) => onChangeNuevoNombre(e.target.value)}
        placeholder="Nombre del producto"
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <p className="text-[11px] text-gray-500">
        El precio de venta se configura después, en Productos.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelarCrear}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmarCrear}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
        >
          Usar en esta línea
        </button>
      </div>
    </div>
  ) : null;

  if (variant === 'grid') {
    const cellBase = 'py-3 border-b border-gray-100';
    return (
      <div className="contents">
        {/* Producto */}
        <div className={`${cellBase} relative min-w-0`}>
          <ProductoSearchSelect
            productos={productos}
            productoId={linea.productoId}
            productoNombre={linea.productoNombre}
            productoNombreNuevo={linea.productoNombreNuevo}
            onSelect={onSeleccionarProducto}
            hasError={!!errorProducto}
            disabled={disabled}
          />
          {errorProducto && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorProducto}</p>}
        </div>

        {/* Cantidad */}
        <div className={cellBase}>
          <FormattedNumberInput
            value={linea.cantidadPedida}
            onChange={(val) => onActualizarCampo('cantidadPedida', val)}
            placeholder="0"
            className={inputClass(!!errorCantidad)}
            disabled={disabled}
          />
          {errorCantidad && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorCantidad}</p>}
        </div>

        {/* USD (sólo si el proveedor maneja dólares) */}
        {manejaDolares && (
          <div className={`${cellBase} flex items-center justify-center`}>
            <input
              type="checkbox"
              checked={linea.monedaLinea === 'USD'}
              onChange={onToggleMoneda}
              disabled={disabled}
              className="cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
              title="Línea en dólares"
            />
          </div>
        )}

        {/* Costo unitario */}
        <div className={cellBase}>
          <FormattedNumberInput
            value={linea.costoUnitarioPactado}
            onChange={(val) => onActualizarCampo('costoUnitarioPactado', val)}
            placeholder="0"
            className={inputClass(!!errorCosto)}
            disabled={disabled}
          />
          {errorCosto && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorCosto}</p>}
        </div>

        {/* Descuentos: celda-resumen + sub-fila expandible (grupo 4) */}
        <div className={`${cellBase} min-w-0`}>
          {celdaDescuentos}
        </div>

        {/* IVA % */}
        <div className={cellBase}>
          <FormattedNumberInput
            value={linea.ivaPactadoPorcentaje}
            onChange={(val) => onActualizarCampo('ivaPactadoPorcentaje', val)}
            placeholder="0"
            className={inputClass(!!errorIva)}
            disabled={disabled}
          />
          {errorIva && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorIva}</p>}
        </div>

        {/* Envío % */}
        <div className={cellBase}>
          <FormattedNumberInput
            value={linea.envioPactadoPorcentaje}
            onChange={(val) => onActualizarCampo('envioPactadoPorcentaje', val)}
            placeholder="0"
            className={inputClass(false)}
            disabled={disabled}
          />
        </div>

        {/* Costo total de la línea */}
        <div className={`${cellBase} text-right`}>
          <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{costoFormateado}</p>
          {notaUsd && <p className="text-[10px] text-gray-400 whitespace-nowrap">{notaUsd}</p>}
        </div>

        {/* Quitar */}
        <div className={`${cellBase} flex items-center justify-center`}>
          {botonQuitar}
        </div>

        {/* Aviso de auto-ratchet: fila completa, al pie (tarea 3.10) */}
        {avisoAutoRatchet && (
          <div className="col-span-full -mt-1 pb-2">
            {avisoAutoRatchet}
          </div>
        )}

        {/* Sub-fila del editor de descuentos (Decisión 4 de design.md): fila completa, sólo
            cuando la celda de arriba está expandida. */}
        {panelDescuentos && (
          <div className="col-span-full pb-2">
            {panelDescuentos}
          </div>
        )}

        {/* Sub-formulario de producto pendiente (Decisión 5): fila completa. */}
        {subFormularioNuevo && (
          <div className="col-span-full pb-2">
            {subFormularioNuevo}
          </div>
        )}
      </div>
    );
  }

  // variant === 'card': colapso responsive por debajo de lg (tarea 3.12), pares etiqueta:valor,
  // sin scroll horizontal.
  return (
    <div className="py-4 first:pt-0">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 relative">
          <ProductoSearchSelect
            productos={productos}
            productoId={linea.productoId}
            productoNombre={linea.productoNombre}
            productoNombreNuevo={linea.productoNombreNuevo}
            onSelect={onSeleccionarProducto}
            hasError={!!errorProducto}
            disabled={disabled}
          />
          {errorProducto && <p className="mt-1 text-xs text-red-500 font-medium">{errorProducto}</p>}
        </div>
        {botonQuitar}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Cantidad</label>
          <FormattedNumberInput
            value={linea.cantidadPedida}
            onChange={(val) => onActualizarCampo('cantidadPedida', val)}
            placeholder="0"
            className={inputClass(!!errorCantidad)}
            disabled={disabled}
          />
          {errorCantidad && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorCantidad}</p>}
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Costo unit.</label>
          <FormattedNumberInput
            value={linea.costoUnitarioPactado}
            onChange={(val) => onActualizarCampo('costoUnitarioPactado', val)}
            placeholder="0"
            className={inputClass(!!errorCosto)}
            disabled={disabled}
          />
          {errorCosto && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorCosto}</p>}
        </div>
        {manejaDolares && (
          <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={linea.monedaLinea === 'USD'}
              onChange={onToggleMoneda}
              disabled={disabled}
              className="cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
            />
            Línea en USD
          </label>
        )}
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">IVA %</label>
          <FormattedNumberInput
            value={linea.ivaPactadoPorcentaje}
            onChange={(val) => onActualizarCampo('ivaPactadoPorcentaje', val)}
            placeholder="0"
            className={inputClass(!!errorIva)}
            disabled={disabled}
          />
          {errorIva && <p className="mt-1 text-[11px] text-red-500 font-medium">{errorIva}</p>}
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Envío %</label>
          <FormattedNumberInput
            value={linea.envioPactadoPorcentaje}
            onChange={(val) => onActualizarCampo('envioPactadoPorcentaje', val)}
            placeholder="0"
            className={inputClass(false)}
            disabled={disabled}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-medium text-gray-400 mb-0.5">Descuentos</label>
          {celdaDescuentos}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm pt-2 border-t border-gray-100">
        <span className="text-gray-500">Costo total</span>
        <div className="text-right">
          <span className="font-semibold text-gray-900">{costoFormateado}</span>
          {notaUsd && <p className="text-[10px] text-gray-400">{notaUsd}</p>}
        </div>
      </div>
      {avisoAutoRatchet}
      {panelDescuentos && <div className="mt-2">{panelDescuentos}</div>}
      {subFormularioNuevo && <div className="mt-2">{subFormularioNuevo}</div>}
    </div>
  );
};

export default FilaItemPedido;
