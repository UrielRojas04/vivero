package com.vivero.gestion.services;

import com.vivero.gestion.dto.MarcaDTO;
import java.util.List;

public interface MarcaService {
    MarcaDTO crearMarca(MarcaDTO dto);
    List<MarcaDTO> obtenerTodasLasMarcas();
    MarcaDTO actualizarMarca(Long id, MarcaDTO dto);
    void eliminarMarca(Long id);
}
