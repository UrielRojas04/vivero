package com.vivero.gestion.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.VariedadBandeja;

@Repository
public interface VariedadBandejaRepository extends JpaRepository<VariedadBandeja, Long> {
}
