package com.vivero.gestion.repositories;

import com.vivero.gestion.models.RendicionColega;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

@Repository
public interface RendicionColegaRepository extends JpaRepository<RendicionColega, Long> {
    
    @Query("SELECT COALESCE(SUM(CASE WHEN r.direccion = 'JEFE_A_COLEGA' THEN -r.monto ELSE r.monto END), 0) FROM RendicionColega r WHERE r.unidadNegocio.id = :unidadId")
    BigDecimal sumarRendicionesPorUnidad(@Param("unidadId") Long unidadId);

    @Query("SELECT COALESCE(SUM(CASE WHEN r.direccion = 'JEFE_A_COLEGA' THEN -r.monto ELSE r.monto END), 0) FROM RendicionColega r WHERE r.unidadNegocio.id = :unidadId AND r.fecha >= :desde AND r.fecha <= :hasta")
    BigDecimal sumarRendicionesPorUnidadYPeriodo(@Param("unidadId") Long unidadId, @Param("desde") java.time.LocalDateTime desde, @Param("hasta") java.time.LocalDateTime hasta);

    // OrderByFechaDesc solo no alcanza (bug real 2026-09-04): el selector de fecha del formulario
    // sólo tiene precisión de día, así que varias rendiciones cargadas el mismo día quedan con el
    // mismo valor de "fecha" -- un empate que Postgres resuelve en orden arbitrario, no
    // necesariamente el de carga. Se desempata por id descendente (más alto = cargado más
    // recientemente), así "más nuevo arriba" se cumple también dentro de un mismo día.
    Page<RendicionColega> findAllByUnidadNegocioIdOrderByFechaDescIdDesc(Long unidadNegocioId, Pageable pageable);
}
