package com.vivero.gestion.services;

import java.util.List;
import com.vivero.gestion.dto.UnidadNegocioDTO;

public interface UnidadNegocioService {
    List<UnidadNegocioDTO> obtenerTodasActivas();
    UnidadNegocioDTO crear(UnidadNegocioDTO dto);
    UnidadNegocioDTO actualizar(Long id, UnidadNegocioDTO dto);

    // Usado desde @PreAuthorize en UnidadNegocioController (ver comentario ahí): ESCRIBIR_STOCK
    // sólo debe habilitar el PUT de este endpoint para la unidad Herramientas (donde gatea
    // "Costos de Envío" en el frontend), no para Vivero/Abono -- resuelto por nombre, no por un
    // id hardcodeado, mismo criterio que ya usa unidadSlug en el frontend.
    boolean esHerramientas(Long id);
}
