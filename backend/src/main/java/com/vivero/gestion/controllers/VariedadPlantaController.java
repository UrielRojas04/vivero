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

import com.vivero.gestion.dto.VariedadPlantaDTO;
import com.vivero.gestion.services.VariedadPlantaService;

import lombok.RequiredArgsConstructor;

// Bug de seguridad corregido (2026-09-05, reportado por el dueño): esta clase no tenía NINGÚN
// @PreAuthorize -- cualquier usuario autenticado, sin importar sus permisos, podía crear/editar/
// borrar variedades de plantas llamando directo a la API. El único "candado" real era el botón
// del frontend (Configuracion.jsx), trivial de saltear.
//
// Bug real corregido (2026-09-05, reportado por el dueño: Samu, rol sólo con permisos de
// Siembras/Registro de Semillas, dejó de ver bandejas/variedades): la primera versión de este fix
// puso el @PreAuthorize a nivel de CLASE, así que también bloqueaba los GET -- pero SiembraForm.jsx
// necesita leer este catálogo (variedadesPlantasApi.getAll()) para el buscador de variedad al
// crear una siembra, sin que eso implique poder administrar Configuración. Los GET quedan
// abiertos a cualquier autenticado (mismo criterio que GET /api/negocios); sólo crear/editar/
// borrar exige ADMIN_DB o LEER_CONFIGURACION.
@RestController
@RequestMapping("/api/variedades-plantas")
@RequiredArgsConstructor
public class VariedadPlantaController {

    private final VariedadPlantaService service;

    @GetMapping
    public ResponseEntity<List<VariedadPlantaDTO>> obtenerTodas() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<VariedadPlantaDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(service.obtenerPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION')")
    public ResponseEntity<VariedadPlantaDTO> crear(@RequestBody VariedadPlantaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION')")
    public ResponseEntity<VariedadPlantaDTO> actualizar(@PathVariable Long id, @RequestBody VariedadPlantaDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
