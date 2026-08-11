package com.vivero.gestion.services;

import com.vivero.gestion.dto.ChequeDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ChequeService {
    Page<ChequeDTO> listarCheques(Pageable pageable);
    ChequeDTO obtenerPorId(Long id);
    ChequeDTO crearCheque(ChequeDTO dto);
    ChequeDTO actualizarEstado(Long id, ChequeDTO dto);
}
