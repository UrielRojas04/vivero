package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class FacturaClienteDTO {
    private Long id;
    private Long clienteId;
    private String clienteNombre;
    private String clienteTelefono;
    private LocalDateTime fechaApertura;
    private LocalDateTime fechaCierre;
    private String estado;
    
    private List<VentaResponseDTO> ventas;
    private List<PagoResponseDTO> pagos;
    private List<FacturaConceptoDTO> conceptos;

    private BigDecimal totalVentas;
    private BigDecimal totalPagos;
    private BigDecimal totalConceptos;
    private BigDecimal saldoDeudor;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }
    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    
    public List<VentaResponseDTO> getVentas() { return ventas; }
    public void setVentas(List<VentaResponseDTO> ventas) { this.ventas = ventas; }
    public List<PagoResponseDTO> getPagos() { return pagos; }
    public void setPagos(List<PagoResponseDTO> pagos) { this.pagos = pagos; }
    public List<FacturaConceptoDTO> getConceptos() { return conceptos; }
    public void setConceptos(List<FacturaConceptoDTO> conceptos) { this.conceptos = conceptos; }
    
    public BigDecimal getTotalVentas() { return totalVentas; }
    public void setTotalVentas(BigDecimal totalVentas) { this.totalVentas = totalVentas; }
    public BigDecimal getTotalPagos() { return totalPagos; }
    public void setTotalPagos(BigDecimal totalPagos) { this.totalPagos = totalPagos; }
    public BigDecimal getTotalConceptos() { return totalConceptos; }
    public void setTotalConceptos(BigDecimal totalConceptos) { this.totalConceptos = totalConceptos; }
    public BigDecimal getSaldoDeudor() { return saldoDeudor; }
    public void setSaldoDeudor(BigDecimal saldoDeudor) { this.saldoDeudor = saldoDeudor; }
}
