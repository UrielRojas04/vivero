package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "pedido_detalles")
public class PedidoDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pedido_id")
    private Pedido pedido;

    // Nullable a propósito (grupo 13 de tasks.md, reemplaza la Decisión 3 original de design.md):
    // null == "línea pendiente de crear producto", se resuelve recién en confirmarRecepcion().
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = true)
    private Producto producto;

    // Datos mínimos de un producto "pendiente de crear", usados sólo mientras producto es null.
    // El Producto real se crea en PedidoServiceImpl.confirmarRecepcion(), únicamente si la línea
    // recibe cantidadRecibida > 0 — ver grupo 13 de tasks.md.
    @Column(name = "producto_nombre_nuevo")
    private String productoNombreNuevo;

    @Column(name = "producto_precio_nuevo", precision = 12, scale = 2)
    private BigDecimal productoPrecioNuevo;

    @Column(name = "cantidad_pedida", nullable = false)
    private Integer cantidadPedida;

    @Column(name = "costo_unitario_pactado", precision = 12, scale = 2)
    private BigDecimal costoUnitarioPactado;

    // Nullable a propósito, SIN valor por defecto: null == "todavía no se confirmó la recepción
    // de este ítem"; 0 == "se confirmó y no llegó nada". Ver Decisión 1 de design.md — confundir
    // ambos casos rompe el requisito de remanente visible.
    @Column(name = "cantidad_recibida")
    private Integer cantidadRecibida;

    public PedidoDetalle() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public String getProductoNombreNuevo() { return productoNombreNuevo; }
    public void setProductoNombreNuevo(String productoNombreNuevo) { this.productoNombreNuevo = productoNombreNuevo; }

    public BigDecimal getProductoPrecioNuevo() { return productoPrecioNuevo; }
    public void setProductoPrecioNuevo(BigDecimal productoPrecioNuevo) { this.productoPrecioNuevo = productoPrecioNuevo; }

    public Integer getCantidadPedida() { return cantidadPedida; }
    public void setCantidadPedida(Integer cantidadPedida) { this.cantidadPedida = cantidadPedida; }

    public BigDecimal getCostoUnitarioPactado() { return costoUnitarioPactado; }
    public void setCostoUnitarioPactado(BigDecimal costoUnitarioPactado) { this.costoUnitarioPactado = costoUnitarioPactado; }

    public Integer getCantidadRecibida() { return cantidadRecibida; }
    public void setCantidadRecibida(Integer cantidadRecibida) { this.cantidadRecibida = cantidadRecibida; }
}
