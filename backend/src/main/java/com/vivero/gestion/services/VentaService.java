package com.vivero.gestion.services;

import com.vivero.gestion.dto.VentaRequestDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import java.util.List;

public interface VentaService {
    VentaResponseDTO crearVenta(VentaRequestDTO request, String username);
    List<VentaResponseDTO> listarVentas();
}
