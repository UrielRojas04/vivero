package com.vivero.gestion.services;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.dto.RendicionRequestDTO;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.vivero.gestion.dto.RendicionColegaDTO;

public interface RendicionColegaService {
    void registrarRendicion(RendicionRequestDTO request);
    BigDecimal obtenerSaldoCajaColega();
    LiquidacionAbonoDTO obtenerLiquidacion(LocalDateTime desde, LocalDateTime hasta);
    Page<RendicionColegaDTO> obtenerHistorialRendiciones(Pageable pageable);
}
