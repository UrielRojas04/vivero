package com.vivero.gestion.dto;

import java.util.List;

public class VentaRequestDTO {
    private Long clienteId;
    private List<VentaDetalleRequestDTO> detalles;

    public VentaRequestDTO() {}

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public List<VentaDetalleRequestDTO> getDetalles() { return detalles; }
    public void setDetalles(List<VentaDetalleRequestDTO> detalles) { this.detalles = detalles; }
}
