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
import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    List<Venta> findAllByOrderByFechaDesc();
    List<Venta> findAllByUnidadNegocioIdOrderByFechaDesc(Long unidadNegocioId);

    @Query("SELECT COALESCE(SUM(v.totalFinal), 0) FROM Venta v LEFT JOIN v.usuario u WHERE v.fecha BETWEEN :desde AND :hasta AND v.unidadNegocio.id = :unidadId AND (:usuarioId IS NULL OR u.id = :usuarioId)")
    BigDecimal sumarTotalVentas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta, @Param("unidadId") Long unidadId, @Param("usuarioId") Long usuarioId);

    @Query("""
            SELECT new com.vivero.gestion.dto.VentaLiteDTO(
                v.id, v.id, v.fecha, COALESCE(c.nombreRazonSocial, '(eliminado)'), v.totalFinal, v.estadoPago,
                (SELECT COALESCE(SUM((d.precioUnitarioHistorico - d.costoUnitarioHistorico) * d.cantidad), 0) FROM VentaDetalle d WHERE d.venta.id = v.id),
                COALESCE(u.username, '(sin vendedor)'),
                u.id
            )
            FROM Venta v LEFT JOIN v.cliente c LEFT JOIN v.usuario u
            WHERE v.fecha BETWEEN :desde AND :hasta
              AND v.unidadNegocio.id = :unidadId
              AND (:usuarioId IS NULL OR u.id = :usuarioId)
              AND (:q IS NULL OR :q = '' OR LOWER(COALESCE(c.nombreRazonSocial, '(eliminado)')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY v.fecha DESC
            """)
    Page<VentaLiteDTO> listarVentasPorRango(@Param("desde") LocalDateTime desde,
                                            @Param("hasta") LocalDateTime hasta,
                                            @Param("q") String q,
                                            @Param("unidadId") Long unidadId,
                                            @Param("usuarioId") Long usuarioId,
                                            Pageable pageable);

    @Query("SELECT d.venta.id, d.producto.nombre, d.cantidad FROM VentaDetalle d WHERE d.venta.id IN :ventaIds")
    List<Object[]> obtenerDetallesBasicosPorVentas(@Param("ventaIds") List<Long> ventaIds);
}