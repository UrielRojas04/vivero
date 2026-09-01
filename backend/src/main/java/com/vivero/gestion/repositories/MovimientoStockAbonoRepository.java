package com.vivero.gestion.repositories;

import com.vivero.gestion.models.MovimientoStockAbono;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import com.vivero.gestion.models.TipoMovimientoStockAbono;

@Repository
public interface MovimientoStockAbonoRepository extends JpaRepository<MovimientoStockAbono, Long> {
    List<MovimientoStockAbono> findByProductoIdOrderByFechaDesc(Long productoId);
    Page<MovimientoStockAbono> findByProductoIdOrderByFechaDesc(Long productoId, Pageable pageable);
    Page<MovimientoStockAbono> findAllByOrderByFechaDesc(Pageable pageable);
    
    Page<MovimientoStockAbono> findByTipoMovimientoInOrderByFechaDesc(List<TipoMovimientoStockAbono> tipos, Pageable pageable);
    Page<MovimientoStockAbono> findByProductoIdAndTipoMovimientoInOrderByFechaDesc(Long productoId, List<TipoMovimientoStockAbono> tipos, Pageable pageable);
}
