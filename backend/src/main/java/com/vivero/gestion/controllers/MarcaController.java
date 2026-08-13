package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.MarcaDTO;
import com.vivero.gestion.services.MarcaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/marcas")
@CrossOrigin(origins = "*")
public class MarcaController {

    private final MarcaService marcaService;

    @Autowired
    public MarcaController(MarcaService marcaService) {
        this.marcaService = marcaService;
    }

    @GetMapping
    public ResponseEntity<List<MarcaDTO>> obtenerTodasLasMarcas() {
        return ResponseEntity.ok(marcaService.obtenerTodasLasMarcas());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<MarcaDTO> crearMarca(@RequestBody MarcaDTO dto) {
        MarcaDTO creada = marcaService.crearMarca(dto);
        return new ResponseEntity<>(creada, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<MarcaDTO> actualizarMarca(@PathVariable Long id, @RequestBody MarcaDTO dto) {
        return ResponseEntity.ok(marcaService.actualizarMarca(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<Void> eliminarMarca(@PathVariable Long id) {
        marcaService.eliminarMarca(id);
        return ResponseEntity.noContent().build();
    }
}
