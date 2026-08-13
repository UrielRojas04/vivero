package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.services.ProductoService;
import com.vivero.gestion.services.SseService;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.models.TipoMovimientoStock;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.MarcaRepository;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Marca;
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
    private final MovimientoStockService movimientoStockService;
    private final UsuarioRepository usuarioRepository;
    private final MarcaRepository marcaRepository;

    @Autowired
    public ProductoServiceImpl(ProductoRepository productoRepository, 
                               UnidadNegocioRepository unidadNegocioRepository, 
                               SseService sseService,
                               MovimientoStockService movimientoStockService,
                               UsuarioRepository usuarioRepository,
                               MarcaRepository marcaRepository) {
        this.productoRepository = productoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.sseService = sseService;
        this.movimientoStockService = movimientoStockService;
        this.usuarioRepository = usuarioRepository;
        this.marcaRepository = marcaRepository;
    }

    @Override
    @Transactional
    public ProductoDTO crearProducto(ProductoDTO dto) {
        Producto producto = new Producto();
        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());
        
        if (dto.getMarcaId() != null) {
            Marca marca = marcaRepository.findById(dto.getMarcaId()).orElse(null);
            producto.setMarca(marca);
        } else {
            producto.setMarca(null);
        }
        producto.setCostoProducto(dto.getCostoProducto());
        producto.setDescuentoProveedor(dto.getDescuentoProveedor() != null ? dto.getDescuentoProveedor() : java.math.BigDecimal.ZERO);
        producto.setPorcentajeGanancia(dto.getPorcentajeGanancia());
        producto.setStock(dto.getStock() != null ? dto.getStock() : 0);
        producto.setLote(dto.getLote());
        producto.setDueno(dto.getDueno());

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId).orElse(null);
            producto.setUnidadNegocio(unidad);
        }

        calcularPrecioSiAplica(producto);

        Producto guardado = productoRepository.save(producto);
        
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null ? auth.getName() : null;
        com.vivero.gestion.models.Usuario usuario = null;
        if (username != null && !username.equals("anonymousUser")) {
            usuario = usuarioRepository.findByUsername(username).orElse(null);
        }
        movimientoStockService.registrarMovimiento(guardado, guardado.getStock() != null ? guardado.getStock() : 0, TipoMovimientoStock.AJUSTE_INICIAL, usuario);
        
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

        boolean stockChanged = dto.getStock() != null && !dto.getStock().equals(producto.getStock());
        boolean costChanged = dto.getCostoProducto() != null && !dto.getCostoProducto().equals(producto.getCostoProducto());
        boolean discountChanged = dto.getDescuentoProveedor() != null && !dto.getDescuentoProveedor().equals(producto.getDescuentoProveedor());

        producto.setNombre(dto.getNombre());
        producto.setDescripcion(dto.getDescripcion());
        producto.setPrecio(dto.getPrecio());
        
        if (dto.getMarcaId() != null) {
            Marca marca = marcaRepository.findById(dto.getMarcaId()).orElse(null);
            producto.setMarca(marca);
        } else {
            producto.setMarca(null);
        }
        if (dto.getCostoProducto() != null) producto.setCostoProducto(dto.getCostoProducto());
        if (dto.getDescuentoProveedor() != null) producto.setDescuentoProveedor(dto.getDescuentoProveedor());
        if (dto.getPorcentajeGanancia() != null) producto.setPorcentajeGanancia(dto.getPorcentajeGanancia());
        
        int oldStock = producto.getStock() == null ? 0 : producto.getStock();
        int newStock = dto.getStock() != null ? dto.getStock() : oldStock;
        int diff = newStock - oldStock;
        producto.setStock(newStock);

        if (stockChanged || costChanged || discountChanged) {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String username = auth != null ? auth.getName() : null;
            com.vivero.gestion.models.Usuario usuario = null;
            if (username != null && !username.equals("anonymousUser")) {
                usuario = usuarioRepository.findByUsername(username).orElse(null);
            }
            
            TipoMovimientoStock tipo = (diff > 0) ? TipoMovimientoStock.INGRESO 
                                     : (diff < 0) ? TipoMovimientoStock.EGRESO 
                                     : TipoMovimientoStock.AJUSTE_INICIAL;
                                     
            movimientoStockService.registrarMovimiento(producto, Math.abs(diff), tipo, usuario);
        }
        
        producto.setLote(dto.getLote());
        producto.setDueno(dto.getDueno());

        calcularPrecioSiAplica(producto);

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
        if (producto.getMarca() != null) {
            dto.setMarcaId(producto.getMarca().getId());
            dto.setMarcaNombre(producto.getMarca().getNombre());
        }
        dto.setCostoProducto(producto.getCostoProducto());
        dto.setDescuentoProveedor(producto.getDescuentoProveedor());
        dto.setPorcentajeGanancia(producto.getPorcentajeGanancia());
        dto.setCostoUnitarioHistorico(producto.getCostoUnitarioHistorico() != null ? producto.getCostoUnitarioHistorico() : producto.getCostoProducto());
        dto.setStock(producto.getStock());
        dto.setLote(producto.getLote());
        dto.setDueno(producto.getDueno());
        return dto;
    }

    private void calcularPrecioSiAplica(Producto producto) {
        if (producto.getPorcentajeGanancia() != null && producto.getPorcentajeGanancia().compareTo(java.math.BigDecimal.ZERO) > 0) {
            java.math.BigDecimal costoBase = producto.getCostoProducto() != null ? producto.getCostoProducto() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal descuentoPerc = producto.getDescuentoProveedor() != null ? producto.getDescuentoProveedor() : java.math.BigDecimal.ZERO;
            java.math.BigDecimal costoEnvioPerc = producto.getUnidadNegocio() != null && producto.getUnidadNegocio().getCostoEnvioPorcentaje() != null 
                    ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : java.math.BigDecimal.ZERO;

            java.math.BigDecimal descuentoMonto = costoBase.multiply(descuentoPerc).divide(new java.math.BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal costoConDescuento = costoBase.subtract(descuentoMonto);
            java.math.BigDecimal envioMonto = costoConDescuento.multiply(costoEnvioPerc).divide(new java.math.BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            java.math.BigDecimal costoFinal = costoConDescuento.add(envioMonto);

            java.math.BigDecimal gananciaMonto = costoFinal.multiply(producto.getPorcentajeGanancia()).divide(new java.math.BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            producto.setPrecio(costoFinal.add(gananciaMonto));
        }
    }
}
