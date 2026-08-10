package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RolRepository extends JpaRepository<Rol, Long> {
    Optional<Rol> findByNombre(String nombre);

    @Query(value = "SELECT EXISTS(SELECT 1 FROM usuario_rol WHERE rol_id = :rolId)", nativeQuery = true)
    boolean isRolInUse(@Param("rolId") Long rolId);

    @Modifying
    @Query(value = "DELETE FROM usuario_rol WHERE rol_id = :rolId", nativeQuery = true)
    void deleteUsuarioRolAssociations(@Param("rolId") Long rolId);

    @Modifying
    @Query(value = "DELETE FROM rol_permiso WHERE rol_id = :rolId", nativeQuery = true)
    void deleteRolPermisoAssociations(@Param("rolId") Long rolId);
}
