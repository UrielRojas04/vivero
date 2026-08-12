package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "cheques")
@SQLDelete(sql = "UPDATE cheques SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class Cheque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate fechaRecepcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id")
    private Venta venta;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @Column(length = 50)
    private String numeroInterno;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto;

    @Column(length = 100)
    private String banco;

    private LocalDate fechaCobro;

    @Column(length = 100)
    private String numeroSerie;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoCheque estado = EstadoCheque.EN_CARTERA;

    private LocalDate fechaEntrega;

    @Column(length = 150)
    private String entregadoA;

    @Column(columnDefinition = "boolean default false")
    private Boolean esEmisionPropia = false;

    // Getters and Setters

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

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public Venta getVenta() {
        return venta;
    }

    public void setVenta(Venta venta) {
        this.venta = venta;
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

    public EstadoCheque getEstado() {
        return estado;
    }

    public void setEstado(EstadoCheque estado) {
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
}
