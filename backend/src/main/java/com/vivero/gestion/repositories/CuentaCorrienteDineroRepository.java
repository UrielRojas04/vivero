package com.vivero.gestion.repositories;

import com.vivero.gestion.models.CuentaCorrienteDinero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CuentaCorrienteDineroRepository extends JpaRepository<CuentaCorrienteDinero, Long> {
    Optional<CuentaCorrienteDinero> findByClienteId(Long clienteId);
}
