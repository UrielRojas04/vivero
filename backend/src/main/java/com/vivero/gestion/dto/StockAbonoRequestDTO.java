package com.vivero.gestion.dto;

public class StockAbonoRequestDTO {
    private Long productoId;
    private Integer cantidad;
    private String direccion;
    private com.vivero.gestion.models.CuentaAbono cuenta;

    public StockAbonoRequestDTO() {}

    public Long getProductoId() { return productoId; }
    public void setProductoId(Long productoId) { this.productoId = productoId; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public com.vivero.gestion.models.CuentaAbono getCuenta() { return cuenta; }
    public void setCuenta(com.vivero.gestion.models.CuentaAbono cuenta) { this.cuenta = cuenta; }
}
