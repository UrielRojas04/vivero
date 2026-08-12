package com.vivero.gestion.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.VariedadPlanta;

@Repository
public interface VariedadPlantaRepository extends JpaRepository<VariedadPlanta, Long> {
}
