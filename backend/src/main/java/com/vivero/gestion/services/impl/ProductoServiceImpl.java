package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.services.ProductoService;
import com.vivero.gestion.services.SseService;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final SseService sseService;

    @Autowired
    public ProductoServiceImpl(ProductoRepository productoRepository, UnidadNegocioRepository unidadNegocioRepository, SseService sseService) {
        this.productoRepository = productoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.sseService = sseService;
    }

    @Override
    @Transactional
    public ProductoDTO crearProducto(ProductoDTO dto) {
        Producto producto = new Producto();
        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());
        producto.setCostoProducto(dto.getCostoProducto());
        producto.setDescuentoProveedor(dto.getDescuentoProveedor() != null ? dto.getDescuentoProveedor() : java.math.BigDecimal.ZERO);
        producto.setStock(dto.getStock() != null ? dto.getStock() : 0);
        producto.setLote(dto.getLote());
        producto.setDueno(dto.getDueno());

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId).orElse(null);
            producto.setUnidadNegocio(unidad);
        }

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
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Producto> productos = (unidadId != null) 
            ? productoRepository.findAllByUnidadNegocioId(unidadId) 
            : productoRepository.findAll();

        return productos.stream()
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
        producto.setCostoProducto(dto.getCostoProducto());
        if (dto.getDescuentoProveedor() != null) {
            producto.setDescuentoProveedor(dto.getDescuentoProveedor());
        }
        
        if (dto.getStock() != null) {
            producto.setStock(dto.getStock());
        }
        
        producto.setLote(dto.getLote());
        producto.setDueno(dto.getDueno());


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
        ProductoDTO dto = new ProductoDTO();
        dto.setId(producto.getId());
        dto.setNombre(producto.getNombre());
        dto.setDescripcion(producto.getDescripcion());
        dto.setPrecio(producto.getPrecio());
        dto.setCostoProducto(producto.getCostoProducto());
        dto.setDescuentoProveedor(producto.getDescuentoProveedor());
        dto.setStock(producto.getStock());
        dto.setLote(producto.getLote());
        dto.setDueno(producto.getDueno());
        return dto;
    }
}
