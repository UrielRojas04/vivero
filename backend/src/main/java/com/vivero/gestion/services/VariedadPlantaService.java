package com.vivero.gestion.services;

import java.util.List;
import com.vivero.gestion.dto.VariedadPlantaDTO;

public interface VariedadPlantaService {
    List<VariedadPlantaDTO> obtenerTodas();
    VariedadPlantaDTO obtenerPorId(Long id);
    VariedadPlantaDTO crear(VariedadPlantaDTO dto);
    VariedadPlantaDTO actualizar(Long id, VariedadPlantaDTO dto);
    void eliminar(Long id);
}
