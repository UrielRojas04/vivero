package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.DevolucionBandejasDTO;
import com.vivero.gestion.dto.HistorialBandejasDTO;
import com.vivero.gestion.services.BandejasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes/{id}/bandejas")
public class BandejasController {

    @Autowired
    private BandejasService bandejasService;

    @GetMapping("/historial")
    public ResponseEntity<List<HistorialBandejasDTO>> obtenerHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(bandejasService.obtenerHistorialPorCliente(id));
    }

    @PostMapping("/devolucion")
    public ResponseEntity<Void> registrarDevolucion(@PathVariable Long id, @RequestBody DevolucionBandejasDTO request, Authentication authentication) {
        bandejasService.registrarDevolucion(id, request.getCantidad(), authentication.getName());
        return ResponseEntity.ok().build();
    }
}
