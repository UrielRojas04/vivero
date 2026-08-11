package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class VentaLiteDTO {

    private Long id;
    private Long nroVenta;
    private LocalDateTime fecha;
    private String clienteNombre;
    private BigDecimal totalFinal;
    private String estadoDePago;
    private String metodoPago;

    public VentaLiteDTO() {}

    public VentaLiteDTO(Long id, Long nroVenta, LocalDateTime fecha, String clienteNombre,
                        BigDecimal totalFinal, String estadoDePago) {
        this(id, nroVenta, fecha, clienteNombre, totalFinal, estadoDePago, null);
    }

    public VentaLiteDTO(Long id, Long nroVenta, LocalDateTime fecha, String clienteNombre,
                        BigDecimal totalFinal, String estadoDePago, String metodoPago) {
        this.id = id;
        this.nroVenta = nroVenta;
        this.fecha = fecha;
        this.clienteNombre = clienteNombre;
        this.totalFinal = totalFinal;
        this.estadoDePago = estadoDePago;
        this.metodoPago = metodoPago;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getNroVenta() { return nroVenta; }
    public void setNroVenta(Long nroVenta) { this.nroVenta = nroVenta; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public BigDecimal getTotalFinal() { return totalFinal; }
    public void setTotalFinal(BigDecimal totalFinal) { this.totalFinal = totalFinal; }
    public String getEstadoDePago() { return estadoDePago; }
    public void setEstadoDePago(String estadoDePago) { this.estadoDePago = estadoDePago; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
}