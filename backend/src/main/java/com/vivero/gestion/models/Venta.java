package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "ventas")
@SQLDelete(sql = "UPDATE ventas SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario; // Quien registra la venta

    private BigDecimal subtotal;
    private BigDecimal porcentajeDescuento;
    private BigDecimal descuento;
    private BigDecimal totalFinal;
    
    private String estadoPago; // PAGADO, PARCIAL, DEBE
    private LocalDateTime fecha;
    private String remitoUrl;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VentaDetalle> detalles = new ArrayList<>();

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Pago> pagos = new ArrayList<>();

    public Venta() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
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
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public String getRemitoUrl() { return remitoUrl; }
    public void setRemitoUrl(String remitoUrl) { this.remitoUrl = remitoUrl; }
    public List<VentaDetalle> getDetalles() { return detalles; }
    public void setDetalles(List<VentaDetalle> detalles) { this.detalles = detalles; }
    
    public List<Pago> getPagos() { return pagos; }
    public void setPagos(List<Pago> pagos) { this.pagos = pagos; }
    
    public void addDetalle(VentaDetalle detalle) {
        detalles.add(detalle);
        detalle.setVenta(this);
    }

    public void addPago(Pago pago) {
        pagos.add(pago);
        pago.setVenta(this);
    }
}
