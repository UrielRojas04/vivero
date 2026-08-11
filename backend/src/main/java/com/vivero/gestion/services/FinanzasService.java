package com.vivero.gestion.services;

import com.vivero.gestion.dto.DashboardResumenDTO;
import com.vivero.gestion.dto.VentaLiteDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface FinanzasService {
    DashboardResumenDTO resumen(LocalDateTime desde, LocalDateTime hasta);
    Page<VentaLiteDTO> listarVentas(LocalDateTime desde, LocalDateTime hasta, Pageable pageable);
}