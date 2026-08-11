package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.GastoDTO;
import com.vivero.gestion.services.GastoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gastos")
public class GastoController {

    @Autowired
    private GastoService gastoService;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<Page<GastoDTO>> listarGastos(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(gastoService.listarGastos(q, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "fecha"))));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN_DB')")
    public ResponseEntity<GastoDTO> crearGasto(@RequestBody GastoDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gastoService.crearGasto(dto));
    }
}
