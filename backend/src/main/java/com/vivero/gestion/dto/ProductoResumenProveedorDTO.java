package com.vivero.gestion.dto;

import java.math.BigDecimal;

// Fila resumida de "productos asociados a un proveedor" (tarea 3.6 de config-costeo-por-proveedor):
// alimenta la vista previa del grupo 11 (reaplicación de valores del proveedor a sus productos),
// que no se implementa en este grupo. Sólo lo mínimo para esa vista: identificar el producto y
// mostrar su costo actual, sin exponer la entidad Producto completa (regla dura 5).
public class ProductoResumenProveedorDTO {

    private Long id;
    private String nombre;
    private BigDecimal costoActual;

    public ProductoResumenProveedorDTO() {}

    public ProductoResumenProveedorDTO(Long id, String nombre, BigDecimal costoActual) {
        this.id = id;
        this.nombre = nombre;
        this.costoActual = costoActual;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getCostoActual() { return costoActual; }
    public void setCostoActual(BigDecimal costoActual) { this.costoActual = costoActual; }
}
