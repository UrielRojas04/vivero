package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;

// Entidad hija de Producto — lista libre de descuentos ESTABLES (Decisión 1 de design.md de
// costeo-flexible-por-producto). No modela el descuento por pagar en efectivo (varía compra a
// compra): ese caso sigue resolviéndose a mano vía PedidoDetalle.costoUnitarioPactado
// (Decisión 14). Se combinan en cascada, no en suma (Decisión 2) — "orden" es sólo presentacional,
// el producto de factores es conmutativo.
@Entity
@Table(name = "producto_descuentos")
public class ProductoDescuento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id")
    private Producto producto;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal porcentaje;

    @Column(name = "orden")
    private Integer orden;

    public ProductoDescuento() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public BigDecimal getPorcentaje() { return porcentaje; }
    public void setPorcentaje(BigDecimal porcentaje) { this.porcentaje = porcentaje; }

    public Integer getOrden() { return orden; }
    public void setOrden(Integer orden) { this.orden = orden; }
}
