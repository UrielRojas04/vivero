package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Insumo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface InsumoRepository extends JpaRepository<Insumo, Long> {

    @Query("""
            SELECT COALESCE(SUM(i.precio), 0)
            FROM Insumo i
            WHERE i.fechaCompra BETWEEN :desde AND :hasta
            """)
    BigDecimal sumarGastosInsumos(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}