package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.vivero.gestion.dto.ClienteBandejasDTO;
import com.vivero.gestion.services.BandejasService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;

// Controller propio porque BandejasController ya tiene @RequestMapping("/api/clientes/{id}/bandejas")
// y Spring no permite que un método escape del prefijo de su clase. Ruta final: GET /api/bandejas/clientes.
@RestController
@RequestMapping("/api/bandejas")
@RequiredArgsConstructor
public class BandejasClientesController {

    private final BandejasService bandejasService;

    @PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")
    @GetMapping("/clientes")
    public ResponseEntity<List<ClienteBandejasDTO>> getAll() {
        return ResponseEntity.ok(bandejasService.listarClientesParaBandejas());
    }
}
