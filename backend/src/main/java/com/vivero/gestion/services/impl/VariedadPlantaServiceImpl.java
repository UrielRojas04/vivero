package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.VariedadPlantaDTO;
import com.vivero.gestion.models.VariedadPlanta;
import com.vivero.gestion.repositories.VariedadPlantaRepository;
import com.vivero.gestion.services.VariedadPlantaService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VariedadPlantaServiceImpl implements VariedadPlantaService {

    private final VariedadPlantaRepository repository;

    @Override
    public List<VariedadPlantaDTO> obtenerTodas() {
        return repository.findAll().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    public VariedadPlantaDTO obtenerPorId(Long id) {
        return repository.findById(id).map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("VariedadPlanta no encontrada"));
    }

    @Override
    @Transactional
    public VariedadPlantaDTO crear(VariedadPlantaDTO dto) {
        VariedadPlanta model = new VariedadPlanta();
        model.setNombre(dto.getNombre());
        model.setDescripcion(dto.getDescripcion());
        model.setDiasCrecimiento(dto.getDiasCrecimiento());
        return mapToDTO(repository.save(model));
    }

    @Override
    @Transactional
    public VariedadPlantaDTO actualizar(Long id, VariedadPlantaDTO dto) {
        VariedadPlanta model = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("VariedadPlanta no encontrada"));
        model.setNombre(dto.getNombre());
        model.setDescripcion(dto.getDescripcion());
        model.setDiasCrecimiento(dto.getDiasCrecimiento());
        return mapToDTO(repository.save(model));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        repository.deleteById(id);
    }

    private VariedadPlantaDTO mapToDTO(VariedadPlanta model) {
        VariedadPlantaDTO dto = new VariedadPlantaDTO();
        dto.setId(model.getId());
        dto.setNombre(model.getNombre());
        dto.setDescripcion(model.getDescripcion());
        dto.setDiasCrecimiento(model.getDiasCrecimiento());
        return dto;
    }
}
