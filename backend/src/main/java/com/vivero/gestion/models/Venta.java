package com.vivero.gestion.models;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
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

    // NotFoundAction.IGNORE (tarea 3.5 de tasks.md de clientes-dni-cuil): un Cliente
    // soft-eliminado (@SQLRestriction) ya no matchea el filtro de la fila referenciada por
    // cliente_id, y sin esta anotación Hibernate 6 lanza FetchNotFoundException al listar ventas
    // (findAllByUnidadNegocioIdOrderByFechaDesc, fetch EAGER por defecto de @ManyToOne) en vez de
    // devolver simplemente null -- que es lo que mapearAVentaResponseDTO ya sabía manejar
    // ("(eliminado)", clienteDni/clienteCuil en null) pero nunca llegaba a ejecutarse.
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    @NotFound(action = NotFoundAction.IGNORE)
    private Cliente cliente;

    @Column(name = "cliente_nombre_casual")
    private String clienteNombreCasual;

    @Column(name = "cliente_telefono_casual")
    private String clienteTelefonoCasual;

    // Documento puntual de una venta a cliente casual (Decisión 2 de design.md de
    // clientes-dni-cuil): "qué documento mostró quien compró en este mostrador, esta vez", no un
    // dato de ficha. Ambos nullable; el par se guarda completo o vacío (nunca un tipo sin valor).
    @Enumerated(EnumType.STRING)
    @Column(name = "cliente_documento_casual_tipo")
    private TipoDocumento clienteDocumentoCasualTipo;

    @Column(name = "cliente_documento_casual_valor")
    private String clienteDocumentoCasualValor;

    @ManyToOne
    @JoinColumn(name = "usuario_id")
    private Usuario usuario; // Quien registra la venta

    @ManyToOne
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    @Enumerated(EnumType.STRING)
    @Column(name = "cuenta_abono")
    // Nullable. NULL significa "no aplica cuenta" (Vivero, Herramientas, histórico).
    private com.vivero.gestion.models.CuentaAbono cuentaAbono;

    private BigDecimal subtotal;
    private BigDecimal porcentajeDescuento;
    private BigDecimal descuento;
    private BigDecimal totalFinal;
    
    private String estadoPago; // PAGADO, PARCIAL, DEBE
    private LocalDateTime fecha;
    private String remitoUrl;

    @ManyToOne
    @JoinColumn(name = "factura_id")
    private FacturaCliente factura;

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
    public String getClienteNombreCasual() { return clienteNombreCasual; }
    public void setClienteNombreCasual(String clienteNombreCasual) { this.clienteNombreCasual = clienteNombreCasual; }
    public String getClienteTelefonoCasual() { return clienteTelefonoCasual; }
    public void setClienteTelefonoCasual(String clienteTelefonoCasual) { this.clienteTelefonoCasual = clienteTelefonoCasual; }
    public TipoDocumento getClienteDocumentoCasualTipo() { return clienteDocumentoCasualTipo; }
    public void setClienteDocumentoCasualTipo(TipoDocumento clienteDocumentoCasualTipo) { this.clienteDocumentoCasualTipo = clienteDocumentoCasualTipo; }
    public String getClienteDocumentoCasualValor() { return clienteDocumentoCasualValor; }
    public void setClienteDocumentoCasualValor(String clienteDocumentoCasualValor) { this.clienteDocumentoCasualValor = clienteDocumentoCasualValor; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    public com.vivero.gestion.models.CuentaAbono getCuentaAbono() { return cuentaAbono; }
    public void setCuentaAbono(com.vivero.gestion.models.CuentaAbono cuentaAbono) { this.cuentaAbono = cuentaAbono; }
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
    
    public FacturaCliente getFactura() { return factura; }
    public void setFactura(FacturaCliente factura) { this.factura = factura; }
    
    public void addDetalle(VentaDetalle detalle) {
        detalles.add(detalle);
        detalle.setVenta(this);
    }

    public void addPago(Pago pago) {
        pagos.add(pago);
        pago.setVenta(this);
    }
}
