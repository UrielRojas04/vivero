package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.services.ProductoService;
import com.vivero.gestion.services.SseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final SseService sseService;

    @Autowired
    public ProductoServiceImpl(ProductoRepository productoRepository, SseService sseService) {
        this.productoRepository = productoRepository;
        this.sseService = sseService;
    }

    @Override
    @Transactional
    public ProductoDTO crearProducto(ProductoDTO dto) {
        Producto producto = new Producto();
        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());
        producto.setPrecioCosto(dto.getPrecioCosto());
        producto.setStock(dto.getStock() != null ? dto.getStock() : 0);

        Producto guardado = productoRepository.save(producto);
        sseService.emitStockUpdate(new com.vivero.gestion.dto.StockUpdateEvent(guardado.getId(), guardado.getStock()));
        return mapToDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductoDTO obtenerProductoPorId(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        return mapToDTO(producto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductoDTO> obtenerTodosLosProductos() {
        return productoRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductoDTO actualizarProducto(Long id, ProductoDTO dto) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());
        
        if (dto.getPrecioCosto() != null) {
            producto.setPrecioCosto(dto.getPrecioCosto());
        }

        if (dto.getStock() != null) {
            producto.setStock(dto.getStock());
        }


        Producto actualizado = productoRepository.save(producto);
        sseService.emitStockUpdate(new com.vivero.gestion.dto.StockUpdateEvent(actualizado.getId(), actualizado.getStock()));
        return mapToDTO(actualizado);
    }

    @Override
    @Transactional
    public void eliminarProducto(Long id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        productoRepository.delete(producto);
    }

    private ProductoDTO mapToDTO(Producto producto) {
        return new ProductoDTO(
                producto.getId(),
                producto.getNombre(),
                producto.getDescripcion(),
                producto.getPrecio(),
                producto.getPrecioCosto(),
                producto.getStock()
        );
    }
}
