package com.vivero.gestion.repositories;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Proyección nativa usada por ProductoRepository.findRevisionCostos() (tarea 3.1 de
// revision-costos-productos, regla dura 5 — nunca la entidad JPA en la query de detección).
// Trae sólo las columnas del PRODUCTO y del ÚLTIMO INGRESO/AJUSTE_INICIAL: el cálculo de
// precioResultante/costoUnitarioResultante (Decisión 3 de design.md) se hace después, en
// ProductoServiceImpl, reusando CostoCalculator con los datos completos de la entidad
// (descuentos, IVA/envío propios, porcentajeGanancia) — esta proyección no los necesita.
public interface RevisionCostoProjection {
    Long getProductoId();
    String getNombre();
    String getProveedorNombre();
    LocalDateTime getFechaUltimoIngreso();
    BigDecimal getCostoFicha();
    BigDecimal getCostoUltimoIngreso();
    // Ya resuelto por moneda (Decisión 4 de design.md): para ARS/null es igual a
    // costoUltimoIngreso; para USD con conversión registrada es costo_base / cotizacion_aplicada
    // — el mismo valor en la escala de costoFicha, listo para comparar y para alimentar
    // CostoCalculator como costoBase nuevo (Decisión 3).
    BigDecimal getCostoUltimoIngresoComparable();
    String getMonedaCosto();
    BigDecimal getCotizacionAplicada();
    Long getMovimientoId();
}
