package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PagoResponseDTO {
    private Long id;
    private BigDecimal monto;
    private String metodoPago;
    private LocalDateTime fecha;

    public PagoResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
