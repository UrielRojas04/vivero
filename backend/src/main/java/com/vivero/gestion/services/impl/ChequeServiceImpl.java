package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.ChequeDTO;
import com.vivero.gestion.models.Cheque;
import com.vivero.gestion.models.EstadoCheque;
import com.vivero.gestion.repositories.ChequeRepository;
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
        
        Cheque guardado = chequeRepository.save(cheque);
        return toDTO(guardado);
    }

    @Override
    @Transactional
    public ChequeDTO actualizarEstado(Long id, ChequeDTO dto) {
        Cheque cheque = chequeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cheque no encontrado"));

        if (dto.getEstado() != null) {
            cheque.setEstado(EstadoCheque.valueOf(dto.getEstado()));
            
            if (cheque.getEstado() == EstadoCheque.ENTREGADO) {
                cheque.setFechaEntrega(dto.getFechaEntrega() != null ? dto.getFechaEntrega() : LocalDate.now(ZoneId.of("America/Argentina/Buenos_Aires")));
                cheque.setEntregadoA(dto.getEntregadoA());
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
        return dto;
    }
}
