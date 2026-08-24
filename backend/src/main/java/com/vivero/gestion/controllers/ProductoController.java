package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.RevisionCostoProductoDTO;
import com.vivero.gestion.services.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService productoService;

    @Autowired
    public ProductoController(ProductoService productoService) {
        this.productoService = productoService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<ProductoDTO> crearProducto(@RequestBody ProductoDTO dto) {
        ProductoDTO creado = productoService.crearProducto(dto);
        return new ResponseEntity<>(creado, HttpStatus.CREATED);
    }

    // Panel de revisión de costos (Decisión 8 de design.md de revision-costos-productos): sólo
    // LEER_STOCK, igual que el resto de las lecturas de este controller — no es una capacidad
    // nueva del negocio, es otra vista del catálogo que el usuario ya puede leer. El controller
    // no llama al repositorio (regla dura 6): toda la lógica vive en ProductoServiceImpl.
    @GetMapping("/revision-costos")
    @PreAuthorize("hasAuthority('LEER_STOCK')")
    public ResponseEntity<List<RevisionCostoProductoDTO>> listarRevisionCostos() {
        return ResponseEntity.ok(productoService.listarRevisionCostos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('LEER_STOCK')")
    public ResponseEntity<ProductoDTO> obtenerProductoPorId(@PathVariable Long id) {
        ProductoDTO dto = productoService.obtenerProductoPorId(id);
        return ResponseEntity.ok(dto);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('LEER_STOCK')")
    public ResponseEntity<List<ProductoDTO>> obtenerTodosLosProductos() {
        List<ProductoDTO> dtos = productoService.obtenerTodosLosProductos();
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<ProductoDTO> actualizarProducto(@PathVariable Long id, @RequestBody ProductoDTO dto) {
        ProductoDTO actualizado = productoService.actualizarProducto(id, dto);
        return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ESCRIBIR_STOCK')")
    public ResponseEntity<Void> eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
        return ResponseEntity.noContent().build();
    }
}
