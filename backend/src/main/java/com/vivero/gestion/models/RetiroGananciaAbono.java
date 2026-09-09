package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Retiro de ganancia personal (jefe o colega sacan plata de SU PROPIA ganancia ya generada en
 * Abono, para uso personal/familiar). Tabla nueva y separada de `rendiciones_colega` a propósito
 * (Decisión 1 de design.md de retiro-ganancia-abono): una rendición mueve plata OPERATIVA entre
 * las dos cuentas (siempre tiene origen y destino, ver DireccionRendicion); un retiro de ganancia
 * es plata que sale del sistema hacia el bolsillo personal de una sola cuenta, sin contraparte.
 * Mezclar ambos conceptos en la misma tabla arriesgaba romper el cálculo de
 * RendicionColegaServiceImpl.obtenerLiquidacion, que ya suma rendicionesEntregadas con el signo
 * de `direccion` -- un tipo de movimiento distinto ahí adentro sería un bug esperando pasar.
 */
@Entity
@Table(name = "retiros_ganancia_abono")
public class RetiroGananciaAbono {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal monto;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Column(length = 500)
    private String observacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario; // Quien registró el retiro

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_negocio_id", nullable = false)
    private UnidadNegocio unidadNegocio;

    // De qué cuenta operativa es la ganancia retirada -- a diferencia de RendicionColega.direccion
    // (origen Y destino), acá sólo hay un valor: la cuenta que se está llevando SU PROPIA plata.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, name = "cuenta_abono")
    private CuentaAbono cuentaAbono;

    @Column(length = 30)
    private String medioPago;

    public RetiroGananciaAbono() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    public CuentaAbono getCuentaAbono() { return cuentaAbono; }
    public void setCuentaAbono(CuentaAbono cuentaAbono) { this.cuentaAbono = cuentaAbono; }
    public String getMedioPago() { return medioPago; }
    public void setMedioPago(String medioPago) { this.medioPago = medioPago; }
}
