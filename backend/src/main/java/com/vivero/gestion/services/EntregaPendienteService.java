package com.vivero.gestion.services;

import com.vivero.gestion.dto.EntregaPendienteConfirmarRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteFirmaDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.dto.EntregaPendienteResumenDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Change entregas-pendientes-confirmacion-vivero. Exclusivo de la unidad de negocio Vivero,
 * verificado en CADA método público (Decisión 9 de design.md), no sólo escondido en el menú.
 */
public interface EntregaPendienteService {

    /**
     * Registra que un cliente se llevó mercadería: descuenta stock de inmediato (Decisión 1/9) y
     * NO crea ninguna Venta. Exige un Cliente real de la agenda (Decisión 7) y la firma digital
     * del cliente (Decisión 5).
     */
    EntregaPendienteResponseDTO registrar(EntregaPendienteRequestDTO request, String username);

    /** Data-URL PNG completa de la firma, consultable de a una (Decisión 6). */
    EntregaPendienteFirmaDTO obtenerFirma(Long id);

    /**
     * Listado del dueño (LEER_ENTREGAS): todas las entregas de la unidad Vivero, opcionalmente
     * filtradas por estado, más antigua primero (Decisión de la spec). `estado == null` trae
     * todas.
     */
    Page<EntregaPendienteResumenDTO> listarPorEstado(EstadoEntregaPendiente estado, Pageable pageable);

    /** Listado propio del empleado (ESCRIBIR_ENTREGAS, Decisión 10): sólo lo que registró él. */
    Page<EntregaPendienteResumenDTO> listarMias(String username, Pageable pageable);

    /** Detalle con líneas, SIN firma (Decisión 6). */
    EntregaPendienteResponseDTO obtenerPorId(Long id);

    /**
     * Confirma una entrega PENDIENTE: exige exactamente un precio por línea (identificada por
     * detalleId, Decisión 13), arma un VentaRequestDTO y lo pasa a
     * {@code VentaService.crearVentaConStockYaDescontado} junto con los MovimientoStock ya
     * congelados de cada línea (Decisión 3/4) -- NO vuelve a descontar stock ni crea un movimiento
     * nuevo. La Venta resultante lleva la fecha y el usuario de esta confirmación (Decisión 11).
     * Si la creación de la venta falla, la transacción entera revierte y la entrega sigue
     * PENDIENTE sin venta asociada.
     */
    VentaResponseDTO confirmar(Long id, EntregaPendienteConfirmarRequestDTO request, String username);

    /**
     * Rechaza una entrega PENDIENTE: repone el stock de cada línea con un MovimientoStock
     * REVERSA_ENTREGA_PENDIENTE (Decisión 2), NO crea ninguna Venta.
     */
    EntregaPendienteResponseDTO rechazar(Long id, String motivo, String username);
}
