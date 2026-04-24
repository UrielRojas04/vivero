package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    // Método vital para el login y validación de registros únicos
    Optional<Usuario> findByUsername(String username);
}