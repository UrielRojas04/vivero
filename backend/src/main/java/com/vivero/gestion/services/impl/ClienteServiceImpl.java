package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.ClienteService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

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
