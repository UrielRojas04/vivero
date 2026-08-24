package com.vivero.gestion.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Entity
@Table(name = "proveedores")
@SQLDelete(sql = "UPDATE proveedores SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
@Data
public class Proveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(length = 50)
    private String telefono;

    @Column(length = 150)
    private String contacto;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    // ---- Perfil de costeo por defecto (Decisión 1 de design.md de config-costeo-por-proveedor).
    // Los cinco campos de abajo son SÓLO valores sugeridos y copiables (Decisión 3 — OQ3, se
    // copian una sola vez al producto/línea de pedido). Ningún cálculo de costo los consulta en
    // vivo: el CostoCalculator no conoce esta entidad (tarea 12.11).

    // true = el precio de lista ya trae el IVA (gobierna la UI: pregunta el % o escribe 0
    // explícito — Decisión 4). Default true porque los 3 proveedores nuevos de la migración
    // (Ingco, Extra Power, Duroll) nacen con IVA incluido.
    @Column(name = "iva_incluido_en_precio", nullable = false, columnDefinition = "boolean default true")
    private boolean ivaIncluidoEnPrecio = true;

    // Sólo relevante si ivaIncluidoEnPrecio = false. Comodidad de tipeo, no gobierna nada.
    @Column(name = "iva_por_defecto_porcentaje", precision = 5, scale = 2)
    private BigDecimal ivaPorDefectoPorcentaje;

    // true = este proveedor cotiza ALGUNOS de sus productos en USD (gobierna si la UI ofrece el
    // selector de moneda). No implica que todos sus productos estén en USD.
    @Column(name = "maneja_dolares", nullable = false, columnDefinition = "boolean default false")
    private boolean manejaDolares = false;

    // El flete habitual, SIEMPRE como porcentaje (OQ11 — nunca un monto fijo por pedido).
    @Column(name = "costo_envio_por_defecto_porcentaje", precision = 5, scale = 2)
    private BigDecimal costoEnvioPorDefectoPorcentaje;

    // Lista libre de descuentos por defecto, calcada de Producto.descuentos. @BatchSize evita el
    // N+1 en el listado de proveedores (mismo criterio que Decisión 11 de costeo-flexible-por-producto,
    // para no reintroducirlo acá).
    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    private List<ProveedorDescuento> descuentosPorDefecto = new ArrayList<>();

    // Sexto campo, de naturaleza distinta: NO es un default aplicable (Decisión 5 — OQ2). Sólo
    // ayuda de tipeo con su antigüedad a la vista, escrita al confirmar un pedido que llevó
    // cotización (grupo 7, fuera de alcance del grupo 5). El backend nunca la resuelve sola, nunca
    // la usa como fallback y nunca la aplica a una operación. No es un campo editable del
    // formulario de proveedor (grupo 4).
    @Column(name = "ultima_cotizacion_conocida", precision = 12, scale = 4)
    private BigDecimal ultimaCotizacionConocida;

    @Column(name = "fecha_ultima_cotizacion")
    private LocalDateTime fechaUltimaCotizacion;
}
