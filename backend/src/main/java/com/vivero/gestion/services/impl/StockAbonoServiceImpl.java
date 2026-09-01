package com.vivero.gestion.services.impl;

import com.vivero.gestion.models.*;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.*;
import com.vivero.gestion.services.StockAbonoService;
import org.springframework.security.core.context.SecurityContextHolder;
import com.vivero.gestion.dto.StockConsolidadoAbonoDTO;
import com.vivero.gestion.dto.MovimientoStockAbonoDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StockAbonoServiceImpl implements StockAbonoService {

    private final StockAbonoRepository stockAbonoRepository;
    private final MovimientoStockAbonoRepository movimientoStockAbonoRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;

    @Autowired
    public StockAbonoServiceImpl(StockAbonoRepository stockAbonoRepository,
                                 MovimientoStockAbonoRepository movimientoStockAbonoRepository,
                                 ProductoRepository productoRepository,
                                 UsuarioRepository usuarioRepository) {
        this.stockAbonoRepository = stockAbonoRepository;
        this.movimientoStockAbonoRepository = movimientoStockAbonoRepository;
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    private Usuario getUsuarioAutenticado() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    @Override
    @Transactional
    public void registrarProduccion(Long productoId, Integer cantidad) {
        if (cantidad <= 0) throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                
        StockAbono stock = getOrCreateStock(producto, UbicacionAbono.INVERNADERO);
        stock.setCantidad(stock.getCantidad() + cantidad);
        stockAbonoRepository.save(stock);
        
        registrarMovimiento(producto, UbicacionAbono.INVERNADERO, cantidad, TipoMovimientoStockAbono.PRODUCCION, null, null);
        actualizarStockGlobalProducto(producto);
    }

    @Override
    @Transactional
    public void registrarTraslado(Long productoId, Integer cantidad, String direccion) {
        if (cantidad <= 0) throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                
        StockAbono stockInvernadero = getOrCreateStock(producto, UbicacionAbono.INVERNADERO);
        StockAbono stockColega = getOrCreateStock(producto, UbicacionAbono.COLEGA);
        
        if ("COLEGA_A_INVERNADERO".equals(direccion)) {
            if (stockColega.getCantidad() < cantidad) {
                throw new RuntimeException("Stock insuficiente en colega para trasladar");
            }
            stockColega.setCantidad(stockColega.getCantidad() - cantidad);
            stockInvernadero.setCantidad(stockInvernadero.getCantidad() + cantidad);
            
            registrarMovimiento(producto, UbicacionAbono.COLEGA, -cantidad, TipoMovimientoStockAbono.TRASLADO_SALIDA, null, null);
            registrarMovimiento(producto, UbicacionAbono.INVERNADERO, cantidad, TipoMovimientoStockAbono.TRASLADO_ENTRADA, null, null);
        } else {
            if (stockInvernadero.getCantidad() < cantidad) {
                throw new RuntimeException("Stock insuficiente en invernadero para trasladar");
            }
            stockInvernadero.setCantidad(stockInvernadero.getCantidad() - cantidad);
            stockColega.setCantidad(stockColega.getCantidad() + cantidad);
            
            registrarMovimiento(producto, UbicacionAbono.INVERNADERO, -cantidad, TipoMovimientoStockAbono.TRASLADO_SALIDA, null, null);
            registrarMovimiento(producto, UbicacionAbono.COLEGA, cantidad, TipoMovimientoStockAbono.TRASLADO_ENTRADA, null, null);
        }
        
        stockAbonoRepository.save(stockInvernadero);
        stockAbonoRepository.save(stockColega);
        
        actualizarStockGlobalProducto(producto);
    }

    @Override
    @Transactional
    public void registrarVenta(Long productoId, Integer cantidad, CuentaAbono cuenta, Venta venta) {
        if (cantidad <= 0) throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        if (cuenta == null) throw new IllegalArgumentException("La venta requiere una cuenta activa");
        
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                
        UbicacionAbono ubicacion = cuenta == CuentaAbono.JEFE ? UbicacionAbono.INVERNADERO : UbicacionAbono.COLEGA;
        StockAbono stock = getOrCreateStock(producto, ubicacion);
        
        if (stock.getCantidad() < cantidad) {
            throw new RuntimeException("Stock insuficiente en " + ubicacion + " para la venta");
        }
        
        stock.setCantidad(stock.getCantidad() - cantidad);
        stockAbonoRepository.save(stock);
        
        registrarMovimiento(producto, ubicacion, -cantidad, TipoMovimientoStockAbono.VENTA, cuenta, venta);
        actualizarStockGlobalProducto(producto);
    }

    @Override
    @Transactional
    public void registrarAjuste(Long productoId, Integer cantidad, CuentaAbono cuenta) {
        if (cuenta == null) throw new IllegalArgumentException("El ajuste requiere una cuenta activa");
        
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                
        UbicacionAbono ubicacion = cuenta == CuentaAbono.JEFE ? UbicacionAbono.INVERNADERO : UbicacionAbono.COLEGA;
        StockAbono stock = getOrCreateStock(producto, ubicacion);
        
        stock.setCantidad(stock.getCantidad() + cantidad);
        stockAbonoRepository.save(stock);
        
        registrarMovimiento(producto, ubicacion, cantidad, TipoMovimientoStockAbono.AJUSTE, cuenta, null);
        actualizarStockGlobalProducto(producto);
    }

    private StockAbono getOrCreateStock(Producto producto, UbicacionAbono ubicacion) {
        return stockAbonoRepository.findByProductoIdAndUbicacion(producto.getId(), ubicacion)
                .orElseGet(() -> new StockAbono(producto, ubicacion, 0));
    }

    private void registrarMovimiento(Producto producto, UbicacionAbono ubicacion, Integer cantidad, 
                                     TipoMovimientoStockAbono tipo, CuentaAbono cuenta, Venta venta) {
        MovimientoStockAbono mov = new MovimientoStockAbono();
        mov.setProducto(producto);
        mov.setUbicacion(ubicacion);
        mov.setCantidad(cantidad);
        mov.setTipoMovimiento(tipo);
        mov.setCuenta(cuenta);
        mov.setVenta(venta);
        mov.setUsuario(getUsuarioAutenticado());
        mov.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        movimientoStockAbonoRepository.save(mov);
    }

    private void actualizarStockGlobalProducto(Producto producto) {
        Integer stockTotal = stockAbonoRepository.sumarStockPorProducto(producto.getId());
        producto.setStock(stockTotal);
        productoRepository.save(producto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockConsolidadoAbonoDTO> obtenerStockConsolidado() {
        Long abonoId = null;
        // Obtenemos todos los productos de la unidad Abono
        List<Producto> productos = productoRepository.findAll().stream()
                .filter(p -> p.getUnidadNegocio() != null && "Abono".equals(p.getUnidadNegocio().getNombre()))
                .filter(p -> !p.isDeleted())
                .collect(Collectors.toList());

        return productos.stream().map(p -> {
            List<StockAbono> stocks = stockAbonoRepository.findByProductoId(p.getId());
            
            Integer stockInvernadero = 0;
            Integer stockColega = 0;
            
            for (StockAbono s : stocks) {
                if (s.getUbicacion() == UbicacionAbono.INVERNADERO) {
                    stockInvernadero = s.getCantidad();
                } else if (s.getUbicacion() == UbicacionAbono.COLEGA) {
                    stockColega = s.getCantidad();
                }
            }
            
            return new StockConsolidadoAbonoDTO(
                    p.getId(),
                    p.getNombre(),
                    p.getCategoriaAbono() != null ? p.getCategoriaAbono().getNombre() : null,
                    stockInvernadero,
                    stockColega,
                    stockInvernadero + stockColega
            );
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MovimientoStockAbonoDTO> obtenerHistorialMovimientos(Long productoId, List<TipoMovimientoStockAbono> tipos, Pageable pageable) {
        Page<com.vivero.gestion.models.MovimientoStockAbono> page;
        
        if (productoId != null) {
            if (tipos != null && !tipos.isEmpty()) {
                page = movimientoStockAbonoRepository.findByProductoIdAndTipoMovimientoInOrderByFechaDesc(productoId, tipos, pageable);
            } else {
                page = movimientoStockAbonoRepository.findByProductoIdOrderByFechaDesc(productoId, pageable);
            }
        } else {
            if (tipos != null && !tipos.isEmpty()) {
                page = movimientoStockAbonoRepository.findByTipoMovimientoInOrderByFechaDesc(tipos, pageable);
            } else {
                page = movimientoStockAbonoRepository.findAllByOrderByFechaDesc(pageable);
            }
        }
            
        return page.map(m -> new MovimientoStockAbonoDTO(
                        m.getId(),
                        m.getProducto() != null ? m.getProducto().getNombre() : "Producto Eliminado",
                        m.getUbicacion().name(),
                        m.getCantidad(),
                        m.getTipoMovimiento().name(),
                        m.getCuenta() != null ? m.getCuenta().name() : null,
                        m.getFecha(),
                        m.getUsuario() != null ? m.getUsuario().getUsername() : null
                ));
    }
}
