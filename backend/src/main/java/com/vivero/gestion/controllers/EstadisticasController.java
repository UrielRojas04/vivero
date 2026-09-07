package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.BandejasDisponiblesDTO;
import com.vivero.gestion.dto.StockPorNegocioDTO;
import com.vivero.gestion.services.EstadisticasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/estadisticas")
public class EstadisticasController {

    private final EstadisticasService estadisticasService;

    @Autowired
    public EstadisticasController(EstadisticasService estadisticasService) {
        this.estadisticasService = estadisticasService;
    }

    @GetMapping("/stock")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_STOCK', 'ESCRIBIR_VENTAS', 'ADMIN_DB')")
    public ResponseEntity<List<StockPorNegocioDTO>> obtenerStockPorNegocio(@RequestParam Long unidadId) {
        List<StockPorNegocioDTO> dtos = estadisticasService.obtenerStockPorNegocio(unidadId);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/stock-critico")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_STOCK', 'ESCRIBIR_VENTAS', 'ADMIN_DB')")
    public ResponseEntity<List<StockPorNegocioDTO>> obtenerStockCritico(
            @RequestParam Long unidadId,
            @RequestParam(defaultValue = "10") int limit) {
        List<StockPorNegocioDTO> dtos = estadisticasService.obtenerStockCritico(unidadId, limit);
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/bandejas-disponibles")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_STOCK', 'ESCRIBIR_VENTAS', 'ADMIN_DB')")
    public ResponseEntity<List<BandejasDisponiblesDTO>> obtenerBandejasDisponibles() {
        List<BandejasDisponiblesDTO> dtos = estadisticasService.obtenerBandejasDisponibles();
        return ResponseEntity.ok(dtos);
    }
}
