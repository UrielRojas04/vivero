package com.vivero.gestion.services;

import com.vivero.gestion.dto.FacturaClienteDTO;
import com.vivero.gestion.dto.FacturaConceptoDTO;
import java.util.List;

public interface FacturaClienteService {
    FacturaClienteDTO obtenerFacturaActiva(Long clienteId);
    List<FacturaClienteDTO> listarHistorialFacturas(Long clienteId);
    FacturaClienteDTO agregarConcepto(Long facturaId, FacturaConceptoDTO request);
    FacturaClienteDTO registrarPago(Long facturaId, com.vivero.gestion.dto.PagoRequestDTO request);
    FacturaClienteDTO abrirFacturaManual(Long clienteId);
    FacturaClienteDTO cerrarFactura(Long facturaId);
    void rechazarPago(Long pagoId);
}
