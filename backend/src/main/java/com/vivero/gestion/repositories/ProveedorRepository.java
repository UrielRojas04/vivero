package com.vivero.gestion.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.Proveedor;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    List<Proveedor> findAllByUnidadNegocioId(Long unidadNegocioId);

    Optional<Proveedor> findByIdAndUnidadNegocioId(Long id, Long unidadNegocioId);

    // Nombre duplicado por unidad de negocio, normalizado (trim + mayúsculas) — tarea 3.5. Sin
    // esto, dos proveedores con el mismo nombre pero perfiles de costeo distintos terminan
    // conviviendo, y no hay forma de saber cuál gobierna un producto nuevo.
    @Query("SELECT p FROM Proveedor p WHERE p.unidadNegocio.id = :unidadId AND UPPER(TRIM(p.nombre)) = UPPER(TRIM(:nombre))")
    Optional<Proveedor> findByUnidadNegocioIdAndNombreNormalizado(@Param("unidadId") Long unidadId, @Param("nombre") String nombre);
}
