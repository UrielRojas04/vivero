package com.vivero.gestion.dto;

import java.math.BigDecimal;

public class DevolucionProductoDTO {
    private Long clienteId;
    private Long productoId;
    private Integer cantidad;
    private BigDecimal montoAcreditar;

    public DevolucionProductoDTO() {}

    public Long getClienteId() {
        return clienteId;
    }

    public void setClienteId(Long clienteId) {
        this.clienteId = clienteId;
    }

    public Long getProductoId() {
        return productoId;
    }

    public void setProductoId(Long productoId) {
        this.productoId = productoId;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
    }

    public BigDecimal getMontoAcreditar() {
        return montoAcreditar;
    }

    public void setMontoAcreditar(BigDecimal montoAcreditar) {
        this.montoAcreditar = montoAcreditar;
    }
}
