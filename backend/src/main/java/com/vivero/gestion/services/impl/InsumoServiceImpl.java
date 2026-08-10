package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.InsumoDTO;
import com.vivero.gestion.models.Insumo;
import com.vivero.gestion.repositories.InsumoRepository;
import com.vivero.gestion.services.InsumoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class InsumoServiceImpl implements InsumoService {

    private final InsumoRepository insumoRepository;
    @Autowired
    public InsumoServiceImpl(InsumoRepository insumoRepository) {
        this.insumoRepository = insumoRepository;
    }

    @Override
    @Transactional
    public InsumoDTO crearInsumo(InsumoDTO dto) {
        Insumo insumo = new Insumo();
        insumo.setNombre(dto.getNombre());
        insumo.setDescripcion(dto.getDescripcion());
        insumo.setPrecio(dto.getPrecio());
        insumo.setStock(dto.getStock() != null ? dto.getStock() : 0);

        Insumo guardado = insumoRepository.save(insumo);
        return mapToDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public InsumoDTO obtenerInsumoPorId(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        return mapToDTO(insumo);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InsumoDTO> obtenerTodosLosInsumos() {
        return insumoRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public InsumoDTO actualizarInsumo(Long id, InsumoDTO dto) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));

        if (dto.getNombre() != null) insumo.setNombre(dto.getNombre());
        if (dto.getDescripcion() != null) insumo.setDescripcion(dto.getDescripcion());
        if (dto.getPrecio() != null) insumo.setPrecio(dto.getPrecio());
        if (dto.getStock() != null) insumo.setStock(dto.getStock());


        Insumo actualizado = insumoRepository.save(insumo);
        return mapToDTO(actualizado);
    }

    @Override
    @Transactional
    public void eliminarInsumo(Long id) {
        Insumo insumo = insumoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Insumo no encontrado"));
        insumoRepository.delete(insumo);
    }

    private InsumoDTO mapToDTO(Insumo insumo) {
        return new InsumoDTO(
                insumo.getId(),
                insumo.getNombre(),
                insumo.getDescripcion(),
                insumo.getPrecio(),
                insumo.getStock()
        );
    }
}
