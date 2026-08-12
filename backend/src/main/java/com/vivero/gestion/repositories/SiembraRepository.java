package com.vivero.gestion.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.Siembra;

@Repository
public interface SiembraRepository extends JpaRepository<Siembra, Long> {
    boolean existsByVariedadPlantaId(Long variedadPlantaId);
    boolean existsByVariedadBandejaId(Long variedadBandejaId);
}
