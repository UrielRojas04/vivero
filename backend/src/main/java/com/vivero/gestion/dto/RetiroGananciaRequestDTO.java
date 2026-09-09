package com.vivero.gestion.dto;

import java.math.BigDecimal;

/**
 * Sin campo de cuenta: se deriva de CuentaAbonoContextHolder en el servicio, igual que
 * RendicionRequestDTO ya no lleva "direccion" -- el cliente no elige de qué cuenta es el retiro.
 */
public class RetiroGananciaRequestDTO {
    private BigDecimal monto;
    private String observacion;
    private String medioPago;
    private String fecha; // "YYYY-MM-DD", nullable

    public RetiroGananciaRequestDTO() {}

    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public String getMedioPago() { return medioPago; }
    public void setMedioPago(String medioPago) { this.medioPago = medioPago; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
}
