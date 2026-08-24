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
import com.vivero.gestion.services.SseService;
import com.vivero.gestion.services.VentaService;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;
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
    private final MovimientoStockService movimientoStockService;
    private final CuentaCorrienteDineroRepository ccdRepository;
    private final BandejasService bandejasService;
    private final SseService sseService;
    private final ChequeRepository chequeRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final FacturaClienteRepository facturaClienteRepository;

    public VentaServiceImpl(VentaRepository ventaRepository,
                            ClienteRepository clienteRepository,
                            UsuarioRepository usuarioRepository,
                            ProductoRepository productoRepository,
                            MovimientoStockService movimientoStockService,
                            CuentaCorrienteDineroRepository ccdRepository,
                            BandejasService bandejasService,
                            SseService sseService,
                            ChequeRepository chequeRepository,
                            UnidadNegocioRepository unidadNegocioRepository,
                            FacturaClienteRepository facturaClienteRepository) {
        this.ventaRepository = ventaRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioRepository = usuarioRepository;
        this.productoRepository = productoRepository;
        this.movimientoStockService = movimientoStockService;
        this.ccdRepository = ccdRepository;
        this.bandejasService = bandejasService;
        this.sseService = sseService;
        this.chequeRepository = chequeRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.facturaClienteRepository = facturaClienteRepository;
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

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId).orElse(null);
            venta.setUnidadNegocio(unidad);

            if (unidadId == 1L && unidad != null) {
                FacturaCliente factura = facturaClienteRepository
                    .findByClienteIdAndEstadoAndUnidadNegocioId(cliente.getId(), "ABIERTA", unidadId)
                    .orElseGet(() -> {
                        FacturaCliente nueva = new FacturaCliente();
                        nueva.setCliente(cliente);
                        nueva.setUnidadNegocio(unidad);
                        nueva.setEstado("ABIERTA");
                        nueva.setFechaApertura(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
                        return facturaClienteRepository.save(nueva);
                    });
                venta.setFactura(factura);
            }
        }

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
            sseService.emitStockUpdate(new com.vivero.gestion.dto.StockUpdateEvent(producto.getId(), producto.getStock()));

            // 2. Crear movimiento de stock para la traza (con costo congelado)
            MovimientoStock mov = movimientoStockService.registrarMovimiento(producto, detReq.getCantidad(), TipoMovimientoStock.VENTA, usuario);

            // 3. Crear detalle de venta (precio y costo histórico copiados)
            VentaDetalle detalle = new VentaDetalle();
            detalle.setProducto(producto);
            detalle.setCantidad(detReq.getCantidad());
            BigDecimal precioHist = producto.getPrecio() != null ? producto.getPrecio() : BigDecimal.ZERO;
            detalle.setPrecioUnitarioHistorico(precioHist);
            detalle.setCostoUnitarioHistorico(mov.getCostoUnitario());
            detalle.setCostoBaseHistorico(mov.getCostoBase());
            detalle.setDescuentoPorcentajeHistorico(mov.getDescuentoPorcentaje());
            detalle.setEnvioPorcentajeHistorico(mov.getEnvioPorcentaje());
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
        List<Cheque> chequesAInsertar = new java.util.ArrayList<>();

        if (request.getPagos() != null) {
            for (PagoRequestDTO pReq : request.getPagos()) {
                Pago pago = new Pago();
                pago.setMonto(pReq.getMonto());
                pago.setMetodoPago(pReq.getMetodoPago());
                pago.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
                if (venta.getFactura() != null) {
                    pago.setFactura(venta.getFactura());
                }
                venta.addPago(pago);
                totalPagado = totalPagado.add(pReq.getMonto());

                if ("CHEQUE".equalsIgnoreCase(pReq.getMetodoPago())) {
                    Cheque cheque = new Cheque();
                    LocalDate fechaRec = pReq.getFechaRecepcion() != null ? 
                            pReq.getFechaRecepcion() : 
                            LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")).toLocalDate();
                    cheque.setFechaRecepcion(fechaRec);
                    cheque.setCliente(cliente);
                    cheque.setPagoOrigen(pago);
                    // venta se setea después de guardar la venta para evitar TransientObjectException
                    cheque.setMonto(pReq.getMonto());
                    cheque.setBanco(pReq.getBanco());
                    cheque.setNumeroSerie(pReq.getNumeroSerie());
                    cheque.setFechaCobro(pReq.getFechaCobro());
                    cheque.setEstado(EstadoCheque.EN_CARTERA);
                    chequesAInsertar.add(cheque);
                }
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

        // Guardar cheques ahora que la venta ya tiene ID
        for (Cheque c : chequesAInsertar) {
            c.setVenta(ventaGuardada);
            if (ventaGuardada.getUnidadNegocio() != null) {
                c.setUnidadNegocio(ventaGuardada.getUnidadNegocio());
            }
            chequeRepository.save(c);
        }
        
        // --- Historial Bandejas ---
        if (request.getBandejasEntregadas() != null && request.getBandejasEntregadas() > 0) {
            bandejasService.registrarEntrega(cliente.getId(), request.getBandejasEntregadas(), ventaGuardada, username);
        }

        return mapearAVentaResponseDTO(ventaGuardada);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VentaResponseDTO> listarVentas() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Venta> ventas = (unidadId != null) 
            ? ventaRepository.findAllByUnidadNegocioIdOrderByFechaDesc(unidadId) 
            : ventaRepository.findAllByOrderByFechaDesc();

        return ventas.stream()
                .map(this::mapearAVentaResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VentaResponseDTO> listarVentasPorCliente(Long clienteId) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Venta> ventas = (unidadId != null)
                ? ventaRepository.findByClienteIdAndUnidadNegocioIdOrderByFechaDesc(clienteId, unidadId)
                : ventaRepository.findByClienteIdOrderByFechaDesc(clienteId);

        // Segundo paso del fetch: Hibernate no admite JOIN FETCH de dos bags en la misma query
        // (MultipleBagFetchException), así que los pagos se cargan acá sobre las mismas entidades.
        // El retorno se descarta a propósito: el efecto está en el contexto de persistencia.
        if (!ventas.isEmpty()) {
            ventaRepository.completarPagos(ventas);
        }

        return ventas.stream()
                .map(this::mapearAVentaResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public VentaResponseDTO registrarPago(Long ventaId, PagoRequestDTO request) {
        Venta venta = ventaRepository.findById(ventaId)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada con ID: " + ventaId));

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null && venta.getUnidadNegocio() != null
                && !unidadId.equals(venta.getUnidadNegocio().getId())) {
            throw new RuntimeException("La venta no pertenece a la unidad de negocio activa.");
        }

        if (request == null || request.getMonto() == null
                || request.getMonto().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("El monto del pago debe ser mayor a cero");
        }

        // Sólo efectivo y transferencia: registrar un cheque exige banco, número de serie y
        // fechas, y ya existe un flujo dedicado para eso en la pantalla de Cheques. Aceptarlo acá
        // duplicaría ese alta a medias (un Pago sin su Cheque asociado).
        String metodo = request.getMetodoPago() != null ? request.getMetodoPago().toUpperCase() : "";
        if (!"EFECTIVO".equals(metodo) && !"TRANSFERENCIA".equals(metodo)) {
            throw new RuntimeException("Para registrar un cheque usá la pantalla de Cheques");
        }

        Pago pago = new Pago();
        pago.setMonto(request.getMonto());
        pago.setMetodoPago(metodo);
        pago.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        if (venta.getFactura() != null) {
            pago.setFactura(venta.getFactura());
        }
        venta.addPago(pago);

        // Recalcular el estado sumando TODOS los pagos de la venta (los previos más este).
        BigDecimal totalPagado = venta.getPagos().stream()
                .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalFinal = venta.getTotalFinal() != null ? venta.getTotalFinal() : BigDecimal.ZERO;

        if (totalPagado.compareTo(totalFinal) >= 0) {
            venta.setEstadoPago("PAGADO");
        } else if (totalPagado.compareTo(BigDecimal.ZERO) > 0) {
            venta.setEstadoPago("PARCIAL");
        } else {
            venta.setEstadoPago("DEBE");
        }

        // Pagar reduce la deuda: balancePesos es negativo cuando el cliente debe, así que sumar
        // el monto lo acerca a cero. Misma convención que crearVenta (ver CuentaCorrienteDinero).
        Cliente cliente = venta.getCliente();
        if (cliente != null) {
            CuentaCorrienteDinero ccd = ccdRepository.findByClienteId(cliente.getId())
                    .orElseGet(() -> {
                        CuentaCorrienteDinero nueva = new CuentaCorrienteDinero();
                        nueva.setCliente(cliente);
                        nueva.setBalancePesos(BigDecimal.ZERO);
                        return ccdRepository.save(nueva);
                    });
            ccd.agregarSaldoAFavor(request.getMonto());
            ccdRepository.save(ccd);
        }

        Venta ventaGuardada = ventaRepository.save(venta);
        return mapearAVentaResponseDTO(ventaGuardada);
    }

    private VentaResponseDTO mapearAVentaResponseDTO(Venta venta) {
        VentaResponseDTO dto = new VentaResponseDTO();
        dto.setId(venta.getId());
        try {
            if (venta.getCliente() != null) {
                dto.setClienteNombre(venta.getCliente().getNombreRazonSocial());
                dto.setClienteTelefono(venta.getCliente().getTelefono());
            } else {
                dto.setClienteNombre("(eliminado)");
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto.setClienteNombre("(eliminado)");
        }
        try {
            if (venta.getUsuario() != null) {
                dto.setUsuarioNombre(venta.getUsuario().getUsername());
            } else {
                dto.setUsuarioNombre("(eliminado)");
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto.setUsuarioNombre("(eliminado)");
        }
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
                try {
                    if (d.getProducto() != null) {
                        dDto.setProductoId(d.getProducto().getId());
                        dDto.setProductoNombre(d.getProducto().getNombre());
                    } else {
                        dDto.setProductoNombre("(eliminado)");
                    }
                } catch (jakarta.persistence.EntityNotFoundException e) {
                    dDto.setProductoNombre("(eliminado)");
                }
                dDto.setCantidad(d.getCantidad());
                dDto.setPrecioUnitarioHistorico(d.getPrecioUnitarioHistorico());
                dDto.setCostoUnitarioHistorico(d.getCostoUnitarioHistorico());
                dDto.setCostoBaseHistorico(d.getCostoBaseHistorico());
                dDto.setDescuentoPorcentajeHistorico(d.getDescuentoPorcentajeHistorico());
                dDto.setEnvioPorcentajeHistorico(d.getEnvioPorcentajeHistorico());
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
