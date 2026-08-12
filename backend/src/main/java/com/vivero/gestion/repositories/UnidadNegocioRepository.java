package com.vivero.gestion.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.UnidadNegocio;

import java.util.List;

@Repository
public interface UnidadNegocioRepository extends JpaRepository<UnidadNegocio, Long> {
    List<UnidadNegocio> findByActivoTrue();
}
