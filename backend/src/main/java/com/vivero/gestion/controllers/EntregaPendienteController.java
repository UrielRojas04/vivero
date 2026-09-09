package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.EntregaPendienteConfirmarRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteFirmaDTO;
import com.vivero.gestion.dto.EntregaPendienteRechazoDTO;
import com.vivero.gestion.dto.EntregaPendienteRequestDTO;
import com.vivero.gestion.dto.EntregaPendienteResponseDTO;
import com.vivero.gestion.dto.EntregaPendienteResumenDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import com.vivero.gestion.services.EntregaPendienteService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Change entregas-pendientes-confirmacion-vivero, grupo 11 de tasks.md (Decisión 8/13 de
 * design.md). Los 7 endpoints del contrato HTTP, cada uno con su `@PreAuthorize` explícito desde
 * el día uno -- el antecedente concreto a no repetir es `DevolucionController`, que shippeó sin
 * ninguno. El controller NUNCA llama a un repositorio (regla dura #6): sólo a
 * `EntregaPendienteService`.
 */
@RestController
@RequestMapping("/api/entregas-pendientes")
public class EntregaPendienteController {

    private final EntregaPendienteService entregaPendienteService;

    public EntregaPendienteController(EntregaPendienteService entregaPendienteService) {
        this.entregaPendienteService = entregaPendienteService;
    }

    // ESCRIBIR_ENTREGAS: el empleado registra (Decisión 8 de design.md).
    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_ENTREGAS')")
    public ResponseEntity<EntregaPendienteResponseDTO> registrar(@RequestBody EntregaPendienteRequestDTO request,
                                                                   Authentication authentication) {
        EntregaPendienteResponseDTO response = entregaPendienteService.registrar(request, authentication.getName());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // ESCRIBIR_ENTREGAS: el empleado ve sólo lo que registró él (Decisión 10 de design.md).
    @GetMapping("/mias")
    @PreAuthorize("hasAuthority('ESCRIBIR_ENTREGAS')")
    public ResponseEntity<Page<EntregaPendienteResumenDTO>> listarMias(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        return ResponseEntity.ok(entregaPendienteService.listarMias(authentication.getName(), PageRequest.of(page, size)));
    }

    // LEER_ENTREGAS: el dueño supervisa todas las de la unidad, filtrables por estado (Decisión 8).
    @GetMapping
    @PreAuthorize("hasAuthority('LEER_ENTREGAS')")
    public ResponseEntity<Page<EntregaPendienteResumenDTO>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) EstadoEntregaPendiente estado) {
        return ResponseEntity.ok(entregaPendienteService.listarPorEstado(estado, PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('LEER_ENTREGAS')")
    public ResponseEntity<EntregaPendienteResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(entregaPendienteService.obtenerPorId(id));
    }

    // Firma consultada de a una, nunca en un listado (Decisión 6 de design.md).
    @GetMapping("/{id}/firma")
    @PreAuthorize("hasAuthority('LEER_ENTREGAS')")
    public ResponseEntity<EntregaPendienteFirmaDTO> obtenerFirma(@PathVariable Long id) {
        return ResponseEntity.ok(entregaPendienteService.obtenerFirma(id));
    }

    // Confirmar CREA una Venta: exige además ESCRIBIR_VENTAS, defensa en profundidad -- quien no
    // puede crear ventas por la puerta de adelante no debe poder crearlas por acá (Decisión 8).
    @PostMapping("/{id}/confirmar")
    @PreAuthorize("hasAuthority('LEER_ENTREGAS') and hasAuthority('ESCRIBIR_VENTAS')")
    public ResponseEntity<VentaResponseDTO> confirmar(@PathVariable Long id,
                                                        @RequestBody EntregaPendienteConfirmarRequestDTO request,
                                                        Authentication authentication) {
        VentaResponseDTO response = entregaPendienteService.confirmar(id, request, authentication.getName());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/{id}/rechazar")
    @PreAuthorize("hasAuthority('LEER_ENTREGAS')")
    public ResponseEntity<EntregaPendienteResponseDTO> rechazar(@PathVariable Long id,
                                                                  @RequestBody(required = false) EntregaPendienteRechazoDTO request,
                                                                  Authentication authentication) {
        String motivo = request != null ? request.getMotivo() : null;
        return ResponseEntity.ok(entregaPendienteService.rechazar(id, motivo, authentication.getName()));
    }
}
