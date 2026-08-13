package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

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

    @ManyToOne
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @ManyToOne
    @JoinColumn(name = "producto_id")
    private Producto producto;

    private Integer cantidad;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TipoMovimientoStock tipoMovimiento;

    @Column(name = "costo_unitario", precision = 12, scale = 2)
    private BigDecimal costoUnitario = BigDecimal.ZERO;
    
    @Column(name = "costo_base", precision = 12, scale = 2)
    private BigDecimal costoBase = BigDecimal.ZERO;

    @Column(name = "descuento_porcentaje", precision = 5, scale = 2)
    private BigDecimal descuentoPorcentaje = BigDecimal.ZERO;

    @Column(name = "envio_porcentaje", precision = 5, scale = 2)
    private BigDecimal envioPorcentaje = BigDecimal.ZERO;

    private LocalDateTime fecha;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario; // Quien lo registró

    public MovimientoStock() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }
    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    public TipoMovimientoStock getTipoMovimiento() { return tipoMovimiento; }
    public void setTipoMovimiento(TipoMovimientoStock tipoMovimiento) { this.tipoMovimiento = tipoMovimiento; }
    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }
    
    public BigDecimal getCostoBase() { return costoBase; }
    public void setCostoBase(BigDecimal costoBase) { this.costoBase = costoBase; }
    
    public BigDecimal getDescuentoPorcentaje() { return descuentoPorcentaje; }
    public void setDescuentoPorcentaje(BigDecimal descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }
    
    public BigDecimal getEnvioPorcentaje() { return envioPorcentaje; }
    public void setEnvioPorcentaje(BigDecimal envioPorcentaje) { this.envioPorcentaje = envioPorcentaje; }
    
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
