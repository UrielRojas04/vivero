package com.vivero.gestion.services;

import com.vivero.gestion.dto.InsumoDTO;
import java.util.List;

public interface InsumoService {
    InsumoDTO crearInsumo(InsumoDTO insumoDTO);
    InsumoDTO obtenerInsumoPorId(Long id);
    List<InsumoDTO> obtenerTodosLosInsumos();
    InsumoDTO actualizarInsumo(Long id, InsumoDTO insumoDTO);
    void eliminarInsumo(Long id);
}
