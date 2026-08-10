package com.vivero.gestion.services;

import java.util.List;

import com.vivero.gestion.dto.UsuarioRequestDTO;
import com.vivero.gestion.dto.UsuarioResponseDTO;

public interface UsuarioService {
    List<UsuarioResponseDTO> getAll();
    UsuarioResponseDTO getById(Long id);
    UsuarioResponseDTO create(UsuarioRequestDTO dto);
    UsuarioResponseDTO update(Long id, UsuarioRequestDTO dto);
    void delete(Long id);
}
