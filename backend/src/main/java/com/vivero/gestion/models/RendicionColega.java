package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rendiciones_colega")
public class RendicionColega {

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
    private Usuario usuario; // Quien registró la rendición

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_negocio_id", nullable = false)
    private UnidadNegocio unidadNegocio;

    public RendicionColega() {}

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
}
