package com.vivero.gestion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ChequeDTO {
    private Long id;
    private LocalDate fechaRecepcion;
    private Long clienteId;
    private String clienteNombre;
    private Long ventaId;
    private String numeroInterno;
    private BigDecimal monto;
    private String banco;
    private LocalDate fechaCobro;
    private String numeroSerie;
    private String estado;
    private LocalDate fechaEntrega;
    private String entregadoA;
    private Boolean esEmisionPropia;
    private Long endosadoAClienteId;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getFechaRecepcion() {
        return fechaRecepcion;
    }

    public void setFechaRecepcion(LocalDate fechaRecepcion) {
        this.fechaRecepcion = fechaRecepcion;
    }

    public Long getClienteId() {
        return clienteId;
    }

    public void setClienteId(Long clienteId) {
        this.clienteId = clienteId;
    }

    public String getClienteNombre() {
        return clienteNombre;
    }

    public void setClienteNombre(String clienteNombre) {
        this.clienteNombre = clienteNombre;
    }

    public Long getVentaId() {
        return ventaId;
    }

    public void setVentaId(Long ventaId) {
        this.ventaId = ventaId;
    }

    public String getNumeroInterno() {
        return numeroInterno;
    }

    public void setNumeroInterno(String numeroInterno) {
        this.numeroInterno = numeroInterno;
    }

    public BigDecimal getMonto() {
        return monto;
    }

    public void setMonto(BigDecimal monto) {
        this.monto = monto;
    }

    public String getBanco() {
        return banco;
    }

    public void setBanco(String banco) {
        this.banco = banco;
    }

    public LocalDate getFechaCobro() {
        return fechaCobro;
    }

    public void setFechaCobro(LocalDate fechaCobro) {
        this.fechaCobro = fechaCobro;
    }

    public String getNumeroSerie() {
        return numeroSerie;
    }

    public void setNumeroSerie(String numeroSerie) {
        this.numeroSerie = numeroSerie;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public LocalDate getFechaEntrega() {
        return fechaEntrega;
    }

    public void setFechaEntrega(LocalDate fechaEntrega) {
        this.fechaEntrega = fechaEntrega;
    }

    public String getEntregadoA() {
        return entregadoA;
    }

    public void setEntregadoA(String entregadoA) {
        this.entregadoA = entregadoA;
    }

    public Boolean getEsEmisionPropia() {
        return esEmisionPropia;
    }

    public void setEsEmisionPropia(Boolean esEmisionPropia) {
        this.esEmisionPropia = esEmisionPropia;
    }

    public Long getEndosadoAClienteId() {
        return endosadoAClienteId;
    }

    public void setEndosadoAClienteId(Long endosadoAClienteId) {
        this.endosadoAClienteId = endosadoAClienteId;
    }
}
