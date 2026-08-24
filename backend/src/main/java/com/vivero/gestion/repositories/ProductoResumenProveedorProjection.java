package com.vivero.gestion.repositories;

import java.math.BigDecimal;

// Proyección nativa usada por ProductoRepository.findResumenPorProveedor() (tarea 3.6 de
// config-costeo-por-proveedor). Ver el comentario de esa consulta: depende de la columna
// productos.proveedor_id, agregada recién en el grupo 9 (checkpoint pendiente), así que esta
// proyección no tiene invocadores reales hasta entonces.
public interface ProductoResumenProveedorProjection {
    Long getId();
    String getNombre();
    BigDecimal getCostoActual();
}
