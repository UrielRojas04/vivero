package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.StockConsolidadoAbonoDTO;
import com.vivero.gestion.services.StockAbonoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

@RestController
@RequestMapping("/api/abono/stock")
public class StockAbonoController {

    private final StockAbonoService stockAbonoService;

    @Autowired
    public StockAbonoController(StockAbonoService stockAbonoService) {
        this.stockAbonoService = stockAbonoService;
    }

    @GetMapping("/consolidado")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION')")
    public ResponseEntity<List<StockConsolidadoAbonoDTO>> obtenerStockConsolidado() {
        return ResponseEntity.ok(stockAbonoService.obtenerStockConsolidado());
    }

    @PostMapping("/produccion")
    @PreAuthorize("hasAuthority('ESCRIBIR_PRODUCCION')")
    public ResponseEntity<Void> registrarProduccion(@RequestBody com.vivero.gestion.dto.StockAbonoRequestDTO request) {
        stockAbonoService.registrarProduccion(request.getProductoId(), request.getCantidad());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/traslados")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<Void> registrarTraslado(@RequestBody com.vivero.gestion.dto.StockAbonoRequestDTO request) {
        stockAbonoService.registrarTraslado(request.getProductoId(), request.getCantidad(), request.getDireccion());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ajustes")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<Void> registrarAjuste(@RequestBody com.vivero.gestion.dto.StockAbonoRequestDTO request) {
        stockAbonoService.registrarAjuste(request.getProductoId(), request.getCantidad(), request.getCuenta());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/historial")
    @PreAuthorize("hasAnyAuthority('LEER_STOCK', 'ESCRIBIR_PRODUCCION')")
    public ResponseEntity<Page<com.vivero.gestion.dto.MovimientoStockAbonoDTO>> obtenerHistorialGlobal(
            @RequestParam(required = false) List<com.vivero.gestion.models.TipoMovimientoStockAbono> tipos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(stockAbonoService.obtenerHistorialMovimientos(null, tipos, PageRequest.of(page, size)));
    }

    @GetMapping("/movimientos/{productoId}")
    @PreAuthorize("hasAuthority('LEER_STOCK')")
    public ResponseEntity<Page<com.vivero.gestion.dto.MovimientoStockAbonoDTO>> obtenerHistorialPorProducto(
            @PathVariable Long productoId,
            @RequestParam(required = false) List<com.vivero.gestion.models.TipoMovimientoStockAbono> tipos,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(stockAbonoService.obtenerHistorialMovimientos(productoId, tipos, PageRequest.of(page, size)));
    }
}
