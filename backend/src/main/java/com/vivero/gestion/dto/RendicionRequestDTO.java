package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class RendicionRequestDTO {
    private BigDecimal monto;
    private String observacion;

    public RendicionRequestDTO() {}

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
}
