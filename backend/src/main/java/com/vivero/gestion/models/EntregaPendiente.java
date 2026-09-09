package com.vivero.gestion.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

/**
 * Change entregas-pendientes-confirmacion-vivero, Decisión 12 de design.md. Registro de que un
 * cliente se llevó mercadería del vivero SIN venta ni precio todavía: el empleado la registra (el
 * stock ya se descontó, con firma del cliente como constancia), y el dueño la confirma después
 * (asignando precio, lo que recién ahí crea la {@link Venta} real) o la rechaza (repone el
 * stock). Exclusivo de la unidad de negocio Vivero (guard en el service, no sólo en el menú).
 */
@Entity
@Table(name = "entregas_pendientes")
@SQLDelete(sql = "UPDATE entregas_pendientes SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class EntregaPendiente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // NOT NULL a propósito (Decisión 7 de design.md): una entrega pendiente es crédito otorgado,
    // no admite cliente casual/ad-hoc.
    //
    // NotFoundAction.IGNORE (hallazgo de auditoría, finding #1): un Cliente puede darse de baja
    // (soft delete, @SQLRestriction en Cliente.java) DESPUÉS de registrarse la entrega -- sin esta
    // anotación, Hibernate 6 lanza FetchNotFoundException al listar/leer (fetch EAGER por defecto
    // de @ManyToOne) en vez de devolver simplemente null, que es lo que
    // EntregaPendienteServiceImpl ya sabe manejar ("(eliminado)"). Mismo patrón exacto que
    // Venta.cliente (ver su comentario, change clientes-dni-cuil tarea 3.5).
    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    @NotFound(action = NotFoundAction.IGNORE)
    private Cliente cliente;

    // El empleado que registró la entrega (resuelto del Authentication en el service, nunca del
    // body).
    @ManyToOne
    @JoinColumn(name = "usuario_registro_id", nullable = false)
    private Usuario usuarioRegistro;

    @ManyToOne
    @JoinColumn(name = "unidad_negocio_id", nullable = false)
    private UnidadNegocio unidadNegocio;

    @Column(nullable = false)
    private LocalDateTime fecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) default 'PENDIENTE'")
    private EstadoEntregaPendiente estado = EstadoEntregaPendiente.PENDIENTE;

    // Data-URL PNG completa (Decisión 5 de design.md): "data:image/png;base64,...". NUNCA se
    // incluye en un listado/resumen -- sólo se trae explícitamente vía GET /{id}/firma (Decisión
    // 6, ver EntregaPendienteResumenDTO/EntregaPendienteRepository).
    @Column(name = "firma_base64", columnDefinition = "TEXT", nullable = false)
    private String firmaBase64;

    @Column(length = 500)
    private String observacion;

    // Sólo se completa al confirmarse (Decisión 4/11).
    @ManyToOne
    @JoinColumn(name = "venta_id")
    private Venta venta;

    // Quién confirmó o rechazó (el dueño). Sólo se completa al resolverse.
    @ManyToOne
    @JoinColumn(name = "usuario_resolucion_id")
    private Usuario usuarioResolucion;

    private LocalDateTime fechaResolucion;

    @Column(length = 500)
    private String motivoRechazo;

    // @BatchSize (hallazgo de auditoría, finding #5): `detalles` es @OneToMany, así que NO se
    // puede sumar a los LEFT JOIN FETCH de EntregaPendienteRepository sin romper la paginación
    // (JOIN FETCH de una colección bajo Pageable multiplica filas -- Hibernate directamente lo
    // deshabilita y pagina en memoria). @BatchSize junta hasta 20 entregas de la misma página en
    // un solo SELECT ... WHERE entrega_id IN (...) para sus detalles, en vez de un SELECT por
    // entrega -- mismo resultado práctico (colapsa el N+1) sin tocar la paginación.
    @OneToMany(mappedBy = "entrega", cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 20)
    private List<EntregaPendienteDetalle> detalles = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    public EntregaPendiente() {}

    public void addDetalle(EntregaPendienteDetalle detalle) {
        detalle.setEntrega(this);
        this.detalles.add(detalle);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }

    public Usuario getUsuarioRegistro() { return usuarioRegistro; }
    public void setUsuarioRegistro(Usuario usuarioRegistro) { this.usuarioRegistro = usuarioRegistro; }

    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }

    public EstadoEntregaPendiente getEstado() { return estado; }
    public void setEstado(EstadoEntregaPendiente estado) { this.estado = estado; }

    public String getFirmaBase64() { return firmaBase64; }
    public void setFirmaBase64(String firmaBase64) { this.firmaBase64 = firmaBase64; }

    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }

    public Venta getVenta() { return venta; }
    public void setVenta(Venta venta) { this.venta = venta; }

    public Usuario getUsuarioResolucion() { return usuarioResolucion; }
    public void setUsuarioResolucion(Usuario usuarioResolucion) { this.usuarioResolucion = usuarioResolucion; }

    public LocalDateTime getFechaResolucion() { return fechaResolucion; }
    public void setFechaResolucion(LocalDateTime fechaResolucion) { this.fechaResolucion = fechaResolucion; }

    public String getMotivoRechazo() { return motivoRechazo; }
    public void setMotivoRechazo(String motivoRechazo) { this.motivoRechazo = motivoRechazo; }

    public List<EntregaPendienteDetalle> getDetalles() { return detalles; }
    public void setDetalles(List<EntregaPendienteDetalle> detalles) { this.detalles = detalles; }

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }
}
