package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    @Query("SELECT u FROM Usuario u WHERE u.username = :username")
    @EntityGraph(attributePaths = {"roles", "roles.permisos", "unidadesNegocio"})
    Optional<Usuario> findByUsername(@Param("username") String username);

    @Modifying
    @Query(value = "DELETE FROM usuario_rol WHERE usuario_id = :usuarioId", nativeQuery = true)
    void deleteUsuarioRolAssociations(@Param("usuarioId") Long usuarioId);
}
