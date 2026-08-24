package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findAllByUnidadNegocioId(Long unidadNegocioId);
    
    boolean existsByMarcaId(Long marcaId);

    @Query(value = "SELECT COALESCE(SUM(p.stock * COALESCE((SELECT m.costo_unitario FROM movimientos_stock m WHERE m.producto_id = p.id AND m.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL') ORDER BY m.fecha DESC LIMIT 1), 0)), 0) FROM productos p WHERE p.unidad_negocio_id = :unidadId AND p.deleted = false", nativeQuery = true)
    BigDecimal sumarCostoInventario(@Param("unidadId") Long unidadId);

    // Productos asociados a un proveedor, con su costo actual (tarea 3.6 de
    // config-costeo-por-proveedor): alimenta la vista previa del grupo 11 ("reaplicar a sus
    // productos"), que no se implementa en este grupo. ⚠️ Depende de la columna
    // productos.proveedor_id, agregada recién en el grupo 9 (checkpoint pendiente del usuario) —
    // hasta que esa migración exista, este método no tiene ningún invocador real en el código y no
    // se ejecuta. Se agrega ahora, ya con la forma final, para que el grupo 11 no tenga que volver
    // a tocar el repositorio.
    @Query(value = "SELECT p.id AS id, p.nombre AS nombre, " +
            "COALESCE((SELECT m.costo_unitario FROM movimientos_stock m WHERE m.producto_id = p.id AND m.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL') ORDER BY m.fecha DESC, m.id DESC LIMIT 1), p.costo_producto, 0) AS costoActual " +
            "FROM productos p WHERE p.proveedor_id = :proveedorId AND p.unidad_negocio_id = :unidadId AND p.deleted = false ORDER BY p.nombre",
            nativeQuery = true)
    List<ProductoResumenProveedorProjection> findResumenPorProveedor(@Param("proveedorId") Long proveedorId, @Param("unidadId") Long unidadId);

    // Query de detección del panel de revisión de costos (Decisión 1 de design.md de
    // revision-costos-productos, tarea 3.1). Compara SIEMPRE costo_producto contra costo_base
    // (las dos bases, antes de descuentos/IVA/envío) del último INGRESO/AJUSTE_INICIAL real,
    // NUNCA contra costo_unitario (daría 11 filas de 11 — Decisión 1).
    //
    // (a) JOIN LATERAL, no subconsulta escalar: el panel necesita varias columnas del MISMO
    //     movimiento (id, costo_base, moneda_origen, cotizacion_aplicada, fecha); con
    //     subconsultas correlacionadas separadas dos de ellas podrían resolver a filas distintas
    //     ante un empate de fecha. LATERAL garantiza que todas vienen de la misma fila.
    // (b) ORDER BY ms.fecha DESC, ms.id DESC — el desempate por id es OBLIGATORIO acá (los
    //     movimientos 123/124 del producto 31 quedaron a 6 ms de distancia dentro de la misma
    //     transacción). La @Formula Producto.costoUnitarioHistorico NO tiene este desempate
    //     (ordena sólo por fecha DESC): es una inconsistencia real pero hoy inofensiva (0 empates
    //     exactos, 0 fechas NULL verificado el 2026-08-21, tarea 1.5) y queda fuera de alcance de
    //     este change (OQ3/R2 de design.md) — tocar esa @Formula subiría la gobernanza del change
    //     porque es lectura financiera viva (Finanzas y cada venta). Ver roadmap para el chore.
    // (c) La comparación es en SQL, con <> sobre numeric: numeric compara por VALOR, así que
    //     15000.00 <> 15000.000 da false (no es una diferencia real, tarea 8.7). Sin tolerancia
    //     ni epsilon: las dos columnas salen del mismo redondeo HALF_UP de CostoCalculator, un
    //     centavo de diferencia es una diferencia real.
    // (d) Los dos guards de nulos/ceros: COALESCE(...) <> COALESCE(...) hace que "ficha sin costo,
    //     ingreso con costo real" SÍ aparezca (caso fuerte de ficha desactualizada); el segundo
    //     AND evita el falso positivo simétrico (los dos en NULL/0, típico de movimientos viejos
    //     con el default de la columna — tarea 1.4/R5). El JOIN LATERAL (no LEFT JOIN) excluye
    //     por construcción a los productos sin ningún ingreso.
    // (e) Regla de moneda (Decisión 4): el OR de la segunda rama del WHERE es lo que EXCLUYE del
    //     panel a un producto en USD sin conversión registrada en su último ingreso — no aparece
    //     ninguna fila para él, nunca se ofrece un botón que escribiría pesos en un campo en
    //     dólares. findProductosUsdSinConversionRegistrada() de abajo es el complemento
    //     diagnosticable de ese caso (tarea 3.6): mismo criterio, para loguear un warn.
    // (f) Filtro del descarte (Decisión 11, tarea 6.2/3.1): oculta la fila SOLO mientras el
    //     último ingreso siga siendo el que el usuario ya marcó revisado con "Descartar".
    @Query(value =
            "SELECT p.id AS productoId, p.nombre AS nombre, pr.nombre AS proveedorNombre, " +
            "       m.fecha AS fechaUltimoIngreso, p.costo_producto AS costoFicha, " +
            "       m.costo_base AS costoUltimoIngreso, " +
            "       CASE WHEN p.moneda_costo = 'USD' AND m.moneda_origen = 'USD' AND m.cotizacion_aplicada > 0 " +
            "            THEN m.costo_base / m.cotizacion_aplicada ELSE m.costo_base END AS costoUltimoIngresoComparable, " +
            "       p.moneda_costo AS monedaCosto, " +
            "       CASE WHEN p.moneda_costo = 'USD' AND m.moneda_origen = 'USD' AND m.cotizacion_aplicada > 0 " +
            "            THEN m.cotizacion_aplicada END AS cotizacionAplicada, " +
            "       m.id AS movimientoId " +
            "FROM productos p " +
            "LEFT JOIN proveedores pr ON pr.id = p.proveedor_id " +
            "JOIN LATERAL ( " +
            "    SELECT ms.id, ms.costo_base, ms.moneda_origen, ms.cotizacion_aplicada, ms.fecha " +
            "    FROM movimientos_stock ms " +
            "    WHERE ms.producto_id = p.id AND ms.deleted = false AND ms.unidad_negocio_id = :unidadId " +
            "      AND ms.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL') " +
            "    ORDER BY ms.fecha DESC, ms.id DESC LIMIT 1 " +
            ") m ON true " +
            "WHERE p.deleted = false AND p.unidad_negocio_id = :unidadId " +
            "  AND ( " +
            "        (p.moneda_costo IS DISTINCT FROM 'USD' " +
            "             AND COALESCE(p.costo_producto, 0) <> COALESCE(m.costo_base, 0) " +
            "             AND (COALESCE(p.costo_producto, 0) > 0 OR COALESCE(m.costo_base, 0) > 0)) " +
            "        OR " +
            "        (p.moneda_costo = 'USD' AND m.moneda_origen = 'USD' AND m.cotizacion_aplicada > 0 " +
            "             AND COALESCE(p.costo_producto, 0) <> COALESCE(m.costo_base / m.cotizacion_aplicada, 0) " +
            "             AND (COALESCE(p.costo_producto, 0) > 0 OR COALESCE(m.costo_base, 0) > 0)) " +
            "      ) " +
            "  AND (p.movimiento_revision_descartado_id IS NULL OR p.movimiento_revision_descartado_id <> m.id) " +
            "ORDER BY m.fecha DESC, p.nombre " +
            "LIMIT :limite",
            nativeQuery = true)
    List<RevisionCostoProjection> findRevisionCostos(@Param("unidadId") Long unidadId, @Param("limite") int limite);

    // Complemento diagnosticable de la regla de moneda (Decisión 4, tarea 3.6): productos en USD
    // cuyo último ingreso NO tiene una conversión registrada (moneda_origen distinto de 'USD', o
    // cotización nula/<=0), y que por eso quedan EXCLUIDOS de findRevisionCostos() aunque su
    // costo_producto no coincida con costo_base en crudo. No se puede saber con certeza si hay
    // una diferencia real sin la cotización, así que no se muestran en el panel — pero sí se
    // loguean acá para que el caso no quede invisible (ProductoServiceImpl, tarea 3.6).
    @Query(value =
            "SELECT p.id " +
            "FROM productos p " +
            "JOIN LATERAL ( " +
            "    SELECT ms.id, ms.moneda_origen, ms.cotizacion_aplicada " +
            "    FROM movimientos_stock ms " +
            "    WHERE ms.producto_id = p.id AND ms.deleted = false AND ms.unidad_negocio_id = :unidadId " +
            "      AND ms.tipo_movimiento IN ('INGRESO', 'AJUSTE_INICIAL') " +
            "    ORDER BY ms.fecha DESC, ms.id DESC LIMIT 1 " +
            ") m ON true " +
            "WHERE p.deleted = false AND p.unidad_negocio_id = :unidadId AND p.moneda_costo = 'USD' " +
            "  AND (m.moneda_origen IS DISTINCT FROM 'USD' OR m.cotizacion_aplicada IS NULL OR m.cotizacion_aplicada <= 0) " +
            "  AND (p.movimiento_revision_descartado_id IS NULL OR p.movimiento_revision_descartado_id <> m.id)",
            nativeQuery = true)
    List<Long> findProductosUsdSinConversionRegistrada(@Param("unidadId") Long unidadId);
}
