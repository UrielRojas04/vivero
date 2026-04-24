// src/main/java/com/vivero/gestion/repositories/MovimientoRepository.java
package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Movimiento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovimientoRepository extends JpaRepository<Movimiento, Long> {
    // Este método es el que usa el controlador para filtrar por lote
    List<Movimiento> findByCodigoLoteOrderByFechaDesc(String codigoLote);
}