package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.VariedadBandejaDTO;
import com.vivero.gestion.models.VariedadBandeja;
import com.vivero.gestion.repositories.VariedadBandejaRepository;
import com.vivero.gestion.repositories.SiembraRepository;
import com.vivero.gestion.services.VariedadBandejaService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VariedadBandejaServiceImpl implements VariedadBandejaService {

    private final VariedadBandejaRepository repository;
    private final SiembraRepository siembraRepository;

    @Override
    public List<VariedadBandejaDTO> obtenerTodas() {
        return repository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public VariedadBandejaDTO obtenerPorId(Long id) {
        return repository.findById(id).map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("VariedadBandeja no encontrada"));
    }

    @Override
    @Transactional
    public VariedadBandejaDTO crear(VariedadBandejaDTO dto) {
        VariedadBandeja model = new VariedadBandeja();
        model.setNombre(dto.getNombre());
        model.setCantidadCeldas(dto.getCantidadCeldas());
        return mapToDTO(repository.save(model));
    }

    @Override
    @Transactional
    public VariedadBandejaDTO actualizar(Long id, VariedadBandejaDTO dto) {
        VariedadBandeja model = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("VariedadBandeja no encontrada"));
        model.setNombre(dto.getNombre());
        model.setCantidadCeldas(dto.getCantidadCeldas());
        return mapToDTO(repository.save(model));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        repository.deleteById(id);
    }

    private VariedadBandejaDTO mapToDTO(VariedadBandeja model) {
        VariedadBandejaDTO dto = new VariedadBandejaDTO();
        dto.setId(model.getId());
        dto.setNombre(model.getNombre());
        dto.setCantidadCeldas(model.getCantidadCeldas());
        dto.setEnUso(siembraRepository.existsByVariedadBandejaId(model.getId()));
        return dto;
    }
}
