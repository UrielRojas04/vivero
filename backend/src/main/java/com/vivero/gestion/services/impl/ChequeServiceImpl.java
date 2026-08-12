package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ChequeDTO;
import com.vivero.gestion.models.Cheque;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.EstadoCheque;
import com.vivero.gestion.repositories.ChequeRepository;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.services.ChequeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class ChequeServiceImpl implements ChequeService {

    @Autowired
    private ChequeRepository chequeRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<ChequeDTO> listarCheques(Pageable pageable) {
        return chequeRepository.findAllByOrderByFechaRecepcionDesc(pageable).map(this::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public ChequeDTO obtenerPorId(Long id) {
        return chequeRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Cheque no encontrado"));
    }

    @Override
    @Transactional
    public ChequeDTO crearCheque(ChequeDTO dto) {
        Cheque cheque = new Cheque();
        cheque.setFechaRecepcion(dto.getFechaRecepcion() != null ? dto.getFechaRecepcion() : LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        cheque.setMonto(dto.getMonto());
        cheque.setBanco(dto.getBanco());
        cheque.setFechaCobro(dto.getFechaCobro());
        cheque.setNumeroSerie(dto.getNumeroSerie());
        cheque.setNumeroInterno(dto.getNumeroInterno());
        cheque.setEstado(EstadoCheque.EN_CARTERA);
        cheque.setEsEmisionPropia(dto.getEsEmisionPropia() != null ? dto.getEsEmisionPropia() : false);
        
        if (dto.getClienteId() != null) {
            Cliente cliente = clienteRepository.findById(dto.getClienteId())
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
            cheque.setCliente(cliente);
            if (cliente.getCuentaCorrienteDinero() != null) {
                if (Boolean.TRUE.equals(dto.getEsEmisionPropia())) {
                    cliente.getCuentaCorrienteDinero().agregarDeuda(dto.getMonto());
                } else {
                    cliente.getCuentaCorrienteDinero().agregarSaldoAFavor(dto.getMonto());
                }
                clienteRepository.save(cliente);
            }
        }
        
        Cheque guardado = chequeRepository.save(cheque);
        return toDTO(guardado);
    }

    @Override
    @Transactional
    public ChequeDTO actualizarEstado(Long id, ChequeDTO dto) {
        Cheque cheque = chequeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cheque no encontrado"));

        if (cheque.getEstado() == EstadoCheque.RECHAZADO || cheque.getEstado() == EstadoCheque.ENTREGADO || cheque.getEstado() == EstadoCheque.COBRADO) {
            throw new RuntimeException("Un cheque en estado " + cheque.getEstado() + " no puede ser modificado por razones de seguridad contable.");
        }

        if (dto.getEstado() != null) {
            EstadoCheque nuevoEstado = EstadoCheque.valueOf(dto.getEstado());

            if (nuevoEstado == EstadoCheque.RECHAZADO && cheque.getEstado() != EstadoCheque.RECHAZADO) {
                if (cheque.getCliente() != null && cheque.getCliente().getCuentaCorrienteDinero() != null) {
                    if (Boolean.TRUE.equals(cheque.getEsEmisionPropia())) {
                        cheque.getCliente().getCuentaCorrienteDinero().agregarSaldoAFavor(cheque.getMonto());
                    } else {
                        cheque.getCliente().getCuentaCorrienteDinero().agregarDeuda(cheque.getMonto());
                    }
                    clienteRepository.save(cheque.getCliente());
                }
            }

            cheque.setEstado(nuevoEstado);
            
            if (EstadoCheque.ENTREGADO.name().equals(dto.getEstado())) {
                if (dto.getEndosadoAClienteId() != null) {
                    Cliente cliente = clienteRepository.findById(dto.getEndosadoAClienteId())
                            .orElseThrow(() -> new RuntimeException("Cliente a endosar no encontrado"));
                    if (cliente.getCuentaCorrienteDinero() != null) {
                        cliente.getCuentaCorrienteDinero().agregarDeuda(cheque.getMonto());
                        clienteRepository.save(cliente);
                    }
                    cheque.setEntregadoA(cliente.getNombreRazonSocial());
                } else {
                    cheque.setEntregadoA(dto.getEntregadoA());
                }
                cheque.setFechaEntrega(dto.getFechaEntrega() != null ? dto.getFechaEntrega() : LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires")));
            } else {
                cheque.setFechaEntrega(null);
                cheque.setEntregadoA(null);
            }
        }

        return toDTO(chequeRepository.save(cheque));
    }

    private ChequeDTO toDTO(Cheque cheque) {
        ChequeDTO dto = new ChequeDTO();
        dto.setId(cheque.getId());
        dto.setFechaRecepcion(cheque.getFechaRecepcion());
        try {
            if (cheque.getCliente() != null) {
                dto.setClienteId(cheque.getCliente().getId());
                dto.setClienteNombre(cheque.getCliente().getNombreRazonSocial());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            dto.setClienteNombre("(eliminado)");
        }
        try {
            if (cheque.getVenta() != null) {
                dto.setVentaId(cheque.getVenta().getId());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            // Venta was soft-deleted, skip
        }
        dto.setNumeroInterno(cheque.getNumeroInterno());
        dto.setMonto(cheque.getMonto());
        dto.setBanco(cheque.getBanco());
        dto.setFechaCobro(cheque.getFechaCobro());
        dto.setNumeroSerie(cheque.getNumeroSerie());
        dto.setEstado(cheque.getEstado().name());
        dto.setFechaEntrega(cheque.getFechaEntrega());
        dto.setEntregadoA(cheque.getEntregadoA());
        dto.setEsEmisionPropia(cheque.getEsEmisionPropia());
        return dto;
    }
}
