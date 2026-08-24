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
}
