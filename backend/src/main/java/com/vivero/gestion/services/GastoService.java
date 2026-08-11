package com.vivero.gestion.services;

import com.vivero.gestion.dto.GastoDTO;
import com.vivero.gestion.models.Gasto;
import com.vivero.gestion.repositories.GastoRepository;
import com.vivero.gestion.repositories.projections.GastoUnificadoView;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GastoService {

    @Autowired
    private GastoRepository gastoRepository;

    @Transactional(readOnly = true)
    public Page<GastoDTO> listarGastos(Pageable pageable) {
        return gastoRepository.listarGastosUnificados(pageable)
                .map(this::mapUnificadoToDTO);
    }

    @Transactional
    public GastoDTO crearGasto(GastoDTO dto) {
        Gasto gasto = new Gasto();
        gasto.setConcepto(dto.getConcepto());
        gasto.setMonto(dto.getMonto());
        gasto.setFecha(dto.getFecha() != null ? dto.getFecha() : LocalDateTime.now());
        
        Gasto guardado = gastoRepository.save(gasto);
        return mapToDTO(guardado);
    }

    @Transactional(readOnly = true)
    public List<GastoDTO> listarGastosPorRango(LocalDateTime start, LocalDateTime end) {
        return gastoRepository.findByFechaBetween(start, end).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private GastoDTO mapToDTO(Gasto gasto) {
        return new GastoDTO(
                "G-" + gasto.getId(),
                gasto.getConcepto(),
                gasto.getMonto(),
                gasto.getFecha(),
                "MANUAL"
        );
    }

    private GastoDTO mapUnificadoToDTO(GastoUnificadoView view) {
        return new GastoDTO(
                view.getIdUnico(),
                view.getConcepto(),
                view.getMonto(),
                view.getFecha(),
                view.getTipo()
        );
    }
}
