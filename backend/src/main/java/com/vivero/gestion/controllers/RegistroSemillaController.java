package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.services.RegistroSemillaService;

import lombok.RequiredArgsConstructor;

// Permisos INDEPENDIENTES de Siembras (LEER_REGISTRO_SEMILLAS / ESCRIBIR_REGISTRO_SEMILLAS,
// PermisoEnum IDs 19/20). Hasta 2026-09-03 este controller reutilizaba LEER_SIEMBRAS /
// ESCRIBIR_SIEMBRAS (Decisión 8 original de openspec/changes/registro-semillas-clientes/design.md);
// el dueño pidió revertir esa decisión para poder otorgar acceso a Registro de Semillas sin
// otorgar acceso a Siembras, y viceversa -- ver la nota de revisión en design.md y el grupo 10 de
// tasks.md.
@RestController
@RequestMapping("/api/registro-semillas")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('LEER_REGISTRO_SEMILLAS')")
public class RegistroSemillaController {

    private final RegistroSemillaService registroSemillaService;

    @GetMapping
    public ResponseEntity<List<RegistroSemillaDTO>> obtenerTodos() {
        return ResponseEntity.ok(registroSemillaService.obtenerTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RegistroSemillaDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(registroSemillaService.obtenerPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_REGISTRO_SEMILLAS')")
    public ResponseEntity<RegistroSemillaDTO> crear(@RequestBody RegistroSemillaDTO dto, Authentication authentication) {
        Long usuarioId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Usuario) {
            usuarioId = ((Usuario) authentication.getPrincipal()).getId();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(registroSemillaService.crear(dto, usuarioId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_REGISTRO_SEMILLAS')")
    public ResponseEntity<RegistroSemillaDTO> actualizar(@PathVariable Long id, @RequestBody RegistroSemillaDTO dto) {
        return ResponseEntity.ok(registroSemillaService.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_REGISTRO_SEMILLAS')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        registroSemillaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/consumir")
    @PreAuthorize("hasAuthority('ESCRIBIR_REGISTRO_SEMILLAS')")
    public ResponseEntity<RegistroSemillaDTO> consumir(@PathVariable Long id) {
        return ResponseEntity.ok(registroSemillaService.consumir(id));
    }

    @GetMapping("/alertas")
    public ResponseEntity<List<RegistroSemillaDTO>> obtenerAlertas() {
        return ResponseEntity.ok(registroSemillaService.obtenerAlertas());
    }
}
