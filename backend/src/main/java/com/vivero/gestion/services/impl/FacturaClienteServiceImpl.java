package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.FacturaClienteDTO;
import com.vivero.gestion.dto.FacturaConceptoDTO;
import com.vivero.gestion.dto.PagoResponseDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.dto.VentaDetalleResponseDTO;
import com.vivero.gestion.exceptions.ResourceNotFoundException;
import com.vivero.gestion.models.FacturaCliente;
import com.vivero.gestion.models.FacturaConcepto;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.models.Pago;
import com.vivero.gestion.models.Cheque;
import com.vivero.gestion.models.EstadoCheque;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.ChequeRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.FacturaClienteRepository;
import com.vivero.gestion.repositories.FacturaConceptoRepository;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.FacturaClienteService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.time.ZoneId;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
public class FacturaClienteServiceImpl implements FacturaClienteService {

    private final FacturaClienteRepository facturaRepository;
    private final FacturaConceptoRepository conceptoRepository;
    private final ClienteRepository clienteRepository;
    private final PagoRepository pagoRepository;
    private final ChequeRepository chequeRepository;
    private final CuentaCorrienteDineroRepository ccdRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

    public FacturaClienteServiceImpl(FacturaClienteRepository facturaRepository,
                                     FacturaConceptoRepository conceptoRepository,
                                     ClienteRepository clienteRepository,
                                     PagoRepository pagoRepository,
                                     ChequeRepository chequeRepository,
                                     CuentaCorrienteDineroRepository ccdRepository,
                                     UnidadNegocioRepository unidadNegocioRepository) {
        this.facturaRepository = facturaRepository;
        this.conceptoRepository = conceptoRepository;
        this.clienteRepository = clienteRepository;
        this.pagoRepository = pagoRepository;
        this.chequeRepository = chequeRepository;
        this.ccdRepository = ccdRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public FacturaClienteDTO obtenerFacturaActiva(Long clienteId) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) unidadId = 1L; // Fallback to Vivero

