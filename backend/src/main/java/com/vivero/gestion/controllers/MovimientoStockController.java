package com.vivero.gestion.controllers;

import com.vivero.gestion.models.MovimientoStock;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/movimientos-stock")
public class MovimientoStockController {

    private final MovimientoStockRepository movimientoStockRepository;

    public MovimientoStockController(MovimientoStockRepository movimientoStockRepository) {
        this.movimientoStockRepository = movimientoStockRepository;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('LEER_STOCK')")
    public ResponseEntity<List<MovimientoStock>> listarMovimientos() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<MovimientoStock> movimientos = (unidadId != null)
                ? movimientoStockRepository.findAllByUnidadNegocioIdOrderByFechaDesc(unidadId)
                : movimientoStockRepository.findAll();
        
        return ResponseEntity.ok(movimientos);
    }
}
