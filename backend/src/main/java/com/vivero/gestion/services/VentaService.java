package com.vivero.gestion.services;

import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.MovimientoStock;
import java.util.List;

public interface VentaService {
    VentaResponseDTO crearVenta(VentaRequestDTO request, String username);

    /**
     * Igual que {@link #crearVenta}, pero para cuando el stock YA salió antes (change
     * entregas-pendientes-confirmacion-vivero, Decisión 4 de design.md: confirmar una
     * EntregaPendiente). {@code movimientosPorLinea} viene ÍNDICE-ALINEADO con
     * {@code request.getDetalles()} (misma longitud, misma posición -- nunca un Map, se rompería
     * si la entrega repite el mismo producto en dos líneas): la rama Vivero/Herramientas reutiliza
     * esos {@link MovimientoStock} en vez de descontar stock de nuevo y crear uno propio; el costo
     * congelado sale de ahí. No es un endpoint HTTP (la regla de DTOs no aplica): llamada
     * servicio -> servicio. Rechaza si el tamaño no coincide con la cantidad de líneas, si algún
     * elemento es {@code null}, o si la unidad de negocio activa es Abono (la rama de
     * {@code StockAbono} no participa de este flujo).
     */
    VentaResponseDTO crearVentaConStockYaDescontado(VentaRequestDTO request, String username,
                                                     List<MovimientoStock> movimientosPorLinea);

    List<VentaResponseDTO> listarVentas();

    /**
     * Ventas de un cliente puntual, mapeadas a VentaResponseDTO (reutiliza el mismo mapeo que
     * listarVentas), filtradas por la unidad de negocio activa. Usado por la factura dinámica de
     * cliente (ClienteServiceImpl.obtenerFactura) para no duplicar el mapeo Venta -> DTO.
     */
    List<VentaResponseDTO> listarVentasPorCliente(Long clienteId);

    /**
     * Registra un pago sobre una venta YA existente (el cliente vuelve y trae plata a cuenta de
     * una venta que quedó debiendo). Recalcula el estadoPago de la venta y actualiza el saldo
     * de la cuenta corriente del cliente.
     *
     * Hasta este change el estadoPago se fijaba una única vez dentro de crearVenta y no había
     * forma de saldar una venta después: el único camino era "Ajustar Saldo", que mueve el
     * balance global sin quedar asociado a ninguna venta ni actualizar su estado.
     */
    VentaResponseDTO registrarPago(Long ventaId, PagoRequestDTO request);

    /**
     * Una venta puntual con sus items, para el botón "ver remito" (pedido puntual del dueño,
     * historial de cobros de Abono). Deliberadamente NO se filtra por CuentaAbonoContextHolder:
     * el jefe tiene que poder ver el remito de una venta cobrada por el colega y viceversa, mismo
     * criterio de vista global que ya sostiene el historial de cobros que la llama.
     */
    VentaResponseDTO obtenerPorId(Long id);
}
