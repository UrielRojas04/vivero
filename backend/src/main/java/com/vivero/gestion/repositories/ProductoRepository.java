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

}
