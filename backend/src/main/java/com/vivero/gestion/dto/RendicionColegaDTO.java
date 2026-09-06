package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RendicionColegaDTO {
    private Long id;
    private BigDecimal monto;
    private LocalDateTime fecha;
    private String observacion;
    private String usuarioNombre;
    private String direccion;
    private String medioPago;

    public RendicionColegaDTO(Long id, BigDecimal monto, LocalDateTime fecha, String observacion,
                               String usuarioNombre, String direccion, String medioPago) {
        this.id = id;
        this.monto = monto;
        this.fecha = fecha;
        this.observacion = observacion;
        this.usuarioNombre = usuarioNombre;
        this.direccion = direccion;
        this.medioPago = medioPago;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getMedioPago() { return medioPago; }
    public void setMedioPago(String medioPago) { this.medioPago = medioPago; }
}
