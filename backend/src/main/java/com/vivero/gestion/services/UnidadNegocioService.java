package com.vivero.gestion.services;

import java.util.List;
import com.vivero.gestion.dto.UnidadNegocioDTO;

public interface UnidadNegocioService {
    List<UnidadNegocioDTO> obtenerTodasActivas();
    UnidadNegocioDTO crear(UnidadNegocioDTO dto);
    UnidadNegocioDTO actualizar(Long id, UnidadNegocioDTO dto);
}
