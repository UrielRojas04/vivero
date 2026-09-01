package com.vivero.gestion.dto;

import java.time.LocalDateTime;

public class MovimientoStockAbonoDTO {
    private Long id;
    private String productoNombre;
    private String ubicacion;
    private Integer cantidad;
    private String tipoMovimiento;
    private String cuenta;
    private LocalDateTime fecha;
    private String usuarioNombre;

    public MovimientoStockAbonoDTO(Long id, String productoNombre, String ubicacion, Integer cantidad, String tipoMovimiento, String cuenta, LocalDateTime fecha, String usuarioNombre) {
        this.id = id;
        this.productoNombre = productoNombre;
        this.ubicacion = ubicacion;
        this.cantidad = cantidad;
        this.tipoMovimiento = tipoMovimiento;
        this.cuenta = cuenta;
        this.fecha = fecha;
        this.usuarioNombre = usuarioNombre;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getProductoNombre() { return productoNombre; }
    public void setProductoNombre(String productoNombre) { this.productoNombre = productoNombre; }
    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public String getTipoMovimiento() { return tipoMovimiento; }
    public void setTipoMovimiento(String tipoMovimiento) { this.tipoMovimiento = tipoMovimiento; }
    public String getCuenta() { return cuenta; }
    public void setCuenta(String cuenta) { this.cuenta = cuenta; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
}
