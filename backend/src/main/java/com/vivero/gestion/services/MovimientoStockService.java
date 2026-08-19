package com.vivero.gestion.services;

import java.math.BigDecimal;

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
}
