package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.ChequeDTO;
import com.vivero.gestion.services.ChequeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cheques")
public class ChequeController {

    @Autowired
    private ChequeService chequeService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<Page<ChequeDTO>> listarCheques(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(chequeService.listarCheques(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<ChequeDTO> obtenerCheque(@PathVariable Long id) {
        return ResponseEntity.ok(chequeService.obtenerPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<ChequeDTO> crearCheque(@RequestBody ChequeDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(chequeService.crearCheque(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<ChequeDTO> actualizarCheque(@PathVariable Long id, @RequestBody ChequeDTO dto) {
        return ResponseEntity.ok(chequeService.actualizarEstado(id, dto));
    }
}
