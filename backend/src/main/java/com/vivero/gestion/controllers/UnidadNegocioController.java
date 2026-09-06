package com.vivero.gestion.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.vivero.gestion.services.UnidadNegocioService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/negocios")
@RequiredArgsConstructor
public class UnidadNegocioController {

    private final UnidadNegocioService service;

    // Sin @PreAuthorize a propósito: lo usan el login y el selector de unidad de negocio para
    // cualquier usuario autenticado, no es información sensible de por sí.
    @GetMapping
    public ResponseEntity<?> obtenerTodos() {
        return ResponseEntity.ok(service.obtenerTodasActivas());
    }

    // Bug de seguridad corregido (2026-09-05, reportado por el dueño): sin @PreAuthorize,
    // cualquier usuario autenticado podía reescribir IVA, % de envío, modelo de costo y el % de
    // reparto de Abono de cualquier unidad de negocio -- el único candado era el botón de
    // "Reparto de Ingresos" en Configuracion.jsx, trivial de saltear llamando la API directo.
    //
    // Bug real corregido (2026-09-05, reportado por el dueño): este mismo endpoint también lo usa
    // "Costos de Envío" de Herramientas (ConfiguracionHerramientas.jsx -> negociosApi.update(2)),
    // gateado en el frontend con ESCRIBIR_STOCK -- no con ADMIN_DB/LEER_CONFIGURACION. El primer
    // fix de este comentario dejó a Hernán (rol ADMIN 2 de Herramientas, tiene ESCRIBIR_STOCK
    // pero ni ADMIN_DB ni LEER_CONFIGURACION) sin poder guardar nada ahí.
    //
    // ESCRIBIR_STOCK NO se suma al OR sin más: en Vivero/Abono ese permiso lo tiene cualquiera
    // que gestione inventario (ej. COLEGA), no sólo el JEFE -- sumarlo a ciegas reabriría, para
    // esas dos unidades, el mismo agujero que este @PreAuthorize vino a cerrar (permitiría pisar
    // IVA/reparto de Abono con sólo ESCRIBIR_STOCK). Se acota a la unidad Herramientas por nombre
    // (esHerramientas(#id), no un id hardcodeado) para calzar exactamente con lo que el frontend
    // siempre permitió, sin ampliarlo a las otras dos unidades.
    @org.springframework.web.bind.annotation.PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN_DB') or hasAuthority('LEER_CONFIGURACION') or (hasAuthority('ESCRIBIR_STOCK') and @unidadNegocioServiceImpl.esHerramientas(#id))")
    public ResponseEntity<?> actualizar(@org.springframework.web.bind.annotation.PathVariable Long id, @org.springframework.web.bind.annotation.RequestBody com.vivero.gestion.dto.UnidadNegocioDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }
}
