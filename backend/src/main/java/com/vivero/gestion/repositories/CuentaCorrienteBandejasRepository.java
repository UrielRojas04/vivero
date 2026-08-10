package com.vivero.gestion.repositories;

import com.vivero.gestion.models.CuentaCorrienteBandejas;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CuentaCorrienteBandejasRepository extends JpaRepository<CuentaCorrienteBandejas, Long> {
    Optional<CuentaCorrienteBandejas> findByClienteId(Long clienteId);
}
