package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.CategoriaAbonoDTO;
import com.vivero.gestion.models.CategoriaAbono;
import com.vivero.gestion.repositories.CategoriaAbonoRepository;
import com.vivero.gestion.services.CategoriaAbonoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoriaAbonoServiceImpl implements CategoriaAbonoService {

    private final CategoriaAbonoRepository repository;

    @Autowired
    public CategoriaAbonoServiceImpl(CategoriaAbonoRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public CategoriaAbonoDTO crear(CategoriaAbonoDTO dto) {
        CategoriaAbono entidad = new CategoriaAbono();
        entidad.setNombre(dto.getNombre());
        entidad.setDescripcion(dto.getDescripcion());
        
        entidad = repository.save(entidad);
        return mapToDTO(entidad);
    }

    @Override
    @Transactional
    public CategoriaAbonoDTO actualizar(Long id, CategoriaAbonoDTO dto) {
        CategoriaAbono entidad = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
        
        entidad.setNombre(dto.getNombre());
        entidad.setDescripcion(dto.getDescripcion());
        
        entidad = repository.save(entidad);
        return mapToDTO(entidad);
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoriaAbonoDTO> obtenerTodas() {
        return repository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private CategoriaAbonoDTO mapToDTO(CategoriaAbono entidad) {
        CategoriaAbonoDTO dto = new CategoriaAbonoDTO();
        dto.setId(entidad.getId());
        dto.setNombre(entidad.getNombre());
        dto.setDescripcion(entidad.getDescripcion());
        return dto;
    }
}
