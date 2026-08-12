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

    @Query("SELECT COALESCE(SUM( (p.costoProducto * (1 - COALESCE(p.descuentoProveedor, 0) / 100)) * (1 + COALESCE(p.unidadNegocio.costoEnvioPorcentaje, 0) / 100) * p.stock ), 0) FROM Producto p WHERE p.unidadNegocio.id = :unidadId")
    BigDecimal sumarCostoInventario(@Param("unidadId") Long unidadId);
}
