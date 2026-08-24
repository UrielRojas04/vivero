package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.dto.CuentaCorrienteDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.dto.ChequeDTO;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.ChequeService;
import com.vivero.gestion.services.ClienteService;
import com.vivero.gestion.services.VentaService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final VentaService ventaService;
    private final ChequeService chequeService;

    @Override
    @Transactional(readOnly = true)
    public List<ClienteDTO> getAll() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Cliente> clientes;
        if (unidadId != null) {
            clientes = clienteRepository.findAllByUnidadNegocioId(unidadId);
        } else {
            clientes = clienteRepository.findAll();
        }
        return clientes.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ClienteDTO getById(Long id) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Cliente cliente;
        if (unidadId != null) {
            cliente = clienteRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado o no pertenece a la unidad."));
        } else {
            cliente = clienteRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        }
        return mapToDTO(cliente);
    }

    @Override
    @Transactional
    public ClienteDTO create(ClienteDTO dto) {
        Cliente cliente = new Cliente();
        cliente.setNombreRazonSocial(dto.getNombreRazonSocial());
        cliente.setTelefono(dto.getTelefono());
        
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId != null) {
            cliente.setUnidadNegocio(unidadNegocioRepository.getReferenceById(unidadId));
        }
        
        CuentaCorrienteDinero ctaDinero = new CuentaCorrienteDinero();
        ctaDinero.setBalancePesos(BigDecimal.ZERO);
        ctaDinero.setCliente(cliente);
        cliente.setCuentaCorrienteDinero(ctaDinero);

        CuentaCorrienteBandejas ctaBandejas = new CuentaCorrienteBandejas();
        ctaBandejas.setBalanceBandejas(0);
        ctaBandejas.setCliente(cliente);
        cliente.setCuentaCorrienteBandejas(ctaBandejas);
        
        Cliente saved = clienteRepository.save(cliente);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public ClienteDTO update(Long id, ClienteDTO dto) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Cliente cliente;
        if (unidadId != null) {
            cliente = clienteRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado o no pertenece a la unidad."));
        } else {
            cliente = clienteRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        }
        
        cliente.setNombreRazonSocial(dto.getNombreRazonSocial());
        cliente.setTelefono(dto.getTelefono());
        
        Cliente updated = clienteRepository.save(cliente);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Cliente cliente;
        if (unidadId != null) {
            cliente = clienteRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado o no pertenece a la unidad."));
        } else {
            cliente = clienteRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        }
        cliente.setDeleted(true);
        clienteRepository.save(cliente);
    }

    @Override
    @Transactional
    public ClienteDTO ajustarSaldo(Long id, BigDecimal monto) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Cliente cliente;
        if (unidadId != null) {
            cliente = clienteRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado o no pertenece a la unidad."));
        } else {
            cliente = clienteRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        }
        
        CuentaCorrienteDinero cta = cliente.getCuentaCorrienteDinero();
        if (cta == null) {
            cta = new CuentaCorrienteDinero();
            cta.setBalancePesos(BigDecimal.ZERO);
            cta.setCliente(cliente);
            cliente.setCuentaCorrienteDinero(cta);
        }
        
        cta.setBalancePesos(cta.getBalancePesos().add(monto));
        Cliente updated = clienteRepository.save(cliente);
        return mapToDTO(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public CuentaCorrienteDTO obtenerFactura(Long id) {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        Cliente cliente;
        if (unidadId != null) {
            cliente = clienteRepository.findByIdAndUnidadNegocioId(id, unidadId)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado o no pertenece a la unidad."));
        } else {
            cliente = clienteRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        }

        // La lista de ventas del documento (con detalles[] y pagos[]) se arma reutilizando el
        // mapeo Venta -> VentaResponseDTO ya existente en VentaServiceImpl (privado), a través de
        // VentaService.listarVentasPorCliente, en vez de copiar el mapeo acá. Los totales se
        // calculan sobre ese mismo DTO en vez de hacer un segundo fetch de Venta cruda: el DTO
        // ya trae totalFinal y pagos[].monto, así que una sola query alcanza.
        List<VentaResponseDTO> ventasDto = ventaService.listarVentasPorCliente(id);

        BigDecimal totalVentas = ventasDto.stream()
                .map(v -> v.getTotalFinal() != null ? v.getTotalFinal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPagado = ventasDto.stream()
                .flatMap(v -> v.getPagos() != null ? v.getPagos().stream() : java.util.stream.Stream.empty())
                .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Convención de signo a propósito: totalPagado - totalVentas (NO al revés), para que
        // negativo == deuda, igual que balancePesos y que describirSaldo en el frontend. Mezclar
        // la convención acá sería mostrarle al cliente un número con el signo cambiado.
        BigDecimal saldoSegunVentas = totalPagado.subtract(totalVentas);

        BigDecimal balanceDinero = cliente.getCuentaCorrienteDinero() != null
                ? cliente.getCuentaCorrienteDinero().getBalancePesos()
                : BigDecimal.ZERO;

        // Lo que balanceDinero se mueve y que ventas + pagos no explican (ajustes manuales de
        // saldo, cheques sueltos, reversas, ventas dadas de baja). Ver Decisión 4 de design.md.
        BigDecimal diferenciaNoItemizada = balanceDinero.subtract(saldoSegunVentas);

        CuentaCorrienteDTO dto = new CuentaCorrienteDTO();
        dto.setClienteId(cliente.getId());
        dto.setClienteNombre(cliente.getNombreRazonSocial());
        dto.setClienteTelefono(cliente.getTelefono());
        dto.setFechaGeneracion(java.time.LocalDateTime.now());
        dto.setVentas(ventasDto);
        dto.setCantidadVentas(ventasDto.size());
        dto.setTotalVentas(totalVentas);
        dto.setTotalPagado(totalPagado);
        dto.setSaldoSegunVentas(saldoSegunVentas);
        dto.setBalanceDinero(balanceDinero);
        dto.setDiferenciaNoItemizada(diferenciaNoItemizada);

        // Cheques sueltos del cliente: la única parte de "otros movimientos" que tiene registro
        // real y se puede desglosar. El ajuste manual de saldo no deja rastro (ver comentario en
        // CuentaCorrienteDTO.cheques).
        List<ChequeDTO> cheques = chequeService.listarChequesPorCliente(id);
        dto.setCheques(cheques);

        return dto;
    }

    private ClienteDTO mapToDTO(Cliente cliente) {
        return ClienteDTO.builder()
                .id(cliente.getId())
                .nombreRazonSocial(cliente.getNombreRazonSocial())
                .telefono(cliente.getTelefono())
                .balanceDinero(cliente.getCuentaCorrienteDinero() != null ? cliente.getCuentaCorrienteDinero().getBalancePesos() : BigDecimal.ZERO)
                .balanceBandejas(cliente.getCuentaCorrienteBandejas() != null ? cliente.getCuentaCorrienteBandejas().getBalanceBandejas() : 0)
                .build();
    }
}
