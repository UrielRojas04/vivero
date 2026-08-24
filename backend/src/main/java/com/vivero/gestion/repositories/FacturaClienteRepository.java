package com.vivero.gestion.repositories;

import com.vivero.gestion.models.FacturaCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FacturaClienteRepository extends JpaRepository<FacturaCliente, Long> {
    Optional<FacturaCliente> findByClienteIdAndEstadoAndUnidadNegocioId(Long clienteId, String estado, Long unidadNegocioId);
    List<FacturaCliente> findByClienteIdAndUnidadNegocioIdOrderByFechaAperturaDesc(Long clienteId, Long unidadNegocioId);
}
