package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Gasto;
import com.vivero.gestion.repositories.projections.GastoUnificadoView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GastoRepository extends JpaRepository<Gasto, Long> {
    List<Gasto> findByFechaBetween(LocalDateTime startDate, LocalDateTime endDate);

    @Query(value = """
            SELECT * FROM (
                SELECT 
                    CONCAT('G-', id) as idUnico, 
                    concepto as concepto, 
                    monto as monto, 
                    fecha as fecha, 
                    'MANUAL' as tipo 
                FROM gastos
                UNION ALL
                SELECT 
                    CONCAT('I-', id) as idUnico, 
                    CONCAT('Insumo: ', nombre) as concepto, 
                    precio as monto, 
                    fecha_compra as fecha, 
                    'INSUMO' as tipo 
                FROM insumos
            ) as unificados
            """,
            countQuery = """
            SELECT 
                (SELECT COUNT(*) FROM gastos) + 
                (SELECT COUNT(*) FROM insumos)
            """,
            nativeQuery = true)
    Page<GastoUnificadoView> listarGastosUnificados(Pageable pageable);
}
