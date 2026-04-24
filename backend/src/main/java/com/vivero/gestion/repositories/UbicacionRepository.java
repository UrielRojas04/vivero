package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Ubicacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UbicacionRepository extends JpaRepository<Ubicacion, Long> {
    // Esto permitirá filtrar o listar los invernaderos y telas fácilmente
}