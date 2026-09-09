package com.vivero.gestion.repositories;

import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.RetiroGananciaAbono;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface RetiroGananciaAbonoRepository extends JpaRepository<RetiroGananciaAbono, Long> {

    // Acumulado histórico completo, sin acotar por fecha (Decisión 3 de design.md de
    // retiro-ganancia-abono): se resta de la ganancia teórica acumulada de cada cuenta para
    // obtener su ganancia disponible. COALESCE(...,0) para que una cuenta sin retiros nunca
    // devuelva null (evita NullPointerException aguas arriba en el cálculo del servicio).
    @Query("SELECT COALESCE(SUM(r.monto), 0) FROM RetiroGananciaAbono r WHERE r.unidadNegocio.id = :unidadId AND r.cuentaAbono = :cuenta")
    BigDecimal sumarRetirosPorUnidadYCuenta(@Param("unidadId") Long unidadId, @Param("cuenta") CuentaAbono cuenta);

    // Mismo desempate por id descendente que RendicionColegaRepository (varios retiros el mismo
    // día quedan ordenados por carga, no en orden arbitrario de Postgres).
    Page<RetiroGananciaAbono> findAllByUnidadNegocioIdOrderByFechaDescIdDesc(Long unidadNegocioId, Pageable pageable);
}
