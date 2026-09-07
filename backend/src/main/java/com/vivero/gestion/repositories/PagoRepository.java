package com.vivero.gestion.repositories;

import com.vivero.gestion.dto.PagoHistorialAbonoDTO;
import com.vivero.gestion.models.Pago;
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
public interface PagoRepository extends JpaRepository<Pago, Long> {

    @Query("""
            SELECT v.id, p.metodoPago
            FROM Pago p
            JOIN p.venta v
            WHERE v.fecha BETWEEN :desde AND :hasta
            ORDER BY p.fecha DESC, p.id DESC
            """)
    List<Object[]> findMetodoPagoPorVenta(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM Pago p WHERE p.cuentaAbono = :cuenta AND p.fecha BETWEEN :desde AND :hasta AND p.estado = 'ACREDITADO'")
    BigDecimal sumarPagosPorCuentaYPeriodo(@Param("cuenta") com.vivero.gestion.models.CuentaAbono cuenta, @Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta);

    /**
     * Historial global de cobros de una unidad de negocio (Decisión 3 de design.md de
     * historial-cobros-abono): proyección JPQL a DTO, NO entidades ni @EntityGraph.
     *
     * Por qué proyección y no @EntityGraph con Page<Pago>: Pago.venta es un @ManyToOne EAGER
     * sin @NotFound(IGNORE), y Venta tiene @SQLRestriction("deleted = false") (soft delete). Traer
     * la entidad Pago completa cuando su venta fue anulada dispara FetchNotFoundException en
     * Hibernate 6 -- el mismo bug de clase que ya se vio con Venta.cliente. La proyección nunca
     * materializa la asociación, así que no puede pisar ese error.
     *
     * Por qué LEFT JOIN explícitos a unidadNegocio (uv/uf) en vez de "v.unidadNegocio.id" directo
     * en el WHERE: escribirlo así genera un join implícito que Hibernate resuelve como INNER JOIN,
     * lo que dejaría afuera los pagos directos a factura (sin venta, v == null).
     *
     * Consecuencia asumida: un pago de una venta anulada queda con v en null por el
     * @SQLRestriction -- si tiene factura aparece como "pago a cuenta corriente"; si no tiene
     * ninguna referencia viva, el WHERE lo descarta. Es el comportamiento correcto: un cobro de
     * una venta anulada no es plata cobrada en el circuito vivo.
     *
     * `:q` matchea por nombre de cliente (como antes) O por número de venta (pedido puntual del
     * dueño): se castea v.id a texto y se compara con LIKE, mismo idioma de coincidencia parcial
     * que el resto del buscador -- así "12" encuentra la venta #12 sin obligar a tipear el número
     * completo. Un pago sin venta (directo a factura) nunca matchea por número, que es correcto.
     */
    @Query("""
            SELECT new com.vivero.gestion.dto.PagoHistorialAbonoDTO(
                p.id, p.fecha, p.monto, p.metodoPago, p.estado, p.cuentaAbono,
                v.id, v.fecha, f.id,
                COALESCE(cv.nombreRazonSocial, v.clienteNombreCasual, cf.nombreRazonSocial, '(eliminado)')
            )
            FROM Pago p
            LEFT JOIN p.venta v
            LEFT JOIN v.cliente cv
            LEFT JOIN v.unidadNegocio uv
            LEFT JOIN p.factura f
            LEFT JOIN f.cliente cf
            LEFT JOIN f.unidadNegocio uf
            WHERE (uv.id = :unidadId OR uf.id = :unidadId)
              AND (CAST(:desde AS timestamp) IS NULL OR p.fecha >= :desde)
              AND (CAST(:hasta AS timestamp) IS NULL OR p.fecha <= :hasta)
              AND (:q IS NULL OR :q = ''
                   OR LOWER(COALESCE(cv.nombreRazonSocial, v.clienteNombreCasual, cf.nombreRazonSocial, '')) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR CAST(v.id AS string) LIKE CONCAT('%', :q, '%'))
            ORDER BY p.fecha DESC, p.id DESC
            """)
    Page<PagoHistorialAbonoDTO> listarHistorialCobros(@Param("unidadId") Long unidadId,
                                                        @Param("desde") LocalDateTime desde,
                                                        @Param("hasta") LocalDateTime hasta,
                                                        @Param("q") String q,
                                                        Pageable pageable);
}