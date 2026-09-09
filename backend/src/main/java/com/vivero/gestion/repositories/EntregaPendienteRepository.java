package com.vivero.gestion.repositories;

import com.vivero.gestion.models.EntregaPendiente;
import com.vivero.gestion.models.EstadoEntregaPendiente;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// Tres accesos, los que el change necesita (tasks.md, tarea 4.4). Sin findAll() sin límite (regla
// dura 6): todos los listados son Page<...>.
@Repository
public interface EntregaPendienteRepository extends JpaRepository<EntregaPendiente, Long> {

    // Listado del dueño (LEER_ENTREGAS): por unidad, opcionalmente filtrado por estado, más
    // antigua primero (Decisión de la spec: "ordenado por fecha con la más antigua primero cuando
    // se piden las pendientes" -- es la que más urge resolver).
    //
    // LEFT JOIN FETCH cliente/usuarioRegistro (hallazgo de auditoría, finding #5): ambos son
    // @ManyToOne, así que unirlos acá NO multiplica filas -- sigue siendo seguro con Pageable
    // (el problema conocido de Hibernate es sólo con fetch de una colección @OneToMany bajo
    // paginación, no con @ManyToOne). Sin esto, mapearAResumenDTO generaba 2 SELECT extra por
    // fila de la página (uno por cliente, uno por usuarioRegistro). LEFT, no INNER: con
    // @NotFound(IGNORE) en EntregaPendiente.cliente, un INNER JOIN excluiría del listado
    // directamente cualquier entrega cuyo cliente esté soft-eliminado, en vez de mostrarla con
    // "(eliminado)" (ver EntregaPendienteServiceImpl, finding #1).
    @Query("SELECT e FROM EntregaPendiente e "
            + "LEFT JOIN FETCH e.cliente "
            + "LEFT JOIN FETCH e.usuarioRegistro "
            + "WHERE e.unidadNegocio.id = :unidadNegocioId "
            + "AND (:estado IS NULL OR e.estado = :estado) ORDER BY e.fecha ASC")
    Page<EntregaPendiente> findByUnidadNegocioIdAndEstadoOptional(
            @Param("unidadNegocioId") Long unidadNegocioId,
            @Param("estado") EstadoEntregaPendiente estado,
            Pageable pageable);

    // Listado propio del empleado (ESCRIBIR_ENTREGAS, Decisión 10): sólo lo que registró él, en
    // cualquier estado, más reciente primero. Convertido de query derivada por nombre a @Query
    // explícita (finding #5) para poder agregar los mismos LEFT JOIN FETCH de arriba -- Spring
    // Data no soporta fetch joins en query-derivation por nombre de método.
    @Query("SELECT e FROM EntregaPendiente e "
            + "LEFT JOIN FETCH e.cliente "
            + "LEFT JOIN FETCH e.usuarioRegistro "
            + "WHERE e.unidadNegocio.id = :unidadNegocioId AND e.usuarioRegistro.id = :usuarioRegistroId "
            + "ORDER BY e.fecha DESC")
    Page<EntregaPendiente> findByUnidadNegocioIdAndUsuarioRegistroIdOrderByFechaDesc(
            @Param("unidadNegocioId") Long unidadNegocioId,
            @Param("usuarioRegistroId") Long usuarioRegistroId,
            Pageable pageable);

    @Query("SELECT e FROM EntregaPendiente e LEFT JOIN FETCH e.detalles WHERE e.id = :id")
    Optional<EntregaPendiente> findByIdWithDetalles(@Param("id") Long id);
}
