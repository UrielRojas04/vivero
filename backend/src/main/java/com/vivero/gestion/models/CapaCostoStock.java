package com.vivero.gestion.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

// Entidad nueva de costeo-fifo-herramientas (el nombre del directorio es histórico: el algoritmo
// FINAL NO es FIFO — ver el encabezado de design.md/tasks.md). Decisión 1 de design.md, decidida
// por el usuario el 2026-08-21 (entidad nueva, ligada al movimiento de ingreso — Opción A,
// descartada la B de agregarle cantidadRestante a MovimientoStock).
//
// Una CapaCostoStock representa una compra concreta que todavía tiene (o tuvo) unidades sin
// vender. NO duplica el desglose de costo del movimiento que la originó (costoBase, costoNeto,
// descuentoPorcentaje, descuentoDetalle, ivaPorcentaje, envioPorcentaje) — ese desglose vive,
// congelado e inmutable, en el MovimientoStock de INGRESO/AJUSTE_INICIAL referenciado por
// `movimiento`. Acá se denormaliza UN SOLO número, `costoUnitario`, porque es el que necesita la
// consulta caliente del costo de referencia (MAX sobre las capas activas, Decisión 5) sin join.
//
// ---- CONTRATO (no romper esto en ningún camino de escritura) ----
// - `cantidadRestante` es el ÚNICO campo mutable de esta entidad. Se descuenta cuando egresa
//   mercadería (Decisión 2b) y NUNCA se reescribe por ningún otro motivo.
// - `cantidadOriginal`, `costoUnitario` y `fecha` se copian UNA VEZ, al crear la capa, y no
//   vuelven a tocarse nunca.
// - `fecha` gobierna el ORDEN DE CONSUMO de cantidades (más vieja primero, Decisión 2b) y el
//   desempate entre capas de igual costo. `fecha` NO gobierna el costo de referencia: el costo lo
//   decide `CosteoPorCapasCalculator.capaDeReferencia(...)` (grupo 5), que es el MÁXIMO
//   `costoUnitario` entre las capas con `cantidadRestante > 0`, sin importar cuál sea más vieja.
//   Estas son dos reglas independientes — no colapsarlas en la misma columna ni en el mismo orden.
// - Una capa NUNCA se borra: se agota (`cantidadRestante` llega a 0 y queda así). Por eso esta
//   entidad, a propósito, NO tiene `@SQLDelete`/`@SQLRestriction` como `MovimientoStock` y
//   `Producto`: no hay soft-delete de capas, porque no hay borrado de capas (tarea 4.4).
@Entity
@Table(name = "capas_costo_stock", indexes = {
        // Consulta caliente del costo de referencia (MAX de la @Formula, Decisión 5): agrega por
        // costo_unitario sobre las capas activas de un producto, sin necesitar orden ni desempate.
        @Index(name = "idx_capa_costo_referencia", columnList = "producto_id, cantidad_restante, costo_unitario"),
        // Descuento de cantidades (Decisión 2b) y desempate de la capa de referencia cuando dos
        // capas comparten el costo máximo: siempre (fecha ASC, id ASC).
        @Index(name = "idx_capa_costo_consumo", columnList = "producto_id, cantidad_restante, fecha, id")
})
public class CapaCostoStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "producto_id", nullable = false)
    private Producto producto;

    // El MovimientoStock de INGRESO/AJUSTE_INICIAL (cantidad > 0) que originó esta capa. Por acá
    // se sigue el desglose completo de costo cuando esta capa es la capa de referencia de un
    // egreso (grupo 6, tarea 6.5.2) — nunca se duplica ese desglose acá.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movimiento_id", nullable = false)
    private MovimientoStock movimiento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    @Column(name = "cantidad_original", nullable = false)
    private Integer cantidadOriginal;

    // Único campo mutable de la entidad (ver contrato arriba). Se descuenta al vender/egresar
    // mercadería; una capa con cantidadRestante = 0 queda agotada (excluida del MAX del costo de
    // referencia) pero no se borra.
    @Column(name = "cantidad_restante", nullable = false)
    private Integer cantidadRestante;

    // Copia congelada del MovimientoStock.costoUnitario que originó la capa. No se recalcula, no
    // se actualiza: es el número exacto que se cobró por esa mercadería.
    @Column(name = "costo_unitario", nullable = false, precision = 12, scale = 2)
    private BigDecimal costoUnitario;

    // Copia de MovimientoStock.fecha. Gobierna el orden de CONSUMO (Decisión 2b) y el desempate
    // de la capa de referencia — NO gobierna el costo, que es siempre el máximo activo.
    @Column(name = "fecha", nullable = false)
    private LocalDateTime fecha;

    public CapaCostoStock() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Producto getProducto() { return producto; }
    public void setProducto(Producto producto) { this.producto = producto; }

    public MovimientoStock getMovimiento() { return movimiento; }
    public void setMovimiento(MovimientoStock movimiento) { this.movimiento = movimiento; }

    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }

    public Integer getCantidadOriginal() { return cantidadOriginal; }
    public void setCantidadOriginal(Integer cantidadOriginal) { this.cantidadOriginal = cantidadOriginal; }

    public Integer getCantidadRestante() { return cantidadRestante; }
    public void setCantidadRestante(Integer cantidadRestante) { this.cantidadRestante = cantidadRestante; }

    public BigDecimal getCostoUnitario() { return costoUnitario; }
    public void setCostoUnitario(BigDecimal costoUnitario) { this.costoUnitario = costoUnitario; }

    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
