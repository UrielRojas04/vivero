package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "factura_conceptos")
public class FacturaConcepto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "factura_id", nullable = false)
    private FacturaCliente factura;

    @Column(nullable = false)
    private String descripcion;

    @Column(nullable = false)
    private BigDecimal monto;

    @Column(nullable = false)
    private LocalDateTime fecha;

    public FacturaConcepto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public FacturaCliente getFactura() { return factura; }
    public void setFactura(FacturaCliente factura) { this.factura = factura; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
