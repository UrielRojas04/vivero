package com.vivero.gestion.services;

import java.math.BigDecimal;

import com.vivero.gestion.models.MonedaCosto;
import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.models.Usuario;

public interface MovimientoStockService {
    MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario);

    // Sobrecarga que acepta el costo base explícito (herramientas-pedidos-proveedores, Decisión 4
    // de design.md): usada por la confirmación de recepción de un pedido a proveedor, donde el
    // costo base NO sale de producto.getCostoProducto() sino del costoUnitarioPactado del ítem del
    // pedido. costoBaseExplicito == null se comporta exactamente igual que la firma de 4 parámetros
    // (que delega en esta con null) — no hay dos implementaciones de la fórmula, sólo una.
    MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                         BigDecimal costoBaseExplicito);

    // Sobrecarga que además acepta la moneda/cotización de ESTA línea (config-costeo-por-proveedor,
    // grupo 6/7 de tasks.md): usada por PedidoServiceImpl.confirmarRecepcion() para congelar
    // moneda_origen/cotizacion_aplicada en el movimiento. monedaLinea == null (o distinta de USD)
    // se comporta exactamente igual que la firma de 5 parámetros (que delega acá con
    // monedaLinea=null, cotizacionAplicada=null): el guard "sólo convierte si USD" vive en
    // CostoCalculator, no acá.
    MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                         BigDecimal costoBaseExplicito, MonedaCosto monedaLinea, BigDecimal cotizacionAplicada);

    // Sobrecarga que además acepta IVA%/envío% pactados de ESTA línea (reapertura puntual de la
    // Decisión 6, pedido explícito del usuario, sesión del 2026-08-25 — no es un change de
    // OpenSpec): usada por PedidoServiceImpl.confirmarRecepcion() cuando la línea de un producto
    // YA EXISTENTE trae ivaPactadoPorcentaje/envioPactadoPorcentaje. Cada uno es independiente:
    // null se comporta exactamente igual que la firma de 7 parámetros (que delega acá con ambos en
    // null) — cae al fallback de siempre, resolverEfectivo(producto.ivaPorcentaje/costoEnvioPorcentaje,
    // default de la unidad). Un valor no nulo GANA sobre la ficha del producto para ESTE cálculo,
    // sin importar si es 0 o distinto al de la ficha.
    MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                         BigDecimal costoBaseExplicito, MonedaCosto monedaLinea, BigDecimal cotizacionAplicada,
                                         BigDecimal ivaPactadoExplicito, BigDecimal envioPactadoExplicito);

    // Sobrecarga que además acepta el descuento% pactado (ya colapsado) y su detalle textual de
    // ESTA línea (ampliación del change pedido-planilla-editable — descuentos editables también
    // para una línea de producto YA EXISTENTE, pedido explícito del dueño del negocio: "los
    // descuentos y los impuestos pueden ir variando a pesar de que sea el mismo producto", mismo
    // criterio ya aplicado a IVA/envío arriba): usada por PedidoServiceImpl.confirmarRecepcion()
    // para AMBOS tipos de línea (existente y pendiente-recién-creada). descuentoPactadoExplicito
    // == null se comporta exactamente igual que la firma de 9 parámetros (que delega acá con
    // ambos nuevos parámetros en null) — cae al fallback de siempre, la cascada de
    // producto.getDescuentos(). Un valor no nulo (incluido 0, "sin descuento") GANA sobre la
    // ficha del producto para ESTE cálculo puntual, reemplazando por completo la cascada de la
    // ficha por un único factor ya colapsado — NO se combinan ambas fuentes.
    // descuentoPactadoDetalleExplicito viaja tal cual a MovimientoStock.descuentoDetalle cuando
    // descuentoPactadoExplicito no es null (puede ser null igual, ej. descuento 0 sin desglose).
    MovimientoStock registrarMovimiento(Producto producto, Integer cantidad, TipoMovimientoStock tipo, Usuario usuario,
                                         BigDecimal costoBaseExplicito, MonedaCosto monedaLinea, BigDecimal cotizacionAplicada,
                                         BigDecimal ivaPactadoExplicito, BigDecimal envioPactadoExplicito,
                                         BigDecimal descuentoPactadoExplicito, String descuentoPactadoDetalleExplicito);
}
