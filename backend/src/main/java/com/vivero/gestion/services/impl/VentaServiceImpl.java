package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaDetalleResponseDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.exceptions.ResourceNotFoundException;
import com.vivero.gestion.models.*;
import com.vivero.gestion.repositories.*;
import com.vivero.gestion.services.VentaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class VentaServiceImpl implements VentaService {

    private final VentaRepository ventaRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProductoRepository productoRepository;
    private final MovimientoStockRepository movimientoStockRepository;

    public VentaServiceImpl(VentaRepository ventaRepository,
                            ClienteRepository clienteRepository,
                            UsuarioRepository usuarioRepository,
                            ProductoRepository productoRepository,
                            MovimientoStockRepository movimientoStockRepository) {
        this.ventaRepository = ventaRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.movimientoStockRepository = movimientoStockRepository;
    }

    @Override
    @Transactional
    public VentaResponseDTO crearVenta(VentaRequestDTO request, String username) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
                
        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        if (request.getDetalles() == null || request.getDetalles().isEmpty()) {
            throw new IllegalArgumentException("La venta debe tener al menos un detalle");
        }

        Venta venta = new Venta();
        venta.setCliente(cliente);
        venta.setUsuario(usuario);
        venta.setFecha(LocalDateTime.now());
        venta.setEstadoPago("DEBE"); // Default, hasta que se implementen pagos
        venta.setDescuento(BigDecimal.ZERO);

        BigDecimal totalFinal = BigDecimal.ZERO;

        for (VentaDetalleRequestDTO detReq : request.getDetalles()) {
            Producto producto = productoRepository.findById(detReq.getProductoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + detReq.getProductoId()));

            // 1. Validar y descontar stock
            if (detReq.getCantidad() <= 0) {
                throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
            }
            int stockActual = producto.getStock() == null ? 0 : producto.getStock();
            if (detReq.getCantidad() > stockActual) {
                throw new IllegalArgumentException("No hay stock suficiente para el producto: " + producto.getNombre());
            }
            producto.setStock(stockActual - detReq.getCantidad());
            productoRepository.save(producto); // actualiza stock

            // 2. Crear movimiento de stock para la traza
            MovimientoStock mov = new MovimientoStock();
            mov.setProducto(producto);
            mov.setCantidad(detReq.getCantidad());
            mov.setTipo("OUT");
            mov.setMotivo("Venta");
            mov.setFecha(LocalDateTime.now());
            mov.setUsuario(usuario);
            movimientoStockRepository.save(mov);

            // 3. Crear detalle de venta (precio histórico copiado)
            VentaDetalle detalle = new VentaDetalle();
            detalle.setProducto(producto);
            detalle.setCantidad(detReq.getCantidad());
            BigDecimal precioHist = producto.getPrecio() != null ? producto.getPrecio() : BigDecimal.ZERO;
            detalle.setPrecioUnitarioHistorico(precioHist);
            
            BigDecimal subtotal = precioHist.multiply(BigDecimal.valueOf(detReq.getCantidad()));
            detalle.setSubtotal(subtotal);

            venta.addDetalle(detalle);
            totalFinal = totalFinal.add(subtotal);
        }

        venta.setSubtotal(totalFinal);
        venta.setTotalFinal(totalFinal);

        Venta ventaGuardada = ventaRepository.save(venta);
        return mapearAVentaResponseDTO(ventaGuardada);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VentaResponseDTO> listarVentas() {
        return ventaRepository.findAll().stream()
                .map(this::mapearAVentaResponseDTO)
                .collect(Collectors.toList());
    }

    private VentaResponseDTO mapearAVentaResponseDTO(Venta venta) {
        VentaResponseDTO dto = new VentaResponseDTO();
        dto.setId(venta.getId());
        dto.setClienteNombre(venta.getCliente().getNombreRazonSocial());
        dto.setUsuarioNombre(venta.getUsuario().getUsername());
        dto.setSubtotal(venta.getSubtotal());
        dto.setDescuento(venta.getDescuento());
        dto.setTotalFinal(venta.getTotalFinal());
        dto.setEstadoPago(venta.getEstadoPago());
        dto.setFecha(venta.getFecha());
        dto.setRemitoUrl(venta.getRemitoUrl());

        if (venta.getDetalles() != null) {
            List<VentaDetalleResponseDTO> detallesDto = venta.getDetalles().stream().map(d -> {
                VentaDetalleResponseDTO dDto = new VentaDetalleResponseDTO();
                dDto.setId(d.getId());
                dDto.setProductoId(d.getProducto().getId());
                dDto.setProductoNombre(d.getProducto().getNombre());
                dDto.setCantidad(d.getCantidad());
                dDto.setPrecioUnitarioHistorico(d.getPrecioUnitarioHistorico());
                dDto.setSubtotal(d.getSubtotal());
                return dDto;
            }).collect(Collectors.toList());
            dto.setDetalles(detallesDto);
        } else {
            dto.setDetalles(new ArrayList<>());
        }
        return dto;
    }
}
