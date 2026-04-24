package com.vivero.gestion.controllers;

import com.vivero.gestion.models.Ubicacion;
import com.vivero.gestion.repositories.UbicacionRepository;
import com.vivero.gestion.repositories.BandejaRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/ubicaciones")
public class UbicacionController {

    @Autowired private UbicacionRepository repository;
    @Autowired private BandejaRepository bandejaRepository;

    @GetMapping
    public List<Ubicacion> listar() {
        return repository.findAll();
    }

    // DIAGNÓSTICO: Si ves este mensaje en la consola negra/IntelliJ, el código está funcionando
    @PostMapping
    public ResponseEntity<Ubicacion> crear(@RequestBody Ubicacion ubicacion) {
        System.out.println(">>> Intentando crear nueva zona: " + ubicacion.getNombre());
        try {
            if (ubicacion.getBloqueada() == null) ubicacion.setBloqueada(false);
            if (ubicacion.getCapacidadMax() == null) ubicacion.setCapacidadMax(100);

            Ubicacion nueva = repository.save(ubicacion);
            return ResponseEntity.status(HttpStatus.CREATED).body(nueva);
        } catch (Exception e) {
            System.err.println("Error al crear zona: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Transactional
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Ubicacion detalles) {
        try {
            Ubicacion u = repository.findById(id)
                    .orElseThrow(() -> new RuntimeException("No existe la ubicación ID: " + id));

            Integer stock = bandejaRepository.sumCantidadByUbicacionId(id);
            int totalStock = (stock != null) ? stock : 0;

            boolean yaEstabaBloqueada = Boolean.TRUE.equals(u.getBloqueada());
            boolean quiereBloquear = Boolean.TRUE.equals(detalles.getBloqueada());

            if (quiereBloquear && !yaEstabaBloqueada && totalStock > 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("{\"message\": \"No se puede bloquear: hay " + totalStock + " bandejas activas.\"}");
            }

            if (detalles.getNombre() != null) u.setNombre(detalles.getNombre());
            if (detalles.getTipo() != null) u.setTipo(detalles.getTipo());
            if (detalles.getCapacidadMax() != null) u.setCapacidadMax(detalles.getCapacidadMax());
            u.setBloqueada(quiereBloquear);

            return ResponseEntity.ok(repository.save(u));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"message\": \"Error al actualizar: " + e.getMessage() + "\"}");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            if (bandejaRepository.existsByUbicacionId(id)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body("{\"message\": \"No se puede borrar: tiene historial vinculado.\"}");
            }
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}