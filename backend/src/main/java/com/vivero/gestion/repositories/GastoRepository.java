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
                WHERE deleted = false
                UNION ALL
                SELECT 
                    CONCAT('I-', id) as idUnico, 
                    CONCAT('Insumo: ', nombre) as concepto, 
                    precio as monto, 
                    fecha_compra as fecha, 
                    'INSUMO' as tipo 
                FROM insumos
                WHERE deleted = false
            ) as unificados
            WHERE (:q IS NULL OR :q = '' OR LOWER(unificados.concepto) LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            countQuery = """
            SELECT COUNT(*) FROM (
                SELECT 
                    CONCAT('G-', id) as idUnico, 
                    concepto as concepto, 
                    monto as monto, 
                    fecha as fecha, 
                    'MANUAL' as tipo 
                FROM gastos
                WHERE deleted = false
                UNION ALL
                SELECT 
                    CONCAT('I-', id) as idUnico, 
                    CONCAT('Insumo: ', nombre) as concepto, 
                    precio as monto, 
                    fecha_compra as fecha, 
                    'INSUMO' as tipo 
                FROM insumos
                WHERE deleted = false
            ) as unificados
            WHERE (:q IS NULL OR :q = '' OR LOWER(unificados.concepto) LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            nativeQuery = true)
    Page<GastoUnificadoView> listarGastosUnificados(@org.springframework.data.repository.query.Param("q") String q, Pageable pageable);
}
