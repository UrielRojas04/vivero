package com.vivero.gestion.controllers;

import com.vivero.gestion.models.Variedad;
import com.vivero.gestion.repositories.BandejaRepository; // Inyección necesaria
import com.vivero.gestion.services.VariedadService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/variedades")
public class VariedadController {

    @Autowired
    private VariedadService service;

    @Autowired
    private BandejaRepository bandejaRepository; // Para verificar integridad

    @GetMapping
    public List<Variedad> listar() {
        return service.listarTodas();
    }

    @PostMapping
    public ResponseEntity<Variedad> crear(@Valid @RequestBody Variedad variedad) {
        return ResponseEntity.ok(service.guardar(variedad));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        // VALIDACIÓN DE INTEGRIDAD
        if (bandejaRepository.existsByVariedadId(id)) {
            return ResponseEntity.badRequest()
                    .body("No se puede eliminar la variedad porque tiene bandejas asociadas en el sistema.");
        }
        service.eliminar(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Variedad> actualizar(@PathVariable Long id, @RequestBody Variedad variedad) {
        variedad.setId(id);
        return ResponseEntity.ok(service.guardar(variedad));
    }
}