package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.InsumoDTO;
import com.vivero.gestion.models.Insumo;
import com.vivero.gestion.repositories.InsumoRepository;
import com.vivero.gestion.services.InsumoService;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
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
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        if (unidadId == null) {
            throw new RuntimeException("No se puede crear un insumo sin contexto de unidad de negocio activa.");
        }

        Insumo insumo = new Insumo();
        insumo.setNombre(dto.getNombre());
        insumo.setDescripcion(dto.getDescripcion());
        insumo.setPrecio(dto.getPrecio());
        insumo.setFechaCompra(dto.getFechaCompra() != null
                ? dto.getFechaCompra()
                : LocalDateTime.now(ZoneId.of("America/Argentina/Buenos_Aires")));
        insumo.setStock(dto.getStock() != null ? dto.getStock() : 0);
        
        insumo.setUnidadNegocio(unidadNegocioRepository.findById(unidadId).orElseThrow(() -> new RuntimeException("Unidad de negocio no encontrada")));

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
        Long unidadId = UnidadNegocioContextHolder.getUnidadNegocioId();
        List<Insumo> insumos;
        if (unidadId != null) {
            insumos = insumoRepository.findAllByUnidadNegocioId(unidadId);
        } else {
            insumos = insumoRepository.findAll();
        }
        return insumos.stream()
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
        if (dto.getFechaCompra() != null) insumo.setFechaCompra(dto.getFechaCompra());
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
                insumo.getFechaCompra(),
                insumo.getStock(),
                insumo.getUnidadNegocio() != null ? insumo.getUnidadNegocio().getId() : null
        );
    }
}
