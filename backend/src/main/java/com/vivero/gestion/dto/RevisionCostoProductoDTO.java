package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// DTO de una fila del panel de revisión de costos (regla dura 5 — nunca la entidad JPA;
// tarea 3.3 de revision-costos-productos). Todos los campos nullable donde el dato puede
// faltar (proveedor sin cargar, ficha sin costo): NUNCA se usa un 0 que se confunda con un
// costo real (tarea 8.3). movimientoId es obligatorio: es el id que "Descartar" sella en
// producto.movimientoRevisionDescartadoId (Decisión 11, grupo 6 — no implementado en esta
// pasada, pero el DTO ya lo expone porque sin él ese grupo no se puede implementar).
public class RevisionCostoProductoDTO {

    private Long productoId;
    private String nombre;
    private String proveedorNombre;
    private LocalDateTime fechaUltimoIngreso;

    // Las dos BASES (antes de descuentos/IVA/envío) — lo que el usuario pidió ver: "costo viejo
    // y el nuevo al lado" (Decisión 1).
    private BigDecimal costoFicha;
    private BigDecimal costoUltimoIngreso;

    // Línea secundaria (OQ2, resuelta por sí): los dos costos UNITARIOS finales, calculados por
    // el backend reusando CostoCalculator — el frontend no los recalcula (Decisión 3).
    private BigDecimal costoUnitarioActual;
    private BigDecimal costoUnitarioResultante;

    // Precio de venta al público: el actual y el que quedaría si se aprieta "Actualizar". Si el
    // guard de calcularPrecioSiAplica() no aplica (porcentajeGanancia null/<=0, o costo nuevo
    // <=0), precioResultante == precioActual (Decisión 3) — nunca un precio inventado.
    private BigDecimal precioActual;
    private BigDecimal precioResultante;

    private String monedaCosto;
    // Sólo informada cuando el producto es USD y el movimiento registró conversión (Decisión 4);
    // null en cualquier otro caso.
    private BigDecimal cotizacionAplicada;

    // Obligatorio: el id del INGRESO/AJUSTE_INICIAL que "Descartar" va a sellar (Decisión 11).
    private Long movimientoId;

    public RevisionCostoProductoDTO() {}

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getProveedorNombre() { return proveedorNombre; }
    public void setProveedorNombre(String proveedorNombre) { this.proveedorNombre = proveedorNombre; }

    public LocalDateTime getFechaUltimoIngreso() { return fechaUltimoIngreso; }
    public void setFechaUltimoIngreso(LocalDateTime fechaUltimoIngreso) { this.fechaUltimoIngreso = fechaUltimoIngreso; }

    public BigDecimal getCostoFicha() { return costoFicha; }
    public void setCostoFicha(BigDecimal costoFicha) { this.costoFicha = costoFicha; }

    public BigDecimal getCostoUltimoIngreso() { return costoUltimoIngreso; }
    public void setCostoUltimoIngreso(BigDecimal costoUltimoIngreso) { this.costoUltimoIngreso = costoUltimoIngreso; }

    public BigDecimal getCostoUnitarioActual() { return costoUnitarioActual; }
    public void setCostoUnitarioActual(BigDecimal costoUnitarioActual) { this.costoUnitarioActual = costoUnitarioActual; }

    public BigDecimal getCostoUnitarioResultante() { return costoUnitarioResultante; }
    public void setCostoUnitarioResultante(BigDecimal costoUnitarioResultante) { this.costoUnitarioResultante = costoUnitarioResultante; }

    public BigDecimal getPrecioActual() { return precioActual; }
    public void setPrecioActual(BigDecimal precioActual) { this.precioActual = precioActual; }

    public BigDecimal getPrecioResultante() { return precioResultante; }
    public void setPrecioResultante(BigDecimal precioResultante) { this.precioResultante = precioResultante; }

    public String getMonedaCosto() { return monedaCosto; }
    public void setMonedaCosto(String monedaCosto) { this.monedaCosto = monedaCosto; }

    public BigDecimal getCotizacionAplicada() { return cotizacionAplicada; }
    public void setCotizacionAplicada(BigDecimal cotizacionAplicada) { this.cotizacionAplicada = cotizacionAplicada; }

    public Long getMovimientoId() { return movimientoId; }
    public void setMovimientoId(Long movimientoId) { this.movimientoId = movimientoId; }
}
