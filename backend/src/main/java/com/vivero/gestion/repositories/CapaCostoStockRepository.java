package com.vivero.gestion.repositories;

import com.vivero.gestion.models.CapaCostoStock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

// Tres accesos, y sólo tres, porque son los que el change necesita (tasks.md, tarea 4.5). Sin
// findAll() sin límite (regla dura 6). Los dos órdenes de capas (por costo y por fecha/id) reflejan
// las dos reglas independientes de Decisión 2/2b: cuál es el costo de referencia y en qué orden se
// consumen las cantidades.
@Repository
public interface CapaCostoStockRepository extends JpaRepository<CapaCostoStock, Long> {

    // (a) Capa de referencia de un producto: la activa (cantidadRestante > 0) con mayor
    // costoUnitario; desempate (fecha ASC, id ASC) — la más antigua gana el empate (Decisión 2).
    // Null si el producto no tiene ninguna capa activa (el llamador cae al comportamiento viejo,
    // Decisión 7 / tarea 6.8).
    CapaCostoStock findFirstByProductoIdAndCantidadRestanteGreaterThanOrderByCostoUnitarioDescFechaAscIdAsc(
            Long productoId, Integer cantidadRestanteMinimo);

    // (b) Capas activas de un producto, ordenadas (fecha ASC, id ASC): más vieja primero, para el
    // descuento de cantidades (Decisión 2b).
    List<CapaCostoStock> findByProductoIdAndCantidadRestanteGreaterThanOrderByFechaAscIdAsc(
            Long productoId, Integer cantidadRestanteMinimo);

    // (c) Existencia de capas por producto: idempotencia de la migración (grupo 7) — no crear
    // capas de nuevo para un producto que ya las tiene.
    boolean existsByProductoId(Long productoId);
}
