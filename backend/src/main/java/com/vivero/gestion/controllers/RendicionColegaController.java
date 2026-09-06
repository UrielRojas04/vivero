package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.LiquidacionAbonoDTO;
import com.vivero.gestion.services.RendicionColegaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.vivero.gestion.dto.RendicionRequestDTO;
import com.vivero.gestion.dto.RendicionColegaDTO;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@RestController
@RequestMapping("/api/abono/rendiciones")
public class RendicionColegaController {

    private final RendicionColegaService rendicionService;

    @Autowired
    public RendicionColegaController(RendicionColegaService rendicionService) {
        this.rendicionService = rendicionService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<Void> registrarRendicion(@RequestBody RendicionRequestDTO request) {
        rendicionService.registrarRendicion(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<Page<RendicionColegaDTO>> obtenerHistorialRendiciones(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(rendicionService.obtenerHistorialRendiciones(PageRequest.of(page, size)));
    }

    @GetMapping("/caja-colega")
    @PreAuthorize("hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<BigDecimal> obtenerSaldoCajaColega() {
        return ResponseEntity.ok(rendicionService.obtenerSaldoCajaColega());
    }

    // La liquidación expone cuánto gana/tiene cada socio (ingresosJefe, ingresosColega,
    // compensacionTeorica en LiquidacionAbonoDTO) — es información financiera, no operativa.
    // ESCRIBIR_VENTAS lo tiene cualquiera que carga una venta; se exige el mismo permiso
    // financiero que ya protege Finanzas.jsx (ChequeController, GastoController,
    // FinanzasController), en vez de crear uno nuevo.
    @GetMapping("/liquidacion")
    @PreAuthorize("hasAuthority('LEER_FINANZAS')")
    public ResponseEntity<LiquidacionAbonoDTO> obtenerLiquidacion(
            @RequestParam("desde") String desdeStr,
            @RequestParam("hasta") String hastaStr) {
        
        DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
        LocalDateTime desde = LocalDateTime.parse(desdeStr, formatter);
        LocalDateTime hasta = LocalDateTime.parse(hastaStr, formatter);
        
        return ResponseEntity.ok(rendicionService.obtenerLiquidacion(desde, hasta));
    }
}
