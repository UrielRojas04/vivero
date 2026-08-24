package com.vivero.gestion.dto;

import java.math.BigDecimal;

import com.vivero.gestion.models.MonedaCosto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PedidoDetalleDTO {
    private Long id;
    private Long productoId;
    private String productoNombre;
    // Presente sólo cuando productoId es null (línea "pendiente de crear" — grupo 13 de
    // tasks.md, reemplaza la Decisión 3 original): nombre capturado al armar el pedido, usado
    // recién en confirmarRecepcion() para dar de alta el Producto real.
    private String productoNombreNuevo;
    // Ya no se usa (Decisión de la sesión del 2026-08-20): el precio de venta ya no se pide al
    // armar el pedido. Se mantiene el campo para no romper el DTO/columna, ver PedidoDetalle.
    private BigDecimal productoPrecioNuevo;
    private Integer cantidadPedida;
    private BigDecimal costoUnitarioPactado;
    // null mientras el pedido está PENDIENTE (todavía no se confirmó recepción de este ítem);
    // entero >= 0 una vez confirmado.
    private Integer cantidadRecibida;
    // Calculado en el mapeo a DTO, nunca persistido (Decisión 1 de design.md):
    // max(0, cantidadPedida - COALESCE(cantidadRecibida, 0)). null si cantidadRecibida es null.
    private Integer cantidadPendiente;

    // ---- Costeo pactado de la línea (Decisión 8 de design.md de config-costeo-por-proveedor,
    // grupo 7/8 de tasks.md). Default ARS, mismo criterio que Producto.monedaCosto — sin valor
    // por defecto ambiguo.
    @Builder.Default
    private MonedaCosto monedaLinea = MonedaCosto.ARS;
    private BigDecimal ivaPactadoPorcentaje;
    private BigDecimal envioPactadoPorcentaje;
    // Único % efectivo ya colapsado (ej. 12.00), y su detalle textual — mismo par que
    // MovimientoStock.descuentoPorcentaje/descuentoDetalle. El numérico es lo que permite
    // reconstruir el ProductoDescuento de un producto nacido de una línea pendiente (tarea 8.6).
    private BigDecimal descuentoPactadoPorcentaje;
    private String descuentoPactadoDetalle;
}
