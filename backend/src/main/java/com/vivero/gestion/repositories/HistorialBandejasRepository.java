package com.vivero.gestion.repositories;

import com.vivero.gestion.models.HistorialBandejas;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistorialBandejasRepository extends JpaRepository<HistorialBandejas, Long> {
    List<HistorialBandejas> findByClienteIdOrderByFechaDesc(Long clienteId);
}
