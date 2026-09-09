package com.vivero.gestion.dto;

import com.vivero.gestion.models.CuentaAbono;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fila del historial de retiros de ganancia personal (change retiro-ganancia-abono).
 * `retiradoPor` se resuelve en el servicio con CuentaAbonoNombres.nombreVisible(...), no viaja
 * crudo desde una proyección JPQL (a diferencia de PagoHistorialAbonoDTO): acá el volumen es bajo
 * y no hace falta evitar el fetch de la entidad completa.
 */
public class RetiroGananciaDTO {
    private Long id;
    private BigDecimal monto;
    private LocalDateTime fecha;
    private String observacion;
    private String medioPago;
    private CuentaAbono cuentaAbono;
    private String retiradoPor;

    public RetiroGananciaDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public String getMedioPago() { return medioPago; }
    public void setMedioPago(String medioPago) { this.medioPago = medioPago; }
    public CuentaAbono getCuentaAbono() { return cuentaAbono; }
    public void setCuentaAbono(CuentaAbono cuentaAbono) { this.cuentaAbono = cuentaAbono; }
    public String getRetiradoPor() { return retiradoPor; }
    public void setRetiradoPor(String retiradoPor) { this.retiradoPor = retiradoPor; }
}
