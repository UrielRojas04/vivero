package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;

// Entidad hija de Proveedor — lista libre de descuentos POR DEFECTO del perfil de costeo del
// proveedor (Decisión 1 de design.md de config-costeo-por-proveedor). Calcada de ProductoDescuento
// (mismo molde, misma semántica), pero con dueño y ciclo de vida propios: no se reusa la tabla de
// producto_descuentos con un discriminador (dos dueños distintos, dos vidas distintas). Son sólo
// un valor sugerido y copiable (Decisión 3 — OQ3, se copian una sola vez): el CostoCalculator
// nunca consulta al proveedor ni a esta entidad.
@Entity
@Table(name = "proveedor_descuentos")
public class ProveedorDescuento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    private Proveedor proveedor;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentaje;

    @Column(name = "orden")
    private Integer orden;

    public ProveedorDescuento() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Proveedor getProveedor() { return proveedor; }
    public void setProveedor(Proveedor proveedor) { this.proveedor = proveedor; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getPorcentaje() { return porcentaje; }
    public void setPorcentaje(BigDecimal porcentaje) { this.porcentaje = porcentaje; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}
