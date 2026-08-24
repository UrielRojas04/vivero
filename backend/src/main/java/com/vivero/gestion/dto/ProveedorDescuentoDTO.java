package com.vivero.gestion.dto;

import java.math.BigDecimal;

// DTO de una fila de la lista libre de descuentos POR DEFECTO del perfil de un proveedor
// (Decisión 1 de design.md de config-costeo-por-proveedor). Nunca se expone la entidad
// ProveedorDescuento directamente en un endpoint (regla dura 5: DTOs siempre).
public class ProveedorDescuentoDTO {

    private String nombre;
    private BigDecimal porcentaje;

    public ProveedorDescuentoDTO() {}

    public ProveedorDescuentoDTO(String nombre, BigDecimal porcentaje) {
        this.nombre = nombre;
        this.porcentaje = porcentaje;
    }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getPorcentaje() { return porcentaje; }
    public void setPorcentaje(BigDecimal porcentaje) { this.porcentaje = porcentaje; }
}
