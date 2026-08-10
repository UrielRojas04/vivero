package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.VentaDetalleRequestDTO;
import com.vivero.gestion.dto.VentaDetalleResponseDTO;
import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.dto.PagoResponseDTO;
import com.vivero.gestion.exceptions.ResourceNotFoundException;
import com.vivero.gestion.models.*;
import com.vivero.gestion.repositories.*;
import com.vivero.gestion.services.BandejasService;
import com.vivero.gestion.services.VentaService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
    private final CuentaCorrienteDineroRepository ccdRepository;
    private final BandejasService bandejasService;

    public VentaServiceImpl(VentaRepository ventaRepository,
                            ClienteRepository clienteRepository,
                            UsuarioRepository usuarioRepository,
                            ProductoRepository productoRepository,
                            MovimientoStockRepository movimientoStockRepository,
                            CuentaCorrienteDineroRepository ccdRepository,
                            BandejasService bandejasService) {
        this.ventaRepository = ventaRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.movimientoStockRepository = movimientoStockRepository;
        this.ccdRepository = ccdRepository;
        this.bandejasService = bandejasService;
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
        venta.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        
        BigDecimal porcentajeDescuento = request.getPorcentajeDescuento() != null ? request.getPorcentajeDescuento() : BigDecimal.ZERO;
        venta.setPorcentajeDescuento(porcentajeDescuento);

        BigDecimal subtotal = BigDecimal.ZERO;

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
            mov.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
            mov.setUsuario(usuario);
            movimientoStockRepository.save(mov);

            // 3. Crear detalle de venta (precio histórico copiado)
            VentaDetalle detalle = new VentaDetalle();
            detalle.setProducto(producto);
            detalle.setCantidad(detReq.getCantidad());
            BigDecimal precioHist = producto.getPrecio() != null ? producto.getPrecio() : BigDecimal.ZERO;
            detalle.setPrecioUnitarioHistorico(precioHist);
            BigDecimal subtotalLine = precioHist.multiply(BigDecimal.valueOf(detReq.getCantidad()));
            detalle.setSubtotal(subtotalLine);
            
            venta.addDetalle(detalle);
            subtotal = subtotal.add(subtotalLine);
        }

        venta.setSubtotal(subtotal);
        
        BigDecimal descuento = subtotal.multiply(porcentajeDescuento).divide(BigDecimal.valueOf(100));
        venta.setDescuento(descuento);
        
        BigDecimal totalFinal = subtotal.subtract(descuento);
        venta.setTotalFinal(totalFinal);

        BigDecimal totalPagado = BigDecimal.ZERO;
        if (request.getPagos() != null) {
            for (PagoRequestDTO pReq : request.getPagos()) {
                Pago pago = new Pago();
                pago.setMonto(pReq.getMonto());
                pago.setMetodoPago(pReq.getMetodoPago());
                pago.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
                venta.addPago(pago);
                totalPagado = totalPagado.add(pReq.getMonto());
            }
        }

        BigDecimal diferencia = totalPagado.subtract(totalFinal);
        if (diferencia.compareTo(BigDecimal.ZERO) != 0) {
            CuentaCorrienteDinero ccd = ccdRepository.findByClienteId(cliente.getId())
                    .orElseGet(() -> {
                        CuentaCorrienteDinero nueva = new CuentaCorrienteDinero();
                        nueva.setCliente(cliente);
                        nueva.setBalancePesos(BigDecimal.ZERO);
                        return ccdRepository.save(nueva);
                    });
            
            if (diferencia.compareTo(BigDecimal.ZERO) < 0) {
                ccd.agregarDeuda(diferencia.abs());
                venta.setEstadoPago(totalPagado.compareTo(BigDecimal.ZERO) > 0 ? "PARCIAL" : "DEBE");
            } else {
                ccd.agregarSaldoAFavor(diferencia);
                venta.setEstadoPago("PAGADO");
            }
            ccdRepository.save(ccd);
        } else {
            venta.setEstadoPago("PAGADO");
        }

        Venta ventaGuardada = ventaRepository.save(venta);
        
        // --- Historial Bandejas ---
        if (request.getBandejasEntregadas() != null && request.getBandejasEntregadas() > 0) {
            bandejasService.registrarEntrega(cliente.getId(), request.getBandejasEntregadas(), ventaGuardada, username);
        }

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
        dto.setPorcentajeDescuento(venta.getPorcentajeDescuento());
        dto.setDescuento(venta.getDescuento());
        dto.setTotalFinal(venta.getTotalFinal());
        dto.setEstadoPago(venta.getEstadoPago());
        
        // El historial de bandejas no está en la entidad venta directamente como un campo entero,
        // pero podemos obtenerlo o dejarlo para un endpoint separado. Por simplicidad, no lo seteamos aquí
        // a menos que sea un requirement explícito (el DTO ahora lo tiene, podríamos agregarlo después si hace falta).
        dto.setBandejasEntregadas(null); // No lo llenamos por defecto

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

        if (venta.getPagos() != null) {
            List<PagoResponseDTO> pagosDto = venta.getPagos().stream().map(p -> {
                PagoResponseDTO pDto = new PagoResponseDTO();
                pDto.setId(p.getId());
                pDto.setMonto(p.getMonto());
                pDto.setMetodoPago(p.getMetodoPago());
                pDto.setFecha(p.getFecha());
                return pDto;
            }).collect(Collectors.toList());
            dto.setPagos(pagosDto);
        } else {
            dto.setPagos(new ArrayList<>());
        }
        return dto;
    }
}
