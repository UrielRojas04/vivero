package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vivero.gestion.dto.SiembraDTO;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.services.SiembraService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/siembras")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('LEER_SIEMBRAS')")
public class SiembraController {

    private final SiembraService siembraService;

    @GetMapping
    public ResponseEntity<List<SiembraDTO>> obtenerTodas() {
        return ResponseEntity.ok(siembraService.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SiembraDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(siembraService.obtenerPorId(id));
    }

    // Bug de seguridad corregido 2026-09-03: la clase sólo exigía LEER_SIEMBRAS y ningún método
    // de escritura agregaba ESCRIBIR_SIEMBRAS, así que un usuario de solo lectura podía crear,
    // editar, borrar y finalizar siembras. Cada método de escritura ahora exige explícitamente
    // ESCRIBIR_SIEMBRAS (ver SiembraControllerPermisoTest).
    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")
    public ResponseEntity<SiembraDTO> crearSiembra(@RequestBody SiembraDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(siembraService.crearSiembra(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")
    public ResponseEntity<SiembraDTO> actualizarSiembra(@PathVariable Long id, @RequestBody SiembraDTO dto) {
        return ResponseEntity.ok(siembraService.actualizarSiembra(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")
    public ResponseEntity<Void> eliminarSiembra(@PathVariable Long id) {
        siembraService.eliminarSiembra(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/finalizar")
    @PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")
    public ResponseEntity<SiembraDTO> finalizarSiembra(
            @PathVariable Long id,
            @RequestParam Long idProducto,
            @RequestParam Integer cantidad,
            Authentication authentication) {
        Long usuarioId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Usuario) {
            usuarioId = ((Usuario) authentication.getPrincipal()).getId();
        }
        return ResponseEntity.ok(siembraService.finalizarSiembra(id, idProducto, cantidad, usuarioId));
    }

    @PostMapping("/{id}/pasar-a-stock")
    @PreAuthorize("hasAuthority('ESCRIBIR_SIEMBRAS')")
    public ResponseEntity<SiembraDTO> pasarAStock(
            @PathVariable Long id,
            @RequestBody com.vivero.gestion.dto.PasarStockRequestDTO request) {
        return ResponseEntity.ok(siembraService.pasarAStock(id, request));
    }

    @GetMapping("/alertas")
    public ResponseEntity<List<SiembraDTO>> obtenerAlertas() {
        return ResponseEntity.ok(siembraService.obtenerAlertas());
    }
}
