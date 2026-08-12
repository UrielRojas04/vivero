package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.VariedadPlantaDTO;
import com.vivero.gestion.models.VariedadPlanta;
import com.vivero.gestion.repositories.VariedadPlantaRepository;
import com.vivero.gestion.repositories.SiembraRepository;
import com.vivero.gestion.services.VariedadPlantaService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VariedadPlantaServiceImpl implements VariedadPlantaService {

    private final VariedadPlantaRepository repository;
    private final SiembraRepository siembraRepository;

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
        model.setDiasEnero(dto.getDiasEnero());
        model.setDiasFebrero(dto.getDiasFebrero());
        model.setDiasMarzo(dto.getDiasMarzo());
        model.setDiasAbril(dto.getDiasAbril());
        model.setDiasMayo(dto.getDiasMayo());
        model.setDiasJunio(dto.getDiasJunio());
        model.setDiasJulio(dto.getDiasJulio());
        model.setDiasAgosto(dto.getDiasAgosto());
        model.setDiasSeptiembre(dto.getDiasSeptiembre());
        model.setDiasOctubre(dto.getDiasOctubre());
        model.setDiasNoviembre(dto.getDiasNoviembre());
        model.setDiasDiciembre(dto.getDiasDiciembre());
        return mapToDTO(repository.save(model));
    }

    @Override
    @Transactional
    public VariedadPlantaDTO actualizar(Long id, VariedadPlantaDTO dto) {
        VariedadPlanta model = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("VariedadPlanta no encontrada"));
        model.setNombre(dto.getNombre());
        model.setDescripcion(dto.getDescripcion());
        model.setDiasEnero(dto.getDiasEnero());
        model.setDiasFebrero(dto.getDiasFebrero());
        model.setDiasMarzo(dto.getDiasMarzo());
        model.setDiasAbril(dto.getDiasAbril());
        model.setDiasMayo(dto.getDiasMayo());
        model.setDiasJunio(dto.getDiasJunio());
        model.setDiasJulio(dto.getDiasJulio());
        model.setDiasAgosto(dto.getDiasAgosto());
        model.setDiasSeptiembre(dto.getDiasSeptiembre());
        model.setDiasOctubre(dto.getDiasOctubre());
        model.setDiasNoviembre(dto.getDiasNoviembre());
        model.setDiasDiciembre(dto.getDiasDiciembre());
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
        dto.setDiasEnero(model.getDiasEnero());
        dto.setDiasFebrero(model.getDiasFebrero());
        dto.setDiasMarzo(model.getDiasMarzo());
        dto.setDiasAbril(model.getDiasAbril());
        dto.setDiasMayo(model.getDiasMayo());
        dto.setDiasJunio(model.getDiasJunio());
        dto.setDiasJulio(model.getDiasJulio());
        dto.setDiasAgosto(model.getDiasAgosto());
        dto.setDiasSeptiembre(model.getDiasSeptiembre());
        dto.setDiasOctubre(model.getDiasOctubre());
        dto.setDiasNoviembre(model.getDiasNoviembre());
        dto.setDiasDiciembre(model.getDiasDiciembre());
        dto.setEnUso(siembraRepository.existsByVariedadPlantaId(model.getId()));
        return dto;
    }
}
