package com.vivero.gestion.repositories;

import com.vivero.gestion.dto.VentaLiteDTO;
import com.vivero.gestion.models.Venta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    @Query("SELECT COALESCE(SUM(v.totalFinal), 0) FROM Venta v WHERE v.fecha BETWEEN :desde AND :hasta")
    BigDecimal sumarTotalVentas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query("""
            SELECT new com.vivero.gestion.dto.VentaLiteDTO(
                v.id, v.id, v.fecha, v.cliente.nombreRazonSocial, v.totalFinal, v.estadoPago)
            FROM Venta v
            WHERE v.fecha BETWEEN :desde AND :hasta
            ORDER BY v.fecha DESC
            """)
    Page<VentaLiteDTO> listarVentasPorRango(@Param("desde") LocalDateTime desde,
                                            @Param("hasta") LocalDateTime hasta,
                                            Pageable pageable);
}