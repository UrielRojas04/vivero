package com.vivero.gestion.dto;

import java.math.BigDecimal;

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
    // Presentes sólo cuando productoId es null (línea "pendiente de crear" — grupo 13 de
    // tasks.md, reemplaza la Decisión 3 original): nombre y precio de venta capturados al armar
    // el pedido, usados recién en confirmarRecepcion() para dar de alta el Producto real.
    private String productoNombreNuevo;
    private BigDecimal productoPrecioNuevo;
    private Integer cantidadPedida;
    private BigDecimal costoUnitarioPactado;
    // null mientras el pedido está PENDIENTE (todavía no se confirmó recepción de este ítem);
    // entero >= 0 una vez confirmado.
    private Integer cantidadRecibida;
    // Calculado en el mapeo a DTO, nunca persistido (Decisión 1 de design.md):
    // max(0, cantidadPedida - COALESCE(cantidadRecibida, 0)). null si cantidadRecibida es null.
    private Integer cantidadPendiente;
}
