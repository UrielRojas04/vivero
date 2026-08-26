package com.vivero.gestion.models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.Formula;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

@Entity
@Table(name = "productos")
@SQLDelete(sql = "UPDATE productos SET deleted = true WHERE id=?")
@SQLRestriction("deleted = false")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 255)
    private String descripcion;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio;

    @Column(nullable = false)
    private Integer stock = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marca_id")
    private Marca marca;

    // Vínculo de catálogo nuevo (Decisión 2 de design.md de config-costeo-por-proveedor — OQ1,
    // migración Marca -> Proveedor, grupo 9). Nullable: los productos nacidos del flujo de
    // "producto pendiente" de pedidos y los de Vivero pueden no tener proveedor. `marca`/`marca_id`
    // de arriba se conservan SIN TOCAR como red de rollback (no se leen ni se escriben desde
    // ninguna ruta de alta/edición a partir de este grupo).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proveedor_id")
    private Proveedor proveedor;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    @Column(length = 100)
    private String lote;

    @Column(length = 50, name = "numero_siembra")
    private String numeroSiembra;

    @Column(length = 100)
    private String dueno;

    @Column(precision = 10, scale = 2)
    private BigDecimal costoProducto;

    @Column(name = "porcentaje_ganancia")
    private BigDecimal porcentajeGanancia;

    // Se conserva sin tocar como red de rollback (Decisión 8 de design.md de
    // costeo-flexible-por-producto): la fórmula deja de leerla en el grupo 5/6 de ese change,
    // pero la columna y su valor no se borran.
    @Column(precision = 5, scale = 2)
    private BigDecimal descuentoProveedor = BigDecimal.ZERO;

    // Lista libre de descuentos ESTABLES del producto (Decisión 1). Se combinan en cascada
    // (Decisión 2), nunca se suman. @BatchSize evita el N+1 en el listado (Decisión 11).
    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 25)
    private List<ProductoDescuento> descuentos = new ArrayList<>();

    // Nullable, SIN valor por defecto a propósito (Decisión 5): null == "hereda el default de la
    // unidad de negocio", 0 == "no aplica para este producto". Inicializarlos en ZERO como hace
    // descuentoProveedor destruiría esa distinción antes de que exista (tarea 2.4).
    @Column(name = "iva_porcentaje", precision = 5, scale = 2)
    private BigDecimal ivaPorcentaje;

    @Column(name = "costo_envio_porcentaje", precision = 5, scale = 2)
    private BigDecimal costoEnvioPorcentaje;

    @ManyToOne
    @JoinColumn(name = "unidad_negocio_id")
    private UnidadNegocio unidadNegocio;

    // Costo de referencia (Decisión 5 de design.md de costeo-fifo-herramientas, grupo 8): el
    // MÁXIMO costo_unitario entre las capas ACTIVAS (cantidad_restante > 0) del producto — no un
    // FIFO, no un "último movimiento". COALESCE cae a la expresión vieja (intacta, sin tocar un
    // carácter) cuando el producto no tiene ninguna capa activa: es el caso de TODOS los
    // productos de Vivero (nunca tienen capas, flag costeoPorCapasHabilitado en false) y el de
    // cualquier producto de Herramientas que todavía no tuvo su primer ingreso post-flag. MAX()
    // sobre el conjunto vacío en PostgreSQL devuelve NULL, no 0 — es justo lo que el COALESCE
    // necesita para caer a la rama vieja (tarea 8.3, verificado contra la base real).
    @Formula("(SELECT COALESCE((SELECT MAX(c.costo_unitario) FROM capas_costo_stock c WHERE c.producto_id = id AND c.cantidad_restante > 0), (SELECT COALESCE(m.costo_unitario, p.costo_producto, 0) FROM movimientos_stock m LEFT JOIN productos p ON p.id = m.producto_id WHERE m.producto_id = id AND m.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL') ORDER BY m.fecha DESC LIMIT 1)))")
    private BigDecimal costoUnitarioHistorico;

    // Moneda en que el proveedor cotiza el costo de este producto (Decisión 5 de design.md de
    // config-costeo-por-proveedor — OQ2). Dato ESTABLE del producto, distinto de la cotización
    // específica del dólar (volátil, vive en Pedido.cotizacionDolar). Default ARS, sin valor
    // ambiguo: un producto existente sin este campo se lee como ARS (tarea 5.1). El paso de
    // conversión del CostoCalculator (grupo 6, fuera de alcance) todavía no lo usa.
    @Enumerated(EnumType.STRING)
    @Column(name = "moneda_costo", nullable = false, length = 3, columnDefinition = "varchar(3) default 'ARS'")
    private MonedaCosto monedaCosto = MonedaCosto.ARS;

    public Producto() {}

    public Producto(String nombre, String descripcion, BigDecimal precio, BigDecimal costoProducto, Integer stock, String lote, String dueno) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.costoProducto = costoProducto;
        this.descuentoProveedor = BigDecimal.ZERO;
        this.stock = stock;
        this.lote = lote;
        this.dueno = dueno;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public Marca getMarca() { return marca; }
    public void setMarca(Marca marca) { this.marca = marca; }

    public Proveedor getProveedor() { return proveedor; }
    public void setProveedor(Proveedor proveedor) { this.proveedor = proveedor; }

    public boolean isDeleted() { return deleted; }
    public void setDeleted(boolean deleted) { this.deleted = deleted; }

    public String getLote() { return lote; }
    public void setLote(String lote) { this.lote = lote; }

    public String getNumeroSiembra() { return numeroSiembra; }
    public void setNumeroSiembra(String numeroSiembra) { this.numeroSiembra = numeroSiembra; }

    public String getDueno() { return dueno; }
    public void setDueno(String dueno) { this.dueno = dueno; }
    
    public BigDecimal getCostoProducto() { return costoProducto; }
    public void setCostoProducto(BigDecimal costoProducto) { this.costoProducto = costoProducto; }
    
    public BigDecimal getPorcentajeGanancia() { return porcentajeGanancia; }
    public void setPorcentajeGanancia(BigDecimal porcentajeGanancia) { this.porcentajeGanancia = porcentajeGanancia; }
    
    public BigDecimal getDescuentoProveedor() { return descuentoProveedor; }
    public void setDescuentoProveedor(BigDecimal descuentoProveedor) { this.descuentoProveedor = descuentoProveedor; }

    public List<ProductoDescuento> getDescuentos() { return descuentos; }
    public void setDescuentos(List<ProductoDescuento> descuentos) { this.descuentos = descuentos; }

    public BigDecimal getIvaPorcentaje() { return ivaPorcentaje; }
    public void setIvaPorcentaje(BigDecimal ivaPorcentaje) { this.ivaPorcentaje = ivaPorcentaje; }

    public BigDecimal getCostoEnvioPorcentaje() { return costoEnvioPorcentaje; }
    public void setCostoEnvioPorcentaje(BigDecimal costoEnvioPorcentaje) { this.costoEnvioPorcentaje = costoEnvioPorcentaje; }

    public UnidadNegocio getUnidadNegocio() { return unidadNegocio; }
    public void setUnidadNegocio(UnidadNegocio unidadNegocio) { this.unidadNegocio = unidadNegocio; }
    
    public BigDecimal getCostoUnitarioHistorico() { return costoUnitarioHistorico; }
    // No setter for @Formula field

    public MonedaCosto getMonedaCosto() { return monedaCosto; }
    public void setMonedaCosto(MonedaCosto monedaCosto) { this.monedaCosto = monedaCosto; }
}
