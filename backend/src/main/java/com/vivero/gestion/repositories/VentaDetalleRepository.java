package com.vivero.gestion.repositories;

import com.vivero.gestion.models.VentaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface VentaDetalleRepository extends JpaRepository<VentaDetalle, Long> {

    @Query("""
            SELECT COALESCE(SUM(COALESCE(d.precioCostoHistorico, 0) * d.cantidad), 0)
            FROM VentaDetalle d
            JOIN d.venta v
            WHERE v.fecha BETWEEN :desde AND :hasta
            """)
    BigDecimal sumarCostoVendido(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}