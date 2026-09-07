package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.PagoHistorialAbonoDTO;
import com.vivero.gestion.services.HistorialCobrosAbonoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Historial global de cobros de Abono (change historial-cobros-abono): sólo lectura, delega en
 * HistorialCobrosAbonoService -- NUNCA toca PagoRepository directamente (regla dura #6,
 * Controller -> Service -> Repository -> Model).
 */
@RestController
@RequestMapping("/api/abono/cobros")
public class HistorialCobrosAbonoController {

    private final HistorialCobrosAbonoService historialCobrosAbonoService;

    @Autowired
    public HistorialCobrosAbonoController(HistorialCobrosAbonoService historialCobrosAbonoService) {
        this.historialCobrosAbonoService = historialCobrosAbonoService;
    }

    // LEER_FINANZAS: mismo permiso financiero que ya protege Cheques, Finanzas y la liquidación
    // de Abono (Decisión 5 de design.md) -- reservado a administradores de cada unidad, no se
    // crea un permiso nuevo.
    @GetMapping
    @PreAuthorize("hasAuthority('LEER_FINANZAS')")
    public ResponseEntity<Page<PagoHistorialAbonoDTO>> listarHistorial(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String q) {

        LocalDateTime desdeFecha = (desde != null && !desde.isBlank())
                ? LocalDate.parse(desde).atStartOfDay()
                : null;
        LocalDateTime hastaFecha = (hasta != null && !hasta.isBlank())
                ? LocalDate.parse(hasta).atTime(23, 59, 59)
                : null;

        return ResponseEntity.ok(historialCobrosAbonoService.listarHistorial(
                desdeFecha, hastaFecha, q, PageRequest.of(page, size)));
    }
}
