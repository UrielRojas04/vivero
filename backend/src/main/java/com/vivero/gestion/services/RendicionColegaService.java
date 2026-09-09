package com.vivero.gestion.services;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.dto.RendicionRequestDTO;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.vivero.gestion.dto.RendicionColegaDTO;
import com.vivero.gestion.dto.GananciaDisponibleAbonoDTO;
import com.vivero.gestion.dto.RetiroGananciaDTO;
import com.vivero.gestion.dto.RetiroGananciaRequestDTO;

public interface RendicionColegaService {
    void registrarRendicion(RendicionRequestDTO request);
    BigDecimal obtenerSaldoCajaColega();
    LiquidacionAbonoDTO obtenerLiquidacion(LocalDateTime desde, LocalDateTime hasta);
    Page<RendicionColegaDTO> obtenerHistorialRendiciones(Pageable pageable);

    /**
     * Versión sin filtro de fecha de obtenerLiquidacion: pedido del dueño (chat, no un change
     * previo) porque la pantalla "Finanzas" de Abono estaba atada a un mes/año y Sergio/Pablo no
     * operan mes a mes (a veces cobran su ganancia recién a las 2-3 meses). Mismo DTO
     * (LiquidacionAbonoDTO) y misma fórmula de reparto que obtenerLiquidacion, con rango época
     * (2000-01-01) -> ahora en vez de un desde/hasta elegido por el usuario -- mismo truco que ya
     * usan obtenerSaldoCajaColega() y obtenerGananciaDisponible(). Exclusivo de Abono; no
     * reemplaza ni modifica obtenerLiquidacion(desde, hasta), que sigue siendo usado por la
     * pestaña "Rendiciones" de RendicionColega.jsx.
     */
    LiquidacionAbonoDTO obtenerLiquidacionAcumulada();

    /**
     * Retiro de ganancia personal (change retiro-ganancia-abono): el jefe o el colega sacan
     * plata de SU PROPIA ganancia ya generada, para uso personal. Concepto independiente de
     * registrarRendicion (esa es plata operativa moviéndose ENTRE las dos cuentas). La cuenta se
     * deriva de CuentaAbonoContextHolder, igual que la dirección de una rendición -- nunca se
     * recibe en el request.
     */
    void registrarRetiroGanancia(RetiroGananciaRequestDTO request);

    /**
     * Historial de retiros de ganancia, GLOBAL (ambas cuentas juntas, sin partición por
     * CuentaAbonoContextHolder) -- mismo criterio que historial-cobros-abono: quien tiene
     * LEER_FINANZAS ya ve la liquidación completa de las dos cuentas.
     */
    Page<RetiroGananciaDTO> obtenerHistorialRetirosGanancia(Pageable pageable);

    /**
     * Ganancia disponible acumulada de cada cuenta: su ganancia teórica acumulada (misma fórmula
     * que obtenerLiquidacion, sin acotar por fecha) menos los retiros ya registrados. Puede dar
     * negativo (sobre-retiro permitido, sin bloqueo -- Decisión 4 de design.md).
     */
    GananciaDisponibleAbonoDTO obtenerGananciaDisponible();
}
