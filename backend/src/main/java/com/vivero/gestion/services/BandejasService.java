package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteBandejasDTO;
import com.vivero.gestion.dto.HistorialBandejasDTO;
import com.vivero.gestion.models.Venta;
import java.util.List;

public interface BandejasService {
    void registrarEntrega(Long clienteId, Integer cantidad, Venta venta, String username);
    void registrarDevolucion(Long clienteId, Integer cantidad, String username);
    List<HistorialBandejasDTO> obtenerHistorialPorCliente(Long clienteId);

    /**
     * Clientes con su saldo de bandejas únicamente (sin datos de dinero ni contacto), para la
     * pantalla de Devolución de Bandejas. Ver ClienteBandejasDTO.
     */
    List<ClienteBandejasDTO> listarClientesParaBandejas();
}
