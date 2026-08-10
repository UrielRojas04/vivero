package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class VentaResponseDTO {
    private Long id;
    private String clienteNombre;
    private String usuarioNombre;
    private BigDecimal subtotal;
    private BigDecimal porcentajeDescuento;
    private BigDecimal descuento;
    private BigDecimal totalFinal;
    private String estadoPago;
    private Integer bandejasEntregadas;
    private LocalDateTime fecha;
    private String remitoUrl;
    private List<VentaDetalleResponseDTO> detalles;
    private List<PagoResponseDTO> pagos;

    public VentaResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getPorcentajeDescuento() { return porcentajeDescuento; }
    public void setPorcentajeDescuento(BigDecimal porcentajeDescuento) { this.porcentajeDescuento = porcentajeDescuento; }
    public BigDecimal getDescuento() { return descuento; }
    public void setDescuento(BigDecimal descuento) { this.descuento = descuento; }
    public BigDecimal getTotalFinal() { return totalFinal; }
    public void setTotalFinal(BigDecimal totalFinal) { this.totalFinal = totalFinal; }
    public String getEstadoPago() { return estadoPago; }
    public void setEstadoPago(String estadoPago) { this.estadoPago = estadoPago; }
    public Integer getBandejasEntregadas() { return bandejasEntregadas; }
    public void setBandejasEntregadas(Integer bandejasEntregadas) { this.bandejasEntregadas = bandejasEntregadas; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getRemitoUrl() { return remitoUrl; }
    public void setRemitoUrl(String remitoUrl) { this.remitoUrl = remitoUrl; }
    public List<VentaDetalleResponseDTO> getDetalles() { return detalles; }
    public void setDetalles(List<VentaDetalleResponseDTO> detalles) { this.detalles = detalles; }
    public List<PagoResponseDTO> getPagos() { return pagos; }
    public void setPagos(List<PagoResponseDTO> pagos) { this.pagos = pagos; }
}
