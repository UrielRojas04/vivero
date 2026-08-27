package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.FacturaClienteDTO;
import com.vivero.gestion.dto.FacturaConceptoDTO;
import com.vivero.gestion.services.FacturaClienteService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/facturas")
public class FacturaClienteController {

    private final FacturaClienteService facturaService;

    public FacturaClienteController(FacturaClienteService facturaService) {
        this.facturaService = facturaService;
    }

    @PostMapping("/cliente/{clienteId}/abrir")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<FacturaClienteDTO> abrirFacturaManual(@PathVariable Long clienteId) {
        return ResponseEntity.ok(facturaService.abrirFacturaManual(clienteId));
    }

    @GetMapping("/cliente/{clienteId}/activa")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('LEER_CLIENTES')")
    public ResponseEntity<FacturaClienteDTO> obtenerFacturaActiva(@PathVariable Long clienteId) {
        FacturaClienteDTO factura = facturaService.obtenerFacturaActiva(clienteId);
        if (factura == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(factura);
    }

    @GetMapping("/cliente/{clienteId}/historial")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('LEER_CLIENTES')")
    public ResponseEntity<List<FacturaClienteDTO>> listarHistorial(@PathVariable Long clienteId) {
        return ResponseEntity.ok(facturaService.listarHistorialFacturas(clienteId));
    }

    @PostMapping("/{facturaId}/conceptos")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<FacturaClienteDTO> agregarConcepto(@PathVariable Long facturaId, @RequestBody FacturaConceptoDTO request) {
        return ResponseEntity.ok(facturaService.agregarConcepto(facturaId, request));
    }

    @PostMapping("/{facturaId}/pagos")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<FacturaClienteDTO> registrarPago(@PathVariable Long facturaId, @RequestBody com.vivero.gestion.dto.PagoRequestDTO request) {
        return ResponseEntity.ok(facturaService.registrarPago(facturaId, request));
    }

    @PostMapping("/{facturaId}/cerrar")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<FacturaClienteDTO> cerrarFactura(@PathVariable Long facturaId) {
        return ResponseEntity.ok(facturaService.cerrarFactura(facturaId));
    }

    @PutMapping("/pagos/{pagoId}/rechazar")
    @PreAuthorize("hasAuthority('LEER_FACTURACION') and hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<Void> rechazarPago(@PathVariable Long pagoId) {
        facturaService.rechazarPago(pagoId);
        return ResponseEntity.ok().build();
    }
}
