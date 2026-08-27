package com.vivero.gestion.repositories;

import com.vivero.gestion.dto.VentaLiteDTO;
import com.vivero.gestion.models.Venta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VentaRepository extends JpaRepository<Venta, Long> {

    List<Venta> findAllByOrderByFechaDesc();
    List<Venta> findAllByUnidadNegocioIdOrderByFechaDesc(Long unidadNegocioId);

    @Query("SELECT COALESCE(SUM(v.totalFinal), 0) FROM Venta v LEFT JOIN v.usuario u WHERE v.fecha BETWEEN :desde AND :hasta AND v.unidadNegocio.id = :unidadId AND (:usuarioId IS NULL OR u.id = :usuarioId)")
    BigDecimal sumarTotalVentas(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta, @Param("unidadId") Long unidadId, @Param("usuarioId") Long usuarioId);

    @Query("""
            SELECT new com.vivero.gestion.dto.VentaLiteDTO(
                v.id, v.id, v.fecha, COALESCE(c.nombreRazonSocial, v.clienteNombreCasual, '(eliminado)'), v.totalFinal, v.estadoPago,
                (SELECT COALESCE(SUM((d.precioUnitarioHistorico - d.costoUnitarioHistorico) * d.cantidad), 0) FROM VentaDetalle d WHERE d.venta.id = v.id),
                COALESCE(u.username, '(sin vendedor)'),
                u.id
            )
            FROM Venta v LEFT JOIN v.cliente c LEFT JOIN v.usuario u
            WHERE v.fecha BETWEEN :desde AND :hasta
              AND v.unidadNegocio.id = :unidadId
              AND (:usuarioId IS NULL OR u.id = :usuarioId)
              AND (:q IS NULL OR :q = '' OR LOWER(COALESCE(c.nombreRazonSocial, v.clienteNombreCasual, '(eliminado)')) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY v.fecha DESC
            """)
    Page<VentaLiteDTO> listarVentasPorRango(@Param("desde") LocalDateTime desde,
                                            @Param("hasta") LocalDateTime hasta,
                                            @Param("q") String q,
                                            @Param("unidadId") Long unidadId,
                                            @Param("usuarioId") Long usuarioId,
                                            Pageable pageable);

    @Query("SELECT d.venta.id, d.producto.nombre, d.cantidad FROM VentaDetalle d WHERE d.venta.id IN :ventaIds")
    List<Object[]> obtenerDetallesBasicosPorVentas(@Param("ventaIds") List<Long> ventaIds);

    /**
     * Ventas de un cliente en una unidad de negocio, con "detalles" precargados
     * (evita el N+1 de traer los ítems de cada venta con una query aparte).
     *
     * Los "pagos" NO se traen acá: Hibernate no permite hacer JOIN FETCH de dos colecciones
     * de tipo List (bags) en la misma consulta y falla con MultipleBagFetchException.
     * Se cargan con completarPagos(...) en una segunda consulta, dentro de la misma
     * transacción, que llena la colección de las mismas entidades ya cargadas.
     *
     * Sin paginación a propósito (Decisión 3 de design.md, capability factura-cliente): el
     * documento de cuenta corriente ES el total, un total paginado sería un total falso.
     * El soft delete ya lo filtra @SQLRestriction("deleted = false") a nivel de la entidad
     * Venta, por eso NO se agrega "AND v.deleted = false" acá: duplicaría el filtro.
     */
    @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.detalles "
            + "WHERE v.cliente.id = :clienteId AND v.unidadNegocio.id = :unidadNegocioId ORDER BY v.fecha DESC")
    List<Venta> findByClienteIdAndUnidadNegocioIdOrderByFechaDesc(@Param("clienteId") Long clienteId,
                                                                    @Param("unidadNegocioId") Long unidadNegocioId);

    /**
     * Variante sin filtro de unidad de negocio, para cuando UnidadNegocioContextHolder.getUnidadNegocioId()
     * devuelve null (mismo patrón condicional que VentaServiceImpl.listarVentas y ClienteServiceImpl.getAll).
     */
    @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.detalles "
            + "WHERE v.cliente.id = :clienteId ORDER BY v.fecha DESC")
    List<Venta> findByClienteIdOrderByFechaDesc(@Param("clienteId") Long clienteId);

    /**
     * Segunda mitad del fetch en dos pasos: carga los "pagos" de las ventas ya traídas por los
     * métodos de arriba. Al ejecutarse dentro de la misma transacción, Hibernate completa la
     * colección "pagos" de esas mismas instancias en el contexto de persistencia, así que el
     * valor de retorno se descarta: lo que importa es el efecto sobre las entidades ya cargadas.
     * Son dos consultas fijas en total, no una por venta: no reintroduce el N+1.
     */
    @Query("SELECT DISTINCT v FROM Venta v LEFT JOIN FETCH v.pagos WHERE v IN :ventas")
    List<Venta> completarPagos(@Param("ventas") List<Venta> ventas);
}