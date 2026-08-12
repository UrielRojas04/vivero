package com.vivero.gestion.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.services.ClienteService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @PreAuthorize("hasAuthority('LEER_CLIENTES')")
    @GetMapping
    public ResponseEntity<List<ClienteDTO>> getAll() {
        return ResponseEntity.ok(clienteService.getAll());
    }

    @PreAuthorize("hasAuthority('LEER_CLIENTES')")
    @GetMapping("/{id}")
    public ResponseEntity<ClienteDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.getById(id));
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_CLIENTES')")
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
}
