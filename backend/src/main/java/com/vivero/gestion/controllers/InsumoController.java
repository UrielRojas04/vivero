package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.InsumoDTO;
import com.vivero.gestion.services.InsumoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/insumos")
public class InsumoController {

    private final InsumoService insumoService;

    @Autowired
    public InsumoController(InsumoService insumoService) {
        this.insumoService = insumoService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_INSUMOS')")
    public ResponseEntity<InsumoDTO> crearInsumo(@RequestBody InsumoDTO dto) {
        InsumoDTO creado = insumoService.crearInsumo(dto);
        return new ResponseEntity<>(creado, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('LEER_INSUMOS')")
    public ResponseEntity<InsumoDTO> obtenerInsumoPorId(@PathVariable Long id) {
        InsumoDTO dto = insumoService.obtenerInsumoPorId(id);
        return ResponseEntity.ok(dto);
    }

    // Para obtener todos, requerimos LEER_STOCK a nivel global o filtramos en DB.
    // Por simplicidad en este paso (como Product), no lo restringiremos dinámicamente aquí, 
    // pero requeriremos autenticación (ya lo hace global SecurityConfig).
    // Idealmente el front solo mostrará los insumos que le corresponden.
    @PreAuthorize("hasAuthority('LEER_INSUMOS')")
    @GetMapping
    public ResponseEntity<List<InsumoDTO>> obtenerTodosLosInsumos() {
        List<InsumoDTO> dtos = insumoService.obtenerTodosLosInsumos();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_INSUMOS')")
    public ResponseEntity<InsumoDTO> actualizarInsumo(@PathVariable Long id, @RequestBody InsumoDTO dto) {
        InsumoDTO actualizado = insumoService.actualizarInsumo(id, dto);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_INSUMOS')")
    public ResponseEntity<Void> eliminarInsumo(@PathVariable Long id) {
        insumoService.eliminarInsumo(id);
        return ResponseEntity.noContent().build();
    }
}
