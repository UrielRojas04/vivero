package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ClienteBandejasDTO;
import com.vivero.gestion.dto.HistorialBandejasDTO;
import com.vivero.gestion.models.*;
import com.vivero.gestion.repositories.*;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.BandejasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BandejasServiceImpl implements BandejasService {

    @Autowired
    private HistorialBandejasRepository historialRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository ccbRepository;

    @Override
    @Transactional
    public void registrarEntrega(Long clienteId, Integer cantidad, Venta venta, String username) {
        if (cantidad == null || cantidad <= 0) return;
        
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        HistorialBandejas historial = new HistorialBandejas();
        historial.setCliente(cliente);
        historial.setVenta(venta);
        historial.setCantidad(cantidad);
        historial.setTipo("ENTREGA");
        historial.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        historial.setUsuario(usuario);
        historialRepository.save(historial);

        CuentaCorrienteBandejas ccb = ccbRepository.findByClienteId(clienteId)
                .orElseThrow(() -> new RuntimeException("Cuenta Corriente de Bandejas no encontrada"));
        ccb.setBalanceBandejas(ccb.getBalanceBandejas() + cantidad); // Suma deuda
        ccbRepository.save(ccb);
    }

    @Override
    @Transactional
    public void registrarDevolucion(Long clienteId, Integer cantidad, String username) {
        if (cantidad == null || cantidad <= 0) throw new RuntimeException("Cantidad inválida");

        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        HistorialBandejas historial = new HistorialBandejas();
        historial.setCliente(cliente);
        historial.setCantidad(cantidad);
        historial.setTipo("DEVOLUCION");
        historial.setFecha(LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        historial.setUsuario(usuario);
        historialRepository.save(historial);

        CuentaCorrienteBandejas ccb = ccbRepository.findByClienteId(clienteId)
                .orElseThrow(() -> new RuntimeException("Cuenta Corriente de Bandejas no encontrada"));
        ccb.setBalanceBandejas(ccb.getBalanceBandejas() - cantidad); // Resta deuda
        ccbRepository.save(ccb);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HistorialBandejasDTO> obtenerHistorialPorCliente(Long clienteId) {
        return historialRepository.findByClienteIdOrderByFechaDesc(clienteId).stream()
                .map(h -> {
                    HistorialBandejasDTO dto = new HistorialBandejasDTO();
                    dto.setId(h.getId());
                    try {
                        if (h.getCliente() != null) {
                            dto.setClienteId(h.getCliente().getId());
                            dto.setClienteNombre(h.getCliente().getNombreRazonSocial());
                        } else {
                            dto.setClienteNombre("(eliminado)");
                        }
                    } catch (jakarta.persistence.EntityNotFoundException e) {
                        dto.setClienteNombre("(eliminado)");
                    }
                    try {
                        dto.setVentaId(h.getVenta() != null ? h.getVenta().getId() : null);
                    } catch (jakarta.persistence.EntityNotFoundException e) {
                        // Venta was soft-deleted
                    }
                    dto.setCantidad(h.getCantidad());
                    dto.setTipo(h.getTipo());
                    dto.setFecha(h.getFecha());
                    try {
                        if (h.getUsuario() != null) {
                            dto.setUsuarioNombre(h.getUsuario().getUsername());
                        } else {
                            dto.setUsuarioNombre("(eliminado)");
                        }
                    } catch (jakarta.persistence.EntityNotFoundException e) {
                        dto.setUsuarioNombre("(eliminado)");
                    }
                    return dto;
                }).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClienteBandejasDTO> listarClientesParaBandejas() {
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Cliente> clientes;
        if (unidadId != null) {
            clientes = clienteRepository.findAllByUnidadNegocioId(unidadId);
        } else {
            clientes = clienteRepository.findAll();
        }
        return clientes.stream()
                .map(cliente -> ClienteBandejasDTO.builder()
                        .id(cliente.getId())
                        .nombreRazonSocial(cliente.getNombreRazonSocial())
                        .balanceBandejas(cliente.getCuentaCorrienteBandejas() != null
                                ? cliente.getCuentaCorrienteBandejas().getBalanceBandejas() : 0)
                        .build())
                .collect(Collectors.toList());
    }
}
