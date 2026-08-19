package com.vivero.gestion.repositories;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.EstadoPedido;
import com.vivero.gestion.models.Pedido;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {

    Optional<Pedido> findByIdAndUnidadNegocioId(Long id, Long unidadNegocioId);

    // Orden fijo por fecha de creación descendente (Decisión 11 de design.md): el listado de
    // pedidos nace paginado y ordenado, no delegado al Pageable que llega del cliente.
    @Query("SELECT p FROM Pedido p WHERE (:unidadId IS NULL OR p.unidadNegocio.id = :unidadId) "
            + "AND (:estado IS NULL OR p.estado = :estado) "
            + "AND (:proveedorId IS NULL OR p.proveedor.id = :proveedorId) "
            + "ORDER BY p.fechaCreacion DESC")
    Page<Pedido> buscar(@Param("unidadId") Long unidadId,
                         @Param("estado") EstadoPedido estado,
                         @Param("proveedorId") Long proveedorId,
                         Pageable pageable);
}
