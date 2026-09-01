package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.CategoriaAbonoDTO;
import com.vivero.gestion.services.CategoriaAbonoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias-abono")
public class CategoriaAbonoController {

    private final CategoriaAbonoService service;

    @Autowired
    public CategoriaAbonoController(CategoriaAbonoService service) {
        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<CategoriaAbonoDTO> crear(@RequestBody CategoriaAbonoDTO dto) {
        return new ResponseEntity<>(service.crear(dto), HttpStatus.CREATED);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('LEER_STOCK')")
    public ResponseEntity<List<CategoriaAbonoDTO>> obtenerTodas() {
        return ResponseEntity.ok(service.obtenerTodas());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<CategoriaAbonoDTO> actualizar(@PathVariable Long id, @RequestBody CategoriaAbonoDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
