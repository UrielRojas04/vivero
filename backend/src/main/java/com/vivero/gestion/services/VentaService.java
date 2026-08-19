package com.vivero.gestion.services;

import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import java.util.List;

public interface VentaService {
    VentaResponseDTO crearVenta(VentaRequestDTO request, String username);
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
}
