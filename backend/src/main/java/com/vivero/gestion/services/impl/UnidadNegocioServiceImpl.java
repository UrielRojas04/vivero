package com.vivero.gestion.services.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.UnidadNegocioDTO;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.services.UnidadNegocioService;

import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UnidadNegocioServiceImpl implements UnidadNegocioService {

    private final UnidadNegocioRepository repository;

    @Override
    public List<UnidadNegocioDTO> obtenerTodasActivas() {
        return repository.findByActivoTrue().stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UnidadNegocioDTO crear(UnidadNegocioDTO dto) {
        UnidadNegocio model = new UnidadNegocio();
        model.setNombre(dto.getNombre());
        model.setDescripcion(dto.getDescripcion());
        model.setCostoEnvioPorcentaje(dto.getCostoEnvioPorcentaje());
        model.setActivo(dto.isActivo());
        return mapToDTO(repository.save(model));
    }

    @Override
    @Transactional
    public UnidadNegocioDTO actualizar(Long id, UnidadNegocioDTO dto) {
        UnidadNegocio model = repository.findById(id).orElseThrow(() -> new RuntimeException("Unidad de Negocio no encontrada"));
        if (dto.getNombre() != null) model.setNombre(dto.getNombre());
        if (dto.getDescripcion() != null) model.setDescripcion(dto.getDescripcion());
        if (dto.getCostoEnvioPorcentaje() != null) model.setCostoEnvioPorcentaje(dto.getCostoEnvioPorcentaje());
        model.setActivo(dto.isActivo());
        return mapToDTO(repository.save(model));
    }

    private UnidadNegocioDTO mapToDTO(UnidadNegocio model) {
        UnidadNegocioDTO dto = new UnidadNegocioDTO();
        dto.setId(model.getId());
        dto.setNombre(model.getNombre());
        dto.setDescripcion(model.getDescripcion());
        dto.setCostoEnvioPorcentaje(model.getCostoEnvioPorcentaje());
        dto.setActivo(model.isActivo());
        return dto;
    }
}
