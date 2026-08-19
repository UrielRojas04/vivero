package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.DevolucionBandejasDTO;
import com.vivero.gestion.dto.HistorialBandejasDTO;
import com.vivero.gestion.services.BandejasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes/{id}/bandejas")
public class BandejasController {

    @Autowired
    private BandejasService bandejasService;

    @GetMapping("/historial")
    @PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_BANDEJAS')")
    public ResponseEntity<List<HistorialBandejasDTO>> obtenerHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(bandejasService.obtenerHistorialPorCliente(id));
    }

    @PostMapping("/devolucion")
    @PreAuthorize("hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_BANDEJAS')")
    public ResponseEntity<Void> registrarDevolucion(@PathVariable Long id, @RequestBody DevolucionBandejasDTO request, Authentication authentication) {
        bandejasService.registrarDevolucion(id, request.getCantidad(), authentication.getName());
        return ResponseEntity.ok().build();
    }
}
