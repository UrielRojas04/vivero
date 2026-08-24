package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

// Nota de diseño: a diferencia de Proveedor/Cliente (ABM simple, sin colección hija), Pedido tiene
// una relación bidireccional @OneToMany con PedidoDetalle. Se usan getters/setters manuales en vez
// de Lombok @Data (que generaría equals/hashCode/toString recursivos entre ambos lados y podría
// causar StackOverflowError) — mismo criterio ya aplicado en Venta/VentaDetalle de este proyecto.
@Entity
@Table(name = "pedidos")
@SQLDelete(sql = "UPDATE pedidos SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    private Proveedor proveedor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "fecha_creacion")
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_recepcion")
    private LocalDateTime fechaRecepcion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPedido estado;

    @Column(length = 500)
    private String observaciones;

    // Cotización del dólar tipeada/confirmada para ESTE pedido (Decisión 5 de design.md de
    // config-costeo-por-proveedor — OQ2). Volátil, propiedad del momento: se pide en CADA pedido
    // con líneas en USD, nunca se hereda de Proveedor.ultimaCotizacionConocida (que es sólo un
    // prellenado visible, no un fallback). El flujo que la pide y la persiste es del grupo 7,
    // fuera de alcance del grupo 5 — acá sólo se agrega la columna.
    @Column(name = "cotizacion_dolar", precision = 12, scale = 4)
    private BigDecimal cotizacionDolar;

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PedidoDetalle> detalles = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    public Pedido() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Proveedor getProveedor() { return proveedor; }
    public void setProveedor(Proveedor proveedor) { this.proveedor = proveedor; }

    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }

    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }

    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }

    public LocalDateTime getFechaRecepcion() { return fechaRecepcion; }
    public void setFechaRecepcion(LocalDateTime fechaRecepcion) { this.fechaRecepcion = fechaRecepcion; }

    public EstadoPedido getEstado() { return estado; }
    public void setEstado(EstadoPedido estado) { this.estado = estado; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public BigDecimal getCotizacionDolar() { return cotizacionDolar; }
    public void setCotizacionDolar(BigDecimal cotizacionDolar) { this.cotizacionDolar = cotizacionDolar; }

    public List<PedidoDetalle> getDetalles() { return detalles; }
    public void setDetalles(List<PedidoDetalle> detalles) { this.detalles = detalles; }

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }

    public void addDetalle(PedidoDetalle detalle) {
        detalles.add(detalle);
        detalle.setPedido(this);
    }
}
