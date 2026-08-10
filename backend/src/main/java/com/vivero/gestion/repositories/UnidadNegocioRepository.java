package com.vivero.gestion.repositories;

import com.vivero.gestion.models.UnidadNegocio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UnidadNegocioRepository extends JpaRepository<UnidadNegocio, Long> {
    Optional<UnidadNegocio> findByNombre(String nombre);
}
