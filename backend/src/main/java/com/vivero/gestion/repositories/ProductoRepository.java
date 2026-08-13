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
}