        return facturaRepository.findByClienteIdAndEstadoAndUnidadNegocioId(clienteId, "ABIERTA", unidadId)
                .map(this::mapearADTO)
                .orElse(null);
    }

    @Override
    @Transactional
    public FacturaClienteDTO abrirFacturaManual(Long clienteId) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) unidadId = 1L; // Fallback to Vivero

        com.vivero.gestion.models.Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        Optional<FacturaCliente> existente = facturaRepository.findByClienteIdAndEstadoAndUnidadNegocioId(clienteId, "ABIERTA", unidadId);
        if (existente.isPresent()) {
            throw new RuntimeException("El cliente ya tiene una factura ABIERTA");
        }

        com.vivero.gestion.models.UnidadNegocio unidad = unidadNegocioRepository.findById(unidadId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidad de negocio no encontrada"));

        FacturaCliente nueva = new FacturaCliente();
        nueva.setCliente(cliente);
        nueva.setUnidadNegocio(unidad);
        nueva.setEstado("ABIERTA");
        nueva.setFechaApertura(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        
        FacturaCliente guardada = facturaRepository.save(nueva);
        return mapearADTO(guardada);
    }


    @Override
    @Transactional(readOnly = true)
    public List<FacturaClienteDTO> listarHistorialFacturas(Long clienteId) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) unidadId = 1L; // Fallback to Vivero

        return facturaRepository.findByClienteIdAndUnidadNegocioIdOrderByFechaAperturaDesc(clienteId, unidadId)
                .stream()
                .map(this::mapearADTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FacturaClienteDTO agregarConcepto(Long facturaId, FacturaConceptoDTO request) {
        FacturaCliente factura = facturaRepository.findById(facturaId)
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada"));

        if ("CERRADA".equals(factura.getEstado())) {
            throw new RuntimeException("No se pueden agregar conceptos a una factura cerrada");
        }

        FacturaConcepto concepto = new FacturaConcepto();
        concepto.setDescripcion(request.getDescripcion());
        concepto.setMonto(request.getMonto());
        concepto.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        factura.addConcepto(concepto);

        conceptoRepository.save(concepto);
        FacturaCliente guardada = facturaRepository.save(factura);

        return mapearADTO(guardada);
    }

    @Override
    @Transactional
    public FacturaClienteDTO registrarPago(Long facturaId, PagoRequestDTO request) {
        FacturaCliente factura = facturaRepository.findById(facturaId)
                .orElseThrow(() -> new ResourceNotFoundException("FacturaCliente no encontrada"));

        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null && !factura.getUnidadNegocio().getId().equals(unidadId)) {
            throw new RuntimeException("La factura no pertenece a la unidad de negocio activa");
        }

        if (!"ABIERTA".equals(factura.getEstado())) {
            throw new RuntimeException("No se puede registrar pagos en una factura CERRADA");
        }

        Pago pago = new Pago();
        pago.setFactura(factura);
        pago.setMonto(request.getMonto());
        pago.setMetodoPago(request.getMetodoPago() != null ? request.getMetodoPago() : "EFECTIVO");
        pago.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        pago = pagoRepository.save(pago);

        if ("CHEQUE".equalsIgnoreCase(request.getMetodoPago())) {
            Cheque cheque = new Cheque();
            cheque.setCliente(factura.getCliente());
            cheque.setUnidadNegocio(factura.getUnidadNegocio());
            cheque.setPagoOrigen(pago);
            // No se enlaza a 'venta' porque es un pago directo a la factura
            cheque.setMonto(request.getMonto());
            cheque.setBanco(request.getBanco());
            cheque.setNumeroSerie(request.getNumeroSerie());
            cheque.setFechaRecepcion(request.getFechaRecepcion() != null ? request.getFechaRecepcion() : pago.getFecha().toLocalDate());
            cheque.setFechaCobro(request.getFechaCobro());
            cheque.setEstado(EstadoCheque.EN_CARTERA);
            chequeRepository.save(cheque);
        }

        CuentaCorrienteDinero ccd = ccdRepository.findByClienteId(factura.getCliente().getId())
                .orElseGet(() -> {
                    CuentaCorrienteDinero nueva = new CuentaCorrienteDinero();
                    nueva.setCliente(factura.getCliente());
                    nueva.setBalancePesos(BigDecimal.ZERO);
                    return ccdRepository.save(nueva);
                });
        
        ccd.agregarSaldoAFavor(request.getMonto());
        ccdRepository.save(ccd);

        factura.getPagos().add(pago);
        return mapearADTO(factura);
    }

    @Override
    @Transactional
    public FacturaClienteDTO cerrarFactura(Long facturaId) {
        FacturaCliente factura = facturaRepository.findById(facturaId)
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada"));

        if ("CERRADA".equals(factura.getEstado())) {
            throw new RuntimeException("La factura ya se encuentra cerrada");
        }

        factura.setEstado("CERRADA");
        factura.setFechaCierre(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        FacturaCliente guardada = facturaRepository.save(factura);

        return mapearADTO(guardada);
    }

    private FacturaClienteDTO mapearADTO(FacturaCliente factura) {
        FacturaClienteDTO dto = new FacturaClienteDTO();
        dto.setId(factura.getId());
        dto.setClienteId(factura.getCliente().getId());
        dto.setClienteNombre(factura.getCliente().getNombreRazonSocial());
        dto.setClienteTelefono(factura.getCliente().getTelefono());
        dto.setFechaApertura(factura.getFechaApertura());
        dto.setFechaCierre(factura.getFechaCierre());
        dto.setEstado(factura.getEstado());

        BigDecimal totalVentas = BigDecimal.ZERO;
        List<VentaResponseDTO> ventasDto = new ArrayList<>();
        if (factura.getVentas() != null) {
            for (Venta v : factura.getVentas()) {
                VentaResponseDTO vDto = new VentaResponseDTO();
                vDto.setId(v.getId());
                vDto.setFecha(v.getFecha());
                vDto.setTotalFinal(v.getTotalFinal());
                vDto.setEstadoPago(v.getEstadoPago());
                vDto.setRemitoUrl(v.getRemitoUrl());
                
                if (v.getDetalles() != null) {
                    List<VentaDetalleResponseDTO> detallesDto = v.getDetalles().stream().map(d -> {
                        VentaDetalleResponseDTO dDto = new VentaDetalleResponseDTO();
                        dDto.setId(d.getId());
                        dDto.setProductoNombre(d.getProducto() != null ? d.getProducto().getNombre() : "(eliminado)");
                        dDto.setCantidad(d.getCantidad());
                        dDto.setSubtotal(d.getSubtotal());
                        return dDto;
                    }).collect(Collectors.toList());
                    vDto.setDetalles(detallesDto);
                } else {
                    vDto.setDetalles(new ArrayList<>());
                }
                
                ventasDto.add(vDto);
                if (v.getTotalFinal() != null) totalVentas = totalVentas.add(v.getTotalFinal());
            }
        }
        dto.setVentas(ventasDto);

        BigDecimal totalPagos = BigDecimal.ZERO;
        List<PagoResponseDTO> pagosDto = new ArrayList<>();
        if (factura.getPagos() != null) {
            for (Pago p : factura.getPagos()) {
                PagoResponseDTO pDto = new PagoResponseDTO();
                pDto.setId(p.getId());
                pDto.setFecha(p.getFecha());
                pDto.setMonto(p.getMonto());
                pDto.setMetodoPago(p.getMetodoPago());
                pDto.setEstado(p.getEstado() != null ? p.getEstado().name() : "ACREDITADO");
                pDto.setVentaId(p.getVenta() != null ? p.getVenta().getId() : null);
                pagosDto.add(pDto);
                
                boolean isAcreditado = p.getEstado() == null || p.getEstado().name().equals("ACREDITADO");
                if (p.getMonto() != null && isAcreditado) {
                    totalPagos = totalPagos.add(p.getMonto());
                }
            }
        }
        dto.setPagos(pagosDto);

        BigDecimal totalConceptos = BigDecimal.ZERO;
        List<FacturaConceptoDTO> conceptosDto = new ArrayList<>();
        if (factura.getConceptos() != null) {
            for (FacturaConcepto c : factura.getConceptos()) {
                FacturaConceptoDTO cDto = new FacturaConceptoDTO();
                cDto.setId(c.getId());
                cDto.setFecha(c.getFecha());
                cDto.setDescripcion(c.getDescripcion());
                cDto.setMonto(c.getMonto());
                conceptosDto.add(cDto);
                if (c.getMonto() != null) totalConceptos = totalConceptos.add(c.getMonto());
            }
        }
        dto.setConceptos(conceptosDto);

        dto.setTotalVentas(totalVentas);
        dto.setTotalPagos(totalPagos);
        dto.setTotalConceptos(totalConceptos);

        BigDecimal saldo = totalVentas.add(totalConceptos).subtract(totalPagos);
        dto.setSaldoDeudor(saldo);

        return dto;
    }
    @Override
    @Transactional
    public void rechazarPago(Long pagoId) {
        Pago pago = pagoRepository.findById(pagoId)
                .orElseThrow(() -> new RuntimeException("Pago no encontrado"));
        pago.setEstado(com.vivero.gestion.models.enums.EstadoPago.RECHAZADO);
        pagoRepository.save(pago);
    }
}
