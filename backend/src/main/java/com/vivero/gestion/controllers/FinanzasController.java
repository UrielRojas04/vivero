package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.DashboardResumenDTO;
import com.vivero.gestion.dto.VentaLiteDTO;
import com.vivero.gestion.services.FinanzasService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/finanzas")
public class FinanzasController {

    private final FinanzasService finanzasService;

    public FinanzasController(FinanzasService finanzasService) {
        this.finanzasService = finanzasService;
    }

    /**
     * Resumen de rentabilidad del período (totales de ventas, costos, ganancia neta y margen %).
     * Requiere permiso ADMIN_DB. Fechas en formato ISO (yyyy-MM-dd).
     */
    @GetMapping("/resumen")
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<DashboardResumenDTO> resumen(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate desdeEfectivo = desde != null ? desde : LocalDate.now().withDayOfMonth(1);
        LocalDate hastaEfectivo = hasta != null ? hasta : LocalDate.now();
        DashboardResumenDTO resumen = finanzasService.resumen(
                desdeEfectivo.atStartOfDay(),
                hastaEfectivo.atTime(LocalTime.MAX));
        return ResponseEntity.ok(resumen);
    }

    /**
     * Listado paginado de ventas del período (DTO compacto, sin entidades JPA).
     * Requiere permiso ADMIN_DB. Fechas en formato ISO (yyyy-MM-dd).
     */
    @GetMapping("/ventas")
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<Page<VentaLiteDTO>> listarVentas(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        LocalDate desdeEfectivo = desde != null ? desde : LocalDate.now().withDayOfMonth(1);
        LocalDate hastaEfectivo = hasta != null ? hasta : LocalDate.now();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        Page<VentaLiteDTO> ventas = finanzasService.listarVentas(
                desdeEfectivo.atStartOfDay(),
                hastaEfectivo.atTime(LocalTime.MAX),
                pageable);
        return ResponseEntity.ok(ventas);
    }
}