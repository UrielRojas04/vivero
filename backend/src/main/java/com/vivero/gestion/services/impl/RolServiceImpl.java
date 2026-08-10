package com.vivero.gestion.services.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vivero.gestion.dto.PermisoDTO;
import com.vivero.gestion.dto.RolDTO;
import com.vivero.gestion.dto.RolRequestDTO;
import com.vivero.gestion.models.Permiso;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.repositories.PermisoRepository;
import com.vivero.gestion.repositories.RolRepository;
import com.vivero.gestion.services.RolService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RolServiceImpl implements RolService {

    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RolDTO> getAll() {
        return rolRepository.findAll().stream()
                .filter(r -> !r.getNombre().equalsIgnoreCase("JEFE"))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public RolDTO getById(Long id) {
        Rol rol = rolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        return mapToDTO(rol);
    }

    @Override
    @Transactional
    public RolDTO create(RolRequestDTO dto) {
        if (dto.getNombre().equalsIgnoreCase("JEFE")) {
            throw new RuntimeException("El rol JEFE está reservado y no puede ser creado");
        }

        Rol rol = new Rol();
        rol.setNombre(dto.getNombre());
        
        List<Permiso> permisos = permisoRepository.findAllById(dto.getPermisoIds());
        rol.getPermisos().addAll(permisos);
        
        Rol saved = rolRepository.save(rol);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public RolDTO update(Long id, RolRequestDTO dto) {
        Rol rol = rolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
                
        if (rol.getNombre().equalsIgnoreCase("JEFE") || dto.getNombre().equalsIgnoreCase("JEFE")) {
            throw new RuntimeException("El rol JEFE no puede ser modificado ni asignado a otro rol");
        }

        rol.setNombre(dto.getNombre());
        
        List<Permiso> permisos = permisoRepository.findAllById(dto.getPermisoIds());
        rol.getPermisos().clear();
        rol.getPermisos().addAll(permisos);
        
        Rol saved = rolRepository.save(rol);
        return mapToDTO(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Rol rol = rolRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
                
        if (rol.getNombre().equalsIgnoreCase("JEFE")) {
            throw new RuntimeException("El rol JEFE no puede ser eliminado");
        }
        
        if (rolRepository.isRolInUse(id)) {
            throw new RuntimeException("No se puede eliminar el rol porque está siendo utilizado por uno o más usuarios");
        }
        
        rolRepository.deleteRolPermisoAssociations(id);
        rolRepository.delete(rol);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermisoDTO> getAllPermisos() {
        return permisoRepository.findAll().stream()
                .map(p -> new PermisoDTO(p.getId(), p.getNombre()))
                .collect(Collectors.toList());
    }

    private RolDTO mapToDTO(Rol rol) {
        List<PermisoDTO> permisos = rol.getPermisos().stream()
                .map(p -> new PermisoDTO(p.getId(), p.getNombre()))
                .collect(Collectors.toList());
                
        boolean enUso = rolRepository.isRolInUse(rol.getId());
                
        return RolDTO.builder()
                .id(rol.getId())
                .nombre(rol.getNombre())
                .permisos(permisos)
                .enUso(enUso)
                .build();
    }
}
