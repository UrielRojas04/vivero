package com.vivero.gestion.services;

import java.util.List;

import com.vivero.gestion.dto.PermisoDTO;
import com.vivero.gestion.dto.RolDTO;
import com.vivero.gestion.dto.RolRequestDTO;

public interface RolService {
    List<RolDTO> getAll();
    RolDTO getById(Long id);
    RolDTO create(RolRequestDTO dto);
    RolDTO update(Long id, RolRequestDTO dto);
    void delete(Long id);
    List<PermisoDTO> getAllPermisos();
}
