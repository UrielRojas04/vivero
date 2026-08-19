package com.vivero.gestion.services;

import com.vivero.gestion.dto.ChequeDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ChequeService {
    Page<ChequeDTO> listarCheques(Pageable pageable);
    ChequeDTO obtenerPorId(Long id);
    ChequeDTO crearCheque(ChequeDTO dto);
    ChequeDTO actualizarEstado(Long id, ChequeDTO dto);

    /**
     * Cheques de un cliente puntual (reutiliza el mismo mapeo que listarCheques). Usado por el
     * documento de cuenta corriente para desglosar los cheques sueltos como "otros movimientos".
     */
    List<ChequeDTO> listarChequesPorCliente(Long clienteId);
}
