package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class PagoRequestDTO {
    private BigDecimal monto;
    private String metodoPago;

    public PagoRequestDTO() {}

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }

    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
}
