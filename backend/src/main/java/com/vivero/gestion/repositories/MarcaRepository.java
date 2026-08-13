package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Marca;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarcaRepository extends JpaRepository<Marca, Long> {
    List<Marca> findAllByUnidadNegocioId(Long unidadNegocioId);
}
