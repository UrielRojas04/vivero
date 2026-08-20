package com.vivero.gestion.dto;

import java.math.BigDecimal;

// DTO de una fila de la lista libre de descuentos ESTABLES de un producto (Decisión 1 de
// design.md de costeo-flexible-por-producto). Nunca se expone la entidad ProductoDescuento
// directamente en un endpoint (regla dura: DTOs siempre), tarea 7.6/8.1.
public class ProductoDescuentoDTO {

    private String nombre;
    private BigDecimal porcentaje;

    public ProductoDescuentoDTO() {}

    public ProductoDescuentoDTO(String nombre, BigDecimal porcentaje) {
        this.nombre = nombre;
        this.porcentaje = porcentaje;
    }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getPorcentaje() { return porcentaje; }
    public void setPorcentaje(BigDecimal porcentaje) { this.porcentaje = porcentaje; }
}
