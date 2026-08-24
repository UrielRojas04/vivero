package com.vivero.gestion.services;

import java.util.List;
import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.dto.CuentaCorrienteDTO;

public interface ClienteService {
    List<ClienteDTO> getAll();
    ClienteDTO getById(Long id);
    ClienteDTO create(ClienteDTO clienteDTO);
    ClienteDTO update(Long id, ClienteDTO clienteDTO);
    void delete(Long id);
    ClienteDTO ajustarSaldo(Long id, java.math.BigDecimal monto);
    CuentaCorrienteDTO obtenerFactura(Long id);
}
