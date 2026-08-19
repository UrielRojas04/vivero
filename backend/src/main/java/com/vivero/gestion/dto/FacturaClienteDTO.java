package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Documento consolidado de cuenta corriente de un cliente ("factura dinámica"): agrega todo su
 * historial de ventas (con ítems y pagos), lo totaliza, y lo concilia contra el saldo real de su
 * cuenta corriente. Ver openspec/changes/factura-cliente-dinamica/design.md, Decisión 2.
 */
public class FacturaClienteDTO {
    private Long clienteId;
    private String clienteNombre;
    private String clienteTelefono;
    private LocalDateTime fechaGeneracion;
    private List<VentaResponseDTO> ventas;
    private Integer cantidadVentas;
    // Cheques sueltos del cliente: la única parte de "otros movimientos" con registro real. El
    // ajuste manual de saldo no tiene entidad propia y no se puede desglosar (Decisión 4/6 de
    // openspec/changes/.../factura-cliente-dinamica/design.md).
    private List<ChequeDTO> cheques;
    private BigDecimal totalVentas;
    private BigDecimal totalPagado;
    private BigDecimal saldoSegunVentas;
    private BigDecimal balanceDinero;
    private BigDecimal diferenciaNoItemizada;

    public FacturaClienteDTO() {}

    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long clienteId) { this.clienteId = clienteId; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getClienteTelefono() { return clienteTelefono; }
    public void setClienteTelefono(String clienteTelefono) { this.clienteTelefono = clienteTelefono; }

    public LocalDateTime getFechaGeneracion() { return fechaGeneracion; }
    public void setFechaGeneracion(LocalDateTime fechaGeneracion) { this.fechaGeneracion = fechaGeneracion; }

    public List<VentaResponseDTO> getVentas() { return ventas; }
    public void setVentas(List<VentaResponseDTO> ventas) { this.ventas = ventas; }

    public Integer getCantidadVentas() { return cantidadVentas; }
    public void setCantidadVentas(Integer cantidadVentas) { this.cantidadVentas = cantidadVentas; }

    public List<ChequeDTO> getCheques() { return cheques; }
    public void setCheques(List<ChequeDTO> cheques) { this.cheques = cheques; }

    public BigDecimal getTotalVentas() { return totalVentas; }
    public void setTotalVentas(BigDecimal totalVentas) { this.totalVentas = totalVentas; }

    public BigDecimal getTotalPagado() { return totalPagado; }
    public void setTotalPagado(BigDecimal totalPagado) { this.totalPagado = totalPagado; }

    public BigDecimal getSaldoSegunVentas() { return saldoSegunVentas; }
    public void setSaldoSegunVentas(BigDecimal saldoSegunVentas) { this.saldoSegunVentas = saldoSegunVentas; }

    public BigDecimal getBalanceDinero() { return balanceDinero; }
    public void setBalanceDinero(BigDecimal balanceDinero) { this.balanceDinero = balanceDinero; }

    public BigDecimal getDiferenciaNoItemizada() { return diferenciaNoItemizada; }
    public void setDiferenciaNoItemizada(BigDecimal diferenciaNoItemizada) { this.diferenciaNoItemizada = diferenciaNoItemizada; }
}
