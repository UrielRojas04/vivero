package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.PagoHistorialAbonoDTO;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.CuentaAbonoNombres;
import com.vivero.gestion.services.HistorialCobrosAbonoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Deliberadamente NO importa ni referencia CuentaAbonoContextHolder (Decisión 4 de design.md de
 * historial-cobros-abono): esto es un historial de auditoría, no una vista operativa -- el jefe
 * y el colega deben ver exactamente los mismos cobros, de ambas cuentas juntas, sin importar cuál
 * cuenta esté activa en la sesión. Guard de este comportamiento: HistorialCobrosAbonoServiceTest
 * #listarHistorialEsIdenticoParaJefeYColega (tarea 5.6 de tasks.md).
 */
@Service
public class HistorialCobrosAbonoServiceImpl implements HistorialCobrosAbonoService {

    private final PagoRepository pagoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    public HistorialCobrosAbonoServiceImpl(PagoRepository pagoRepository,
                                            UnidadNegocioRepository unidadNegocioRepository) {
        this.pagoRepository = pagoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PagoHistorialAbonoDTO> listarHistorial(LocalDateTime desde, LocalDateTime hasta, String q, Pageable pageable) {
        UnidadNegocio abono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new RuntimeException("Unidad de negocio Abono no encontrada"));

        return pagoRepository.listarHistorialCobros(abono.getId(), desde, hasta, q, pageable)
                .map(dto -> {
                    dto.setCobradoPor(CuentaAbonoNombres.nombreVisible(dto.getCuentaAbono()));
                    dto.setOrigen(dto.getVentaId() != null ? "VENTA" : "CUENTA_CORRIENTE");
                    return dto;
                });
    }
}
