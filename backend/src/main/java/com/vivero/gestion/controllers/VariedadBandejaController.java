package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vivero.gestion.dto.VariedadBandejaDTO;
import com.vivero.gestion.services.VariedadBandejaService;

import lombok.RequiredArgsConstructor;

// Bug de seguridad corregido (2026-09-05, ver mismo comentario en VariedadPlantaController):
// sin @PreAuthorize, cualquier usuario autenticado podía crear/editar/borrar tipos de bandeja.
//
// Bug real corregido (2026-09-05, reportado por el dueño: Samu dejó de ver bandejas/variedades
// -- ver mismo comentario en VariedadPlantaController): el @PreAuthorize de clase bloqueaba
// también los GET, que SiembraForm.jsx necesita leer (variedadesBandejasApi.getAll()) para
// sugerir bandejas al crear una siembra. Los GET quedan abiertos a cualquier autenticado; sólo
// crear/editar/borrar exige ADMIN_DB o LEER_CONFIGURACION.
@RestController
@RequestMapping("/api/variedades-bandejas")
@RequiredArgsConstructor
public class VariedadBandejaController {

    private final VariedadBandejaService service;

    @GetMapping
    public ResponseEntity<List<VariedadBandejaDTO>> obtenerTodas() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<VariedadBandejaDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtenerPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION')")
    public ResponseEntity<VariedadBandejaDTO> crear(@RequestBody VariedadBandejaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION')")
    public ResponseEntity<VariedadBandejaDTO> actualizar(@PathVariable Long id, @RequestBody VariedadBandejaDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
