package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "movimientos_stock")
@SQLDelete(sql = "UPDATE movimientos_stock SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class MovimientoStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "venta_id")
    private Venta venta;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;

    private Integer cantidad;
    private String tipo; // IN / OUT
    private String motivo; // Venta, Descarte, Ajuste, Compra

    private LocalDateTime fecha;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario; // Quien lo registró

    public MovimientoStock() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
