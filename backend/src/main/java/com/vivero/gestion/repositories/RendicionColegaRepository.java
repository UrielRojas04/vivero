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
    
    @Query("SELECT COALESCE(SUM(r.monto), 0) FROM RendicionColega r WHERE r.unidadNegocio.id = :unidadId")
    BigDecimal sumarRendicionesPorUnidad(@Param("unidadId") Long unidadId);

    @Query("SELECT COALESCE(SUM(r.monto), 0) FROM RendicionColega r WHERE r.unidadNegocio.id = :unidadId AND r.fecha >= :desde AND r.fecha <= :hasta")
    BigDecimal sumarRendicionesPorUnidadYPeriodo(@Param("unidadId") Long unidadId, @Param("desde") java.time.LocalDateTime desde, @Param("hasta") java.time.LocalDateTime hasta);

    Page<RendicionColega> findAllByUnidadNegocioIdOrderByFechaDesc(Long unidadNegocioId, Pageable pageable);
}
