package com.vivero.gestion.models;

import jakarta.persistence.*;

@Entity
@Table(name = "stock_abono", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"producto_id", "ubicacion"})
})
public class StockAbono {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UbicacionAbono ubicacion;

    @Column(nullable = false)
    private Integer cantidad = 0;

    public StockAbono() {}

    public StockAbono(Producto producto, UbicacionAbono ubicacion, Integer cantidad) {
        this.producto = producto;
        this.ubicacion = ubicacion;
        this.cantidad = cantidad;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public UbicacionAbono getUbicacion() { return ubicacion; }
    public void setUbicacion(UbicacionAbono ubicacion) { this.ubicacion = ubicacion; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
}
