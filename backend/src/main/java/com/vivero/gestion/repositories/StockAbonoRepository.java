package com.vivero.gestion.repositories;

import com.vivero.gestion.models.StockAbono;
import com.vivero.gestion.models.UbicacionAbono;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockAbonoRepository extends JpaRepository<StockAbono, Long> {
    Optional<StockAbono> findByProductoIdAndUbicacion(Long productoId, UbicacionAbono ubicacion);
    List<StockAbono> findByProductoId(Long productoId);

    @Query("SELECT COALESCE(SUM(s.cantidad), 0) FROM StockAbono s WHERE s.producto.id = :productoId")
    Integer sumarStockPorProducto(@Param("productoId") Long productoId);
}
