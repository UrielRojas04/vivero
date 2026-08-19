package com.vivero.gestion.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.Proveedor;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    List<Proveedor> findAllByUnidadNegocioId(Long unidadNegocioId);

    Optional<Proveedor> findByIdAndUnidadNegocioId(Long id, Long unidadNegocioId);
}
