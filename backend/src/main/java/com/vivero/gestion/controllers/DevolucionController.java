package com.vivero.gestion.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vivero.gestion.dto.DevolucionProductoDTO;
import com.vivero.gestion.services.DevolucionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/devoluciones")
@RequiredArgsConstructor
public class DevolucionController {

    private final DevolucionService devolucionService;

    // Bug real corregido (2026-09-08, hallado al revisar visibilidad por negocio): este endpoint
    // no tenía NINGÚN chequeo de permiso -- cualquier usuario autenticado, de cualquier negocio,
    // podía llamarlo y modificar stock/saldo de un cliente. Mismos permisos que ya usa el POST de
    // devolución de bandejas en BandejasController, por ser la misma familia de acción.
    @PreAuthorize("hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_BANDEJAS')")
    @PostMapping
    public ResponseEntity<Void> registrarDevolucionLlenas(@RequestBody DevolucionProductoDTO dto) {
        devolucionService.registrarDevolucionLlenas(dto);
        return ResponseEntity.ok().build();
    }
}
