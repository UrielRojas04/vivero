package com.vivero.gestion.repositories;

import com.vivero.gestion.models.FacturaConcepto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FacturaConceptoRepository extends JpaRepository<FacturaConcepto, Long> {
}
