package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.dto.CuentaCorrienteDTO;
import com.vivero.gestion.services.ClienteService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    // Ampliado 2026-09-03 (pedido del dueño): además de LEER_CLIENTES, lo pueden llamar
    // LEER_SIEMBRAS (buscador de "dueño de lote" en SiembraForm.jsx), LEER_REGISTRO_SEMILLAS
    // (buscador de cliente en RegistroSemillaForm.jsx) y ESCRIBIR_VENTAS (buscador de cliente en
    // NuevaVenta.jsx -- la sección "Ventas" del modal de roles ya NO empaqueta LEER_CLIENTES, así
    // que sin esto un rol de sólo Ventas no podría buscar clientes al cargar una venta). Ninguno
    // de esos formularios muestra el saldo, así que no hay exposición visual de datos financieros
    // pese a que ClienteDTO trae el balance completo en la respuesta.
    @PreAuthorize("hasAnyAuthority('LEER_CLIENTES', 'LEER_SIEMBRAS', 'LEER_REGISTRO_SEMILLAS', 'ESCRIBIR_VENTAS')")
    @GetMapping
    public ResponseEntity<List<ClienteDTO>> getAll() {
        return ResponseEntity.ok(clienteService.getAll());
    }

    @PreAuthorize("hasAuthority('LEER_CLIENTES')")
    @GetMapping("/{id}")
    public ResponseEntity<ClienteDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.getById(id));
    }

    // Ampliado 2026-09-05 (pedido del dueño): además de ESCRIBIR_CLIENTES, lo pueden llamar
    // ESCRIBIR_SIEMBRAS y ESCRIBIR_REGISTRO_SEMILLAS -- los buscadores de "dueño"/"quién trajo"
    // de SiembraForm.jsx y RegistroSemillaForm.jsx ahora ofrecen crear un cliente real al vuelo
    // (sólo nombre + teléfono, que es literalmente todo el modelo de Cliente hoy) en vez de
    // resignarse siempre al nombre libre. Mismo criterio que ya usa el GET de acá arriba.
    // Ampliado de nuevo (clientes-dni-cuil, Decisión 4 de design.md): se suma ESCRIBIR_VENTAS --
    // el buscador de cliente de NuevaVenta.jsx ahora también crea un cliente al vuelo, y un rol
    // de sólo Ventas necesita poder darlo de alta sin depender de otro rol (el GET de acá arriba
    // ya incluía ESCRIBIR_VENTAS: Ventas podía leer la agenda pero no crear -- esto cierra esa
    // asimetría). No se crea ningún permiso nuevo, DataInitializer no se toca.
    @PreAuthorize("hasAnyAuthority('ESCRIBIR_CLIENTES', 'ESCRIBIR_SIEMBRAS', 'ESCRIBIR_REGISTRO_SEMILLAS', 'ESCRIBIR_VENTAS')")
    @PostMapping
    public ResponseEntity<ClienteDTO> create(@RequestBody ClienteDTO clienteDTO) {
        return new ResponseEntity<>(clienteService.create(clienteDTO), HttpStatus.CREATED);
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_CLIENTES')")
    @PutMapping("/{id}")
    public ResponseEntity<ClienteDTO> update(@PathVariable Long id, @RequestBody ClienteDTO clienteDTO) {
        return ResponseEntity.ok(clienteService.update(id, clienteDTO));
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_CLIENTES')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        clienteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_CLIENTES')")
    @PostMapping("/{id}/saldo/ajuste")
    public ResponseEntity<ClienteDTO> ajustarSaldo(@PathVariable Long id, @RequestBody com.vivero.gestion.dto.AjusteSaldoDTO ajusteDTO) {
        return ResponseEntity.ok(clienteService.ajustarSaldo(id, ajusteDTO.getMonto()));
    }

    // Cuenta corriente itemizada del cliente ("factura dinámica"): LEER_CLIENTES, no ESCRIBIR_VENTAS
    // ni LEER_FINANZAS (ver Decisión 1 y 3.2 de openspec/changes/factura-cliente-dinamica/design.md).
    @PreAuthorize("hasAuthority('LEER_CLIENTES')")
    @GetMapping("/{id}/factura")
    public ResponseEntity<CuentaCorrienteDTO> obtenerFactura(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtenerFactura(id));
    }
}
