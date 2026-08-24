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

    // Desglose congelado nuevo (Decisión 7 de design.md de costeo-flexible-por-producto), TODOS
    // nullable y SIN valor por defecto a propósito: los movimientos históricos tienen que quedar
    // en NULL ("no había esto cuando se congeló"), no en 0.00 — un default de 0 mentiría diciendo
    // "IVA cero registrado" (Decisión 13, tarea 3.2).
    @Column(name = "costo_neto", precision = 12, scale = 2)
    private BigDecimal costoNeto;

    @Column(name = "iva_porcentaje", precision = 5, scale = 2)
    private BigDecimal ivaPorcentaje;

    @Column(name = "descuento_detalle", length = 500)
    private String descuentoDetalle;

    // Congelado de moneda (Decisión 5/7 de design.md de config-costeo-por-proveedor). Nullable A
    // PROPÓSITO, sin valor por defecto: los movimientos históricos y los de líneas en pesos
    // quedan en NULL, que se lee como "no hubo conversión de moneda" — nunca 'ARS' explícito, para
    // no inventar un dato que el movimiento nunca tuvo (mismo criterio que costoNeto/ivaPorcentaje
    // de costeo-flexible-por-producto). El paso de conversión que los escribe es del grupo 6/7,
    // fuera de alcance del grupo 5.
    @Column(name = "moneda_origen", length = 3)
    private String monedaOrigen;

    @Column(name = "cotizacion_aplicada", precision = 12, scale = 4)
    private BigDecimal cotizacionAplicada;

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

    public BigDecimal getCostoNeto() { return costoNeto; }
    public void setCostoNeto(BigDecimal costoNeto) { this.costoNeto = costoNeto; }

    public BigDecimal getIvaPorcentaje() { return ivaPorcentaje; }
    public void setIvaPorcentaje(BigDecimal ivaPorcentaje) { this.ivaPorcentaje = ivaPorcentaje; }

    public String getDescuentoDetalle() { return descuentoDetalle; }
    public void setDescuentoDetalle(String descuentoDetalle) { this.descuentoDetalle = descuentoDetalle; }

    public String getMonedaOrigen() { return monedaOrigen; }
    public void setMonedaOrigen(String monedaOrigen) { this.monedaOrigen = monedaOrigen; }

    public BigDecimal getCotizacionAplicada() { return cotizacionAplicada; }
    public void setCotizacionAplicada(BigDecimal cotizacionAplicada) { this.cotizacionAplicada = cotizacionAplicada; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
}
