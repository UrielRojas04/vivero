package com.vivero.gestion.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.Siembra;

@Repository
public interface SiembraRepository extends JpaRepository<Siembra, Long> {
    boolean existsByVariedadPlantaId(Long variedadPlantaId);
    boolean existsByVariedadBandejaId(Long variedadBandejaId);

    @org.springframework.data.jpa.repository.Query("SELECT s.variedadPlanta.nombre, SUM(s.cantidad), MIN(s.fechaEstimada) FROM Siembra s WHERE s.estado = 'EN_PROCESO' AND LOWER(s.dueno) LIKE '%jefe%' AND s.fechaEstimada <= :fechaLimite GROUP BY s.variedadPlanta.nombre")
    java.util.List<Object[]> sumBandejasEnProcesoProximas(@org.springframework.data.repository.query.Param("fechaLimite") java.time.LocalDate fechaLimite);
}
