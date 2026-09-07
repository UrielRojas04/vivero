package com.vivero.gestion.services;

import com.vivero.gestion.dto.PagoHistorialAbonoDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

/**
 * Historial global de cobros de Abono (change historial-cobros-abono): lista todos los pagos
 * de la unidad Abono, de ambas cuentas juntas (Decisión 4 de design.md -- NO se particiona por
 * CuentaAbonoContextHolder).
 */
public interface HistorialCobrosAbonoService {
    Page<PagoHistorialAbonoDTO> listarHistorial(LocalDateTime desde, LocalDateTime hasta, String q, Pageable pageable);
}
