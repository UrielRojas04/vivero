package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.ProductoDescuentoDTO;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.ProductoDescuento;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.services.CostoCalculator;
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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
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
        validarProducto(dto);

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
        // ivaPorcentaje/costoEnvioPorcentaje se asignan tal cual vienen del DTO: si el campo no
        // vino informado, dto.getX() ya es null y eso es exactamente lo que se persiste — nunca
        // se convierte a ZERO (Decisión 5, tarea 7.5).
        producto.setIvaPorcentaje(dto.getIvaPorcentaje());
        producto.setCostoEnvioPorcentaje(dto.getCostoEnvioPorcentaje());

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId).orElse(null);
            producto.setUnidadNegocio(unidad);
        }

        reemplazarDescuentos(producto, dto.getDescuentos());

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
        validarProducto(dto);

        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        boolean stockChanged = dto.getStock() != null && !dto.getStock().equals(producto.getStock());
        boolean costChanged = dto.getCostoProducto() != null && !dto.getCostoProducto().equals(producto.getCostoProducto());
        boolean discountChanged = dto.getDescuentoProveedor() != null && !dto.getDescuentoProveedor().equals(producto.getDescuentoProveedor());
        // Extensión de la detección de cambios (Decisión 9, tarea 7.3): IVA propio, envío propio
        // y cualquier alta/baja/modificación real de una fila de la lista de descuentos también
        // tienen que generar un MovimientoStock nuevo — son componentes del costo igual que
        // costoProducto o descuentoProveedor.
        boolean ivaPropioChanged = bigDecimalChanged(dto.getIvaPorcentaje(), producto.getIvaPorcentaje());
        boolean envioPropioChanged = bigDecimalChanged(dto.getCostoEnvioPorcentaje(), producto.getCostoEnvioPorcentaje());
        boolean descuentosChanged = descuentosCambiaron(producto.getDescuentos(), dto.getDescuentos());

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
        // ivaPorcentaje/costoEnvioPorcentaje se pisan siempre con lo que trae el DTO, incluido
        // null: vaciar el campo en el formulario tiene que volver a "hereda" en la base, nunca
        // quedar pegado en el último valor cargado (riesgo "vaciar escribe 0 en vez de null",
        // tarea 7.5 / verificación 11.7).
        producto.setIvaPorcentaje(dto.getIvaPorcentaje());
        producto.setCostoEnvioPorcentaje(dto.getCostoEnvioPorcentaje());

        reemplazarDescuentos(producto, dto.getDescuentos());

        int oldStock = producto.getStock() == null ? 0 : producto.getStock();
        int newStock = dto.getStock() != null ? dto.getStock() : oldStock;
        int diff = newStock - oldStock;
        producto.setStock(newStock);

        if (stockChanged || costChanged || discountChanged || ivaPropioChanged || envioPropioChanged || descuentosChanged) {
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
        // Nunca se expone la entidad ProductoDescuento (regla dura: DTOs siempre, tarea 7.6):
        // se mapea a una lista de ProductoDescuentoDTO con sólo nombre + porcentaje.
        dto.setDescuentos(
                producto.getDescuentos() == null ? new ArrayList<>() :
                producto.getDescuentos().stream()
                        .map(d -> new ProductoDescuentoDTO(d.getNombre(), d.getPorcentaje()))
                        .collect(Collectors.toList())
        );
        dto.setIvaPorcentaje(producto.getIvaPorcentaje());
        dto.setCostoEnvioPorcentaje(producto.getCostoEnvioPorcentaje());
        return dto;
    }

    private void calcularPrecioSiAplica(Producto producto) {
        if (producto.getPorcentajeGanancia() != null && producto.getPorcentajeGanancia().compareTo(BigDecimal.ZERO) > 0) {
            // Tercera copia de la fórmula eliminada (tarea 7.1): ahora pasa por el mismo
            // CostoCalculator que MovimientoStockServiceImpl (grupo 6), con el mismo fallback de
            // IVA/envío producto -> unidad de negocio (Decisión 5). Lo único que este método
            // sigue haciendo a mano es aplicar porcentajeGanancia sobre el costo final — eso no
            // es parte del calculador (Decisión 6: el calculador no sabe de precio de venta).
            BigDecimal costoBase = producto.getCostoProducto() != null ? producto.getCostoProducto() : BigDecimal.ZERO;

            List<BigDecimal> porcentajesDescuento = producto.getDescuentos() == null ? List.of() :
                    producto.getDescuentos().stream().map(ProductoDescuento::getPorcentaje).collect(Collectors.toList());

            BigDecimal unidadIva = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getIvaPorcentaje() : null;
            BigDecimal unidadEnvio = producto.getUnidadNegocio() != null ? producto.getUnidadNegocio().getCostoEnvioPorcentaje() : null;
            BigDecimal ivaEfectivo = CostoCalculator.resolverEfectivo(producto.getIvaPorcentaje(), unidadIva);
            BigDecimal envioEfectivo = CostoCalculator.resolverEfectivo(producto.getCostoEnvioPorcentaje(), unidadEnvio);

            CostoCalculator.CostoResultado resultado = CostoCalculator.calcular(costoBase, porcentajesDescuento, ivaEfectivo, envioEfectivo);
            BigDecimal costoFinal = resultado.getCostoUnitario();

            BigDecimal gananciaMonto = costoFinal.multiply(producto.getPorcentajeGanancia()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            producto.setPrecio(costoFinal.add(gananciaMonto));
        }
    }

    /**
     * Valida el DTO de entrada antes de crear/actualizar (tarea 8.3): cada descuento debe tener
     * nombre no vacío y porcentaje &gt;= 0; IVA y envío propios, cuando vienen informados
     * (no null), también deben ser &gt;= 0. Un valor negativo o un descuento sin nombre rechaza
     * la operación completa, sin persistir nada parcial.
     */
    private void validarProducto(ProductoDTO dto) {
        if (dto.getDescuentos() != null) {
            for (ProductoDescuentoDTO d : dto.getDescuentos()) {
                if (d.getNombre() == null || d.getNombre().trim().isEmpty()) {
                    throw new IllegalArgumentException("Cada descuento debe tener un nombre.");
                }
                if (d.getPorcentaje() == null || d.getPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
                    throw new IllegalArgumentException("El porcentaje del descuento \"" + d.getNombre() + "\" no puede ser negativo.");
                }
            }
        }
        if (dto.getIvaPorcentaje() != null && dto.getIvaPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El IVA del producto no puede ser negativo.");
        }
        if (dto.getCostoEnvioPorcentaje() != null && dto.getCostoEnvioPorcentaje().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("El costo de envío del producto no puede ser negativo.");
        }
    }

    /**
     * Reemplaza por completo la lista de descuentos del producto con lo que trajo el DTO,
     * apoyándose en el orphanRemoval=true de Producto.descuentos (tarea 7.5): las filas que ya no
     * están en el DTO se borran solas al hacer flush, y las nuevas se insertan. El orden de la
     * lista del DTO (el orden en que las cargó el usuario en el formulario) se conserva en
     * "orden" — es puramente presentacional (Decisión 1), el cálculo de costo no depende de él.
     */
    private void reemplazarDescuentos(Producto producto, List<ProductoDescuentoDTO> nuevos) {
        producto.getDescuentos().clear();
        if (nuevos == null) {
            return;
        }
        int orden = 0;
        for (ProductoDescuentoDTO d : nuevos) {
            ProductoDescuento entidad = new ProductoDescuento();
            entidad.setProducto(producto);
            entidad.setNombre(d.getNombre());
            entidad.setPorcentaje(d.getPorcentaje());
            entidad.setOrden(orden++);
            producto.getDescuentos().add(entidad);
        }
    }

    /**
     * Compara dos BigDecimal por VALOR (compareTo), no por escala (equals): "5.0" y "5.00" son el
     * mismo IVA aunque .equals() los vea distintos — la comparación de igualdad de tipo objeto de
     * BigDecimal es sensible a la escala y produciría falsos "cambió" según cómo Jackson
     * deserializó el JSON entrante. null se trata como "hereda", distinto de cualquier valor
     * concreto (incluido ZERO, Decisión 5).
     */
    private boolean bigDecimalChanged(BigDecimal nuevo, BigDecimal actual) {
        if (nuevo == null && actual == null) return false;
        if (nuevo == null || actual == null) return true;
        return nuevo.compareTo(actual) != 0;
    }

    /**
     * Compara contenido, no tamaño (tarea 7.4): pasar "Volumen 5%" a "Volumen 7%" no cambia la
     * cantidad de filas y tiene que detectarse igual que un alta o una baja.
     */
    private boolean descuentosCambiaron(List<ProductoDescuento> actuales, List<ProductoDescuentoDTO> nuevos) {
        List<ProductoDescuento> actualesSeguro = actuales == null ? List.of() : actuales;
        List<ProductoDescuentoDTO> nuevosSeguro = nuevos == null ? List.of() : nuevos;

        if (actualesSeguro.size() != nuevosSeguro.size()) {
            return true;
        }
        for (int i = 0; i < actualesSeguro.size(); i++) {
            ProductoDescuento actual = actualesSeguro.get(i);
            ProductoDescuentoDTO nuevo = nuevosSeguro.get(i);
            boolean mismoNombre = Objects.equals(actual.getNombre(), nuevo.getNombre());
            boolean mismoPorcentaje = actual.getPorcentaje() != null && nuevo.getPorcentaje() != null
                    && actual.getPorcentaje().compareTo(nuevo.getPorcentaje()) == 0;
            if (!mismoNombre || !mismoPorcentaje) {
                return true;
            }
        }
        return false;
    }
}
