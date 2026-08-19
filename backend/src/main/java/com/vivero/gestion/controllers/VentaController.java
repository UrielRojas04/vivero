package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.services.VentaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<VentaResponseDTO> crearVenta(@RequestBody VentaRequestDTO request, Authentication authentication) {
        String username = authentication.getName();
        VentaResponseDTO response = ventaService.crearVenta(request, username);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<List<VentaResponseDTO>> listarVentas() {
        List<VentaResponseDTO> ventas = ventaService.listarVentas();
        return ResponseEntity.ok(ventas);
    }

    /**
     * Registra un pago sobre una venta existente (el cliente vuelve y trae plata a cuenta de lo
     * que debía). Recalcula el estadoPago de la venta y actualiza el saldo de cuenta corriente.
     */
    @PostMapping("/{id}/pagos")
    @PreAuthorize("hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<VentaResponseDTO> registrarPago(@PathVariable Long id, @RequestBody PagoRequestDTO request) {
        return ResponseEntity.ok(ventaService.registrarPago(id, request));
    }
}
