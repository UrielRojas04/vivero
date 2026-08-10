package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class InsumoDTO {

    private Long id;
    private String nombre;
    private String descripcion;
    private BigDecimal precio;
    private Integer stock;
    private Long unidadNegocioId;

    public InsumoDTO() {}

    public InsumoDTO(Long id, String nombre, String descripcion, BigDecimal precio, Integer stock, Long unidadNegocioId) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
        this.unidadNegocioId = unidadNegocioId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public Long getUnidadNegocioId() { return unidadNegocioId; }
    public void setUnidadNegocioId(Long unidadNegocioId) { this.unidadNegocioId = unidadNegocioId; }
}
