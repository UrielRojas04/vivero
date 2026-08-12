package com.vivero.gestion.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.vivero.gestion.services.UnidadNegocioService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/negocios")
@RequiredArgsConstructor
public class UnidadNegocioController {
    
    private final UnidadNegocioService service;

    @GetMapping
    public ResponseEntity<?> obtenerTodos() {
        return ResponseEntity.ok(service.obtenerTodasActivas());
    }

    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@org.springframework.web.bind.annotation.PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody com.vivero.gestion.dto.UnidadNegocioDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }
}
