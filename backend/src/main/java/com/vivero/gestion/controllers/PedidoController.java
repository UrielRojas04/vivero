package com.vivero.gestion.controllers;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.vivero.gestion.dto.PedidoDTO;
import com.vivero.gestion.dto.RecepcionPedidoDTO;
import com.vivero.gestion.models.EstadoPedido;
import com.vivero.gestion.services.PedidoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService pedidoService;

    // Paginado (regla dura: sin findAll() sin límite) y ordenado por fecha de creación
    // descendente en el propio repositorio (Decisión 11 de design.md).
    @PreAuthorize("hasAuthority('LEER_PEDIDOS')")
    @GetMapping
    public ResponseEntity<Page<PedidoDTO>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) EstadoPedido estado,
            @RequestParam(required = false) Long proveedorId) {
        return ResponseEntity.ok(pedidoService.listar(estado, proveedorId, PageRequest.of(page, size)));
    }

    @PreAuthorize("hasAuthority('LEER_PEDIDOS')")
    @GetMapping("/{id}")
    public ResponseEntity<PedidoDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(pedidoService.obtenerPorId(id));
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @PostMapping
    public ResponseEntity<PedidoDTO> crear(@RequestBody PedidoDTO dto, Authentication authentication) {
        PedidoDTO creado = pedidoService.crear(dto, authentication.getName());
        return new ResponseEntity<>(creado, HttpStatus.CREATED);
    }

    // Edita un pedido sólo si está PENDIENTE (Decisión 13 de design.md); PedidoServiceImpl
    // rechaza cualquier otro estado.
    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @PutMapping("/{id}")
    public ResponseEntity<PedidoDTO> actualizar(@PathVariable Long id, @RequestBody PedidoDTO dto) {
        return ResponseEntity.ok(pedidoService.actualizar(id, dto));
    }

    // Sub-recurso propio, no un PUT del pedido: es una operación de dominio con efecto sobre el
    // inventario (Decisión 13 de design.md), único camino de ingreso de stock por compra.
    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @PostMapping("/{id}/recepcion")
    public ResponseEntity<PedidoDTO> confirmarRecepcion(@PathVariable Long id, @RequestBody RecepcionPedidoDTO dto,
                                                          Authentication authentication) {
        return ResponseEntity.ok(pedidoService.confirmarRecepcion(id, dto, authentication.getName()));
    }

    // PENDIENTE -> CANCELADO. No genera ningún movimiento de stock (PedidoServiceImpl.cancelar
    // sólo cambia el estado).
    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @PostMapping("/{id}/cancelar")
    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
        pedidoService.cancelar(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('ESCRIBIR_PEDIDOS')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        pedidoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
