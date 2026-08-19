package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.vivero.gestion.dto.ProveedorDTO;
import com.vivero.gestion.services.ProveedorService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
public class ProveedorController {

    private final ProveedorService proveedorService;

    @PreAuthorize("hasAuthority('LEER_PEDIDOS')")
    @GetMapping
    public ResponseEntity<List<ProveedorDTO>> getAll() {
        return ResponseEntity.ok(proveedorService.getAll());
    }

    @PreAuthorize("hasAuthority('LEER_PEDIDOS')")
    @GetMapping("/{id}")
    public ResponseEntity<ProveedorDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(proveedorService.getById(id));
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @PostMapping
    public ResponseEntity<ProveedorDTO> create(@RequestBody ProveedorDTO dto) {
        return new ResponseEntity<>(proveedorService.create(dto), HttpStatus.CREATED);
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @PutMapping("/{id}")
    public ResponseEntity<ProveedorDTO> update(@PathVariable Long id, @RequestBody ProveedorDTO dto) {
        return ResponseEntity.ok(proveedorService.update(id, dto));
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        proveedorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
