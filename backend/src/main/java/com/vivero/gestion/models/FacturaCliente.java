package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "facturas_cliente")
public class FacturaCliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "unidad_negocio_id", nullable = false)
    private UnidadNegocio unidadNegocio;

    @Column(nullable = false)
    private LocalDateTime fechaApertura;

    private LocalDateTime fechaCierre;

    @Column(nullable = false)
    private String estado; // ABIERTA, CERRADA

    @OneToMany(mappedBy = "factura")
    private List<Venta> ventas = new ArrayList<>();

    @OneToMany(mappedBy = "factura")
    private List<Pago> pagos = new ArrayList<>();

    @OneToMany(mappedBy = "factura", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FacturaConcepto> conceptos = new ArrayList<>();

    public FacturaCliente() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    public LocalDateTime getFechaApertura() { return fechaApertura; }
    public void setFechaApertura(LocalDateTime fechaApertura) { this.fechaApertura = fechaApertura; }
    public LocalDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(LocalDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public List<Venta> getVentas() { return ventas; }
    public void setVentas(List<Venta> ventas) { this.ventas = ventas; }
    public List<Pago> getPagos() { return pagos; }
    public void setPagos(List<Pago> pagos) { this.pagos = pagos; }
    public List<FacturaConcepto> getConceptos() { return conceptos; }
    public void setConceptos(List<FacturaConcepto> conceptos) { this.conceptos = conceptos; }
    
    public void addConcepto(FacturaConcepto concepto) {
        conceptos.add(concepto);
        concepto.setFactura(this);
    }
}
