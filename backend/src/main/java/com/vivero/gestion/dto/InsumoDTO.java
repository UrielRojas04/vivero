package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class InsumoDTO {

    private Long id;
    private String nombre;
    private String descripcion;
    private BigDecimal precio;
    private LocalDateTime fechaCompra;
    private Integer stock;

    public InsumoDTO() {}

    public InsumoDTO(Long id, String nombre, String descripcion, BigDecimal precio, LocalDateTime fechaCompra, Integer stock) {
        this.id = id;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.fechaCompra = fechaCompra;
        this.stock = stock;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public LocalDateTime getFechaCompra() { return fechaCompra; }
    public void setFechaCompra(LocalDateTime fechaCompra) { this.fechaCompra = fechaCompra; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }


}
