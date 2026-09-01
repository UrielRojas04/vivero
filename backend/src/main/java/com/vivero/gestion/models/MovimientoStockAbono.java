package com.vivero.gestion.models;

import jakarta.persistence.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import java.time.LocalDateTime;

@Entity
@Table(name = "movimientos_stock_abono")
public class MovimientoStockAbono {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private Producto producto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UbicacionAbono ubicacion;

    @Column(nullable = false)
    private Integer cantidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoMovimientoStockAbono tipoMovimiento;

    @Enumerated(EnumType.STRING)
    @Column(name = "cuenta_abono")
    private CuentaAbono cuenta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    private Venta venta;

    public MovimientoStockAbono() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public UbicacionAbono getUbicacion() { return ubicacion; }
    public void setUbicacion(UbicacionAbono ubicacion) { this.ubicacion = ubicacion; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public TipoMovimientoStockAbono getTipoMovimiento() { return tipoMovimiento; }
    public void setTipoMovimiento(TipoMovimientoStockAbono tipoMovimiento) { this.tipoMovimiento = tipoMovimiento; }

    public CuentaAbono getCuenta() { return cuenta; }
    public void setCuenta(CuentaAbono cuenta) { this.cuenta = cuenta; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public Venta getVenta() { return venta; }
    public void setVenta(Venta venta) { this.venta = venta; }
}
