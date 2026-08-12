package com.vivero.gestion.services;

import java.util.List;
import com.vivero.gestion.dto.VariedadBandejaDTO;

public interface VariedadBandejaService {
    List<VariedadBandejaDTO> obtenerTodas();
    VariedadBandejaDTO obtenerPorId(Long id);
    VariedadBandejaDTO crear(VariedadBandejaDTO dto);
    VariedadBandejaDTO actualizar(Long id, VariedadBandejaDTO dto);
    void eliminar(Long id);
}
