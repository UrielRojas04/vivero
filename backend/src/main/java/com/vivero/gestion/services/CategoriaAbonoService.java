package com.vivero.gestion.services;

import com.vivero.gestion.dto.CategoriaAbonoDTO;
import java.util.List;

public interface CategoriaAbonoService {
    CategoriaAbonoDTO crear(CategoriaAbonoDTO dto);
    CategoriaAbonoDTO actualizar(Long id, CategoriaAbonoDTO dto);
    void eliminar(Long id);
    List<CategoriaAbonoDTO> obtenerTodas();
}
