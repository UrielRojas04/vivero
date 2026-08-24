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

    // Ya no se usa (Decisión de la sesión del 2026-08-20): el precio de venta ya no se pide al
    // armar el pedido, se calcula después en Productos a partir del costo. Columna dejada sin
    // uso en vez de ALTER TABLE, mismo criterio que descuentoProveedor.
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

    // ---- Costeo pactado de la línea (Decisión 8 de design.md de config-costeo-por-proveedor):
    // la línea queda auto-contenida, describe completamente cómo se llegó a su costo sin
    // depender de que el producto ni el proveedor sigan configurados igual mañana. El flujo que
    // los pide, precarga y persiste es de los grupos 7/8, fuera de alcance del grupo 5 — acá sólo
    // se agregan las columnas.

    // Moneda pactada de ESTA línea. Default ARS, mismo criterio que Producto.monedaCosto (tarea
    // 5.1): sin valor por defecto ambiguo.
    @Enumerated(EnumType.STRING)
    @Column(name = "moneda_linea", length = 3, columnDefinition = "varchar(3) default 'ARS'")
    private MonedaCosto monedaLinea = MonedaCosto.ARS;

    @Column(name = "iva_pactado_porcentaje", precision = 5, scale = 2)
    private BigDecimal ivaPactadoPorcentaje;

    @Column(name = "envio_pactado_porcentaje", precision = 5, scale = 2)
    private BigDecimal envioPactadoPorcentaje;

    // Descuento efectivo TOTAL de la línea, ya colapsado (ej. 12.00 para un único descuento de
    // 12%, o el equivalente de una cascada de varios) — añadido en el grupo 8 de tasks.md de
    // config-costeo-por-proveedor para completar el par numérico/textual que el grupo 5 dejó sólo
    // textual, mismo criterio que MovimientoStock.descuentoPorcentaje / descuentoDetalle. Es lo
    // que permite reconstruir un ProductoDescuento estructurado cuando una línea "pendiente" se
    // convierte en Producto real al confirmar la recepción (PedidoServiceImpl.confirmarRecepcion,
    // tarea 8.6) — el texto solo no alcanza para eso.
    @Column(name = "descuento_pactado_porcentaje", precision = 5, scale = 2)
    private BigDecimal descuentoPactadoPorcentaje;

    // Detalle textual de los descuentos pactados de la línea (ej. "Descuento 1: 12%; Descuento 2:
    // 5%"), mismo criterio que MovimientoStock.descuentoDetalle.
    @Column(name = "descuento_pactado_detalle", length = 500)
    private String descuentoPactadoDetalle;

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

    public MonedaCosto getMonedaLinea() { return monedaLinea; }
    public void setMonedaLinea(MonedaCosto monedaLinea) { this.monedaLinea = monedaLinea; }

    public BigDecimal getIvaPactadoPorcentaje() { return ivaPactadoPorcentaje; }
    public void setIvaPactadoPorcentaje(BigDecimal ivaPactadoPorcentaje) { this.ivaPactadoPorcentaje = ivaPactadoPorcentaje; }

    public BigDecimal getEnvioPactadoPorcentaje() { return envioPactadoPorcentaje; }
    public void setEnvioPactadoPorcentaje(BigDecimal envioPactadoPorcentaje) { this.envioPactadoPorcentaje = envioPactadoPorcentaje; }

    public BigDecimal getDescuentoPactadoPorcentaje() { return descuentoPactadoPorcentaje; }
    public void setDescuentoPactadoPorcentaje(BigDecimal descuentoPactadoPorcentaje) { this.descuentoPactadoPorcentaje = descuentoPactadoPorcentaje; }

    public String getDescuentoPactadoDetalle() { return descuentoPactadoDetalle; }
    public void setDescuentoPactadoDetalle(String descuentoPactadoDetalle) { this.descuentoPactadoDetalle = descuentoPactadoDetalle; }
}
