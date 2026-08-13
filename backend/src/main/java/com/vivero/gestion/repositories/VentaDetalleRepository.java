package com.vivero.gestion.repositories;

import com.vivero.gestion.models.VentaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import java.util.List;

@Repository
public interface VentaDetalleRepository extends JpaRepository<VentaDetalle, Long> {
    List<VentaDetalle> findAllByVentaUnidadNegocioId(Long unidadNegocioId);

    @Query("SELECT SUM(vd.cantidad * vd.costoUnitarioHistorico) FROM VentaDetalle vd " +
           "WHERE vd.venta.fecha BETWEEN :desde AND :hasta " +
           "AND (:unidadId IS NULL OR vd.venta.unidadNegocio.id = :unidadId)")
    BigDecimal sumarCostoMercaderiaVendida(@Param("desde") LocalDateTime desde, 
                                           @Param("hasta") LocalDateTime hasta, 
                                           @Param("unidadId") Long unidadId);

    List<VentaDetalle> findByVentaFechaBetween(LocalDateTime desde, LocalDateTime hasta);
    List<VentaDetalle> findByVentaFechaBetweenAndVentaUnidadNegocioId(LocalDateTime desde, LocalDateTime hasta, Long unidadId);
}