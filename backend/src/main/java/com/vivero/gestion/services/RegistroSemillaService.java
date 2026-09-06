package com.vivero.gestion.services;

import java.util.List;

import com.vivero.gestion.dto.RegistroSemillaDTO;

public interface RegistroSemillaService {
    List<RegistroSemillaDTO> obtenerTodos();
    RegistroSemillaDTO obtenerPorId(Long id);
    RegistroSemillaDTO crear(RegistroSemillaDTO dto, Long usuarioId);
    RegistroSemillaDTO actualizar(Long id, RegistroSemillaDTO dto);
    void eliminar(Long id);
    RegistroSemillaDTO consumir(Long id);
    List<RegistroSemillaDTO> obtenerAlertas();
}
