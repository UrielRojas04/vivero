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
import com.vivero.gestion.services.ClienteService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClienteServiceImpl implements ClienteService {

    private final ClienteRepository clienteRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ClienteDTO> getAll() {
        return clienteRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ClienteDTO getById(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        return mapToDTO(cliente);
    }

    @Override
    @Transactional
    public ClienteDTO create(ClienteDTO dto) {
        Cliente cliente = new Cliente();
        cliente.setNombreRazonSocial(dto.getNombreRazonSocial());
        cliente.setTelefono(dto.getTelefono());
        
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
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        
        cliente.setNombreRazonSocial(dto.getNombreRazonSocial());
        cliente.setTelefono(dto.getTelefono());
        
        Cliente updated = clienteRepository.save(cliente);
        return mapToDTO(updated);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Cliente cliente = clienteRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado con id " + id));
        cliente.setDeleted(true);
        clienteRepository.save(cliente);
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
