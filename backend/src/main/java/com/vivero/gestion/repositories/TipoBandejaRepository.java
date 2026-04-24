package com.vivero.gestion.repositories;

import com.vivero.gestion.models.TipoBandeja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TipoBandejaRepository extends JpaRepository<TipoBandeja, Long> {
    // JpaRepository ya incluye findAll(), save(), deleteById(), etc.
}