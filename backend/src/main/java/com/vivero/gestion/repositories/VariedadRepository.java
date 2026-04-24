package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Variedad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VariedadRepository extends JpaRepository<Variedad, Long> {
    // Al extender de JpaRepository, Spring ya nos regala los métodos
    // para Guardar, Editar, Borrar y Buscar sin escribir una sola línea de SQL.
}