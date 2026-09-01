package com.vivero.gestion.repositories;

import com.vivero.gestion.models.CategoriaAbono;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoriaAbonoRepository extends JpaRepository<CategoriaAbono, Long> {
}
