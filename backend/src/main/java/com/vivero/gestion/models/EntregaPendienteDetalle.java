package com.vivero.gestion.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

/**
 * Change entregas-pendientes-confirmacion-vivero, Decisión 12 de design.md. Una línea (producto +
 * cantidad, SIN precio ni subtotal a propósito: el precio no existe hasta la confirmación) de una
 * {@link EntregaPendiente}. Referencia al {@link MovimientoStock} que descontó el stock de esta
 * línea al registrarse (Decisión 3): es de ahí de donde sale el costo congelado que el
 * {@code VentaDetalle} va a copiar al confirmarse, sin volver a tocar stock ni crear un
 * movimiento nuevo.
 */
@Entity
@Table(name = "entrega_pendiente_detalles")
@SQLDelete(sql = "UPDATE entrega_pendiente_detalles SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class EntregaPendienteDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "entrega_id", nullable = false)
    private EntregaPendiente entrega;

    // NotFoundAction.IGNORE (hallazgo de auditoría, finding #1): mismo motivo y mismo patrón que
    // EntregaPendiente.cliente -- un Producto puede darse de baja (soft delete) después de
    // registrarse la entrega.
    @ManyToOne
    @JoinColumn(name = "producto_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private Producto producto;

    @Column(nullable = false)
    private Integer cantidad;

    // Decisión 3: el costo congelado que se copia al VentaDetalle al confirmar sale de ESTE
    // movimiento (tipo ENTREGA_PENDIENTE), no de uno nuevo creado al confirmar.
    @ManyToOne
    @JoinColumn(name = "movimiento_stock_id", nullable = false)
    private MovimientoStock movimientoStock;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    public EntregaPendienteDetalle() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public EntregaPendiente getEntrega() { return entrega; }
    public void setEntrega(EntregaPendiente entrega) { this.entrega = entrega; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public Integer getCantidad() { return cantidad; }
    public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }

    public MovimientoStock getMovimientoStock() { return movimientoStock; }
    public void setMovimientoStock(MovimientoStock movimientoStock) { this.movimientoStock = movimientoStock; }

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
