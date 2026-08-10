package com.vivero.gestion.controllers;

import java.util.List;

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

import com.vivero.gestion.dto.PermisoDTO;
import com.vivero.gestion.dto.RolDTO;
import com.vivero.gestion.dto.RolRequestDTO;
import com.vivero.gestion.services.RolService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ADMIN_DB')")
public class RolController {

    private final RolService rolService;

    @GetMapping
    public ResponseEntity<List<RolDTO>> getAll() {
        return ResponseEntity.ok(rolService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RolDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(rolService.getById(id));
    }

    @PostMapping
    public ResponseEntity<RolDTO> create(@RequestBody RolRequestDTO dto) {
        return ResponseEntity.ok(rolService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RolDTO> update(@PathVariable Long id, @RequestBody RolRequestDTO dto) {
        return ResponseEntity.ok(rolService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        rolService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/permisos")
    public ResponseEntity<List<PermisoDTO>> getPermisos() {
        return ResponseEntity.ok(rolService.getAllPermisos());
    }
}
