package com.vivero.gestion.services;

import java.util.List;

import com.vivero.gestion.dto.ProveedorDTO;

public interface ProveedorService {
    List<ProveedorDTO> getAll();
    ProveedorDTO getById(Long id);
    ProveedorDTO create(ProveedorDTO dto);
    ProveedorDTO update(Long id, ProveedorDTO dto);
    void delete(Long id);
}
