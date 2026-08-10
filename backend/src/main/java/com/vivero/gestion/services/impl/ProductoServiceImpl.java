package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.services.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    public ProductoServiceImpl(ProductoRepository productoRepository, UnidadNegocioRepository unidadNegocioRepository) {
        this.productoRepository = productoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
    }

    @Override
    @Transactional
    public ProductoDTO crearProducto(ProductoDTO dto) {
        UnidadNegocio unidad = unidadNegocioRepository.findById(dto.getUnidadNegocioId())
                .orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada"));

        Producto producto = new Producto();
        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());
        producto.setStock(dto.getStock() != null ? dto.getStock() : 0);
        producto.setUnidadNegocio(unidad);

        Producto guardado = productoRepository.save(producto);
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
        
        if (dto.getStock() != null) {
            producto.setStock(dto.getStock());
        }

        if (dto.getUnidadNegocioId() != null && !dto.getUnidadNegocioId().equals(producto.getUnidadNegocio().getId())) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(dto.getUnidadNegocioId())
                    .orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada"));
            producto.setUnidadNegocio(unidad);
        }

        Producto actualizado = productoRepository.save(producto);
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
                producto.getStock(),
                producto.getUnidadNegocio().getId()
        );
    }
}
