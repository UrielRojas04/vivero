package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.InsumoDTO;
import com.vivero.gestion.models.Insumo;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.InsumoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.services.InsumoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class InsumoServiceImpl implements InsumoService {

    private final InsumoRepository insumoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    public InsumoServiceImpl(InsumoRepository insumoRepository, UnidadNegocioRepository unidadNegocioRepository) {
        this.insumoRepository = insumoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
    }

    @Override
    @Transactional
    public InsumoDTO crearInsumo(InsumoDTO dto) {
        if (dto.getUnidadNegocioId() == null) {
            throw new IllegalArgumentException("El ID de unidad de negocio es requerido");
        }

        UnidadNegocio unidad = unidadNegocioRepository.findById(dto.getUnidadNegocioId())
                .orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada"));

        Insumo insumo = new Insumo();
        insumo.setNombre(dto.getNombre());
        insumo.setDescripcion(dto.getDescripcion());
        insumo.setPrecio(dto.getPrecio());
        insumo.setStock(dto.getStock() != null ? dto.getStock() : 0);
        insumo.setUnidadNegocio(unidad);

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

        if (dto.getUnidadNegocioId() != null && !dto.getUnidadNegocioId().equals(insumo.getUnidadNegocio().getId())) {
            UnidadNegocio unidad = unidadNegocioRepository.findById(dto.getUnidadNegocioId())
                    .orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada"));
            insumo.setUnidadNegocio(unidad);
        }

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
                insumo.getStock(),
                insumo.getUnidadNegocio().getId()
        );
    }
}
