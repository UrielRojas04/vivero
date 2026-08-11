package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    @Query("""
            SELECT v.id, p.metodoPago
            FROM Pago p
            JOIN p.venta v
            WHERE v.fecha BETWEEN :desde AND :hasta
            ORDER BY p.fecha DESC, p.id DESC
            """)
    List<Object[]> findMetodoPagoPorVenta(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);
}