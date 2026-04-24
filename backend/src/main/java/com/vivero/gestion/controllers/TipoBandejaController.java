package com.vivero.gestion.controllers;

import com.vivero.gestion.models.TipoBandeja;
import com.vivero.gestion.repositories.TipoBandejaRepository;
import com.vivero.gestion.repositories.BandejaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tipos-bandeja")
public class TipoBandejaController {

    @Autowired
    private TipoBandejaRepository repository;

    @Autowired
    private BandejaRepository bandejaRepository;

    @GetMapping
    public List<TipoBandeja> listar() {
        return repository.findAll();
    }

    @PostMapping
    public TipoBandeja guardar(@RequestBody TipoBandeja tipo) {
        return repository.save(tipo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        // VALIDACIÓN DE INTEGRIDAD
        if (bandejaRepository.existsByTipoBandejaId(id)) {
            return ResponseEntity.badRequest()
                    .body("No se puede eliminar este tipo de bandeja porque hay siembras que lo utilizan.");
        }
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}