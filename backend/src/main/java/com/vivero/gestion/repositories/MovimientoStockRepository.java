package com.vivero.gestion.repositories;

import com.vivero.gestion.models.MovimientoStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import com.vivero.gestion.models.TipoMovimientoStock;

@Repository
public interface MovimientoStockRepository extends JpaRepository<MovimientoStock, Long> {
    List<MovimientoStock> findAllByUnidadNegocioIdOrderByFechaDesc(Long unidadNegocioId);
    MovimientoStock findFirstByProductoIdAndTipoMovimientoInOrderByFechaDesc(Long productoId, List<TipoMovimientoStock> tipos);
}
