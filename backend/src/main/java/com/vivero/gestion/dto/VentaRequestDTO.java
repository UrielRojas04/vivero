package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.ArrayList;

public class VentaRequestDTO {
    private Long clienteId;
    private BigDecimal porcentajeDescuento;
    private Integer bandejasEntregadas;
    private List<VentaDetalleRequestDTO> detalles = new ArrayList<>();
    private List<PagoRequestDTO> pagos = new ArrayList<>();

    public VentaRequestDTO() {}

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    
    public BigDecimal getPorcentajeDescuento() { return porcentajeDescuento; }
    public void setPorcentajeDescuento(BigDecimal porcentajeDescuento) { this.porcentajeDescuento = porcentajeDescuento; }

    public Integer getBandejasEntregadas() { return bandejasEntregadas; }
    public void setBandejasEntregadas(Integer bandejasEntregadas) { this.bandejasEntregadas = bandejasEntregadas; }
    
    public List<VentaDetalleRequestDTO> getDetalles() { return detalles; }
    public void setDetalles(List<VentaDetalleRequestDTO> detalles) { this.detalles = detalles; }
    
    public List<PagoRequestDTO> getPagos() { return pagos; }
    public void setPagos(List<PagoRequestDTO> pagos) { this.pagos = pagos; }
}
