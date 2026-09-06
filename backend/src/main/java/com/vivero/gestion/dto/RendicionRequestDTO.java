package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class RendicionRequestDTO {
    private BigDecimal monto;
    private String observacion;
    // Sin campo "direccion": desde 2026-09-04 se deriva server-side de la cuenta (Jefe/Colega)
    // del usuario autenticado -- ver RendicionColegaServiceImpl.registrarRendicion. El cliente no
    // la elige ni la manda.
    private String medioPago;
    private String fecha; // "YYYY-MM-DD", nullable

    public RendicionRequestDTO() {}

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public String getMedioPago() { return medioPago; }
    public void setMedioPago(String medioPago) { this.medioPago = medioPago; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
}
