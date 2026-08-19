package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Cheque;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ChequeRepository extends JpaRepository<Cheque, Long> {
    Page<Cheque> findAllByOrderByFechaRecepcionDesc(Pageable pageable);

    Page<Cheque> findAllByUnidadNegocioIdOrderByFechaRecepcionDesc(Long unidadNegocioId, Pageable pageable);

    // Usado por el documento de cuenta corriente (factura-cliente): los cheques sueltos de un
    // cliente son la única parte de "otros movimientos" que sí tiene registro; el ajuste manual
    // de saldo no deja ninguno (ver Decisión 4 de openspec/changes/.../factura-cliente-dinamica/design.md).
    List<Cheque> findByClienteIdOrderByFechaRecepcionDesc(Long clienteId);

    @Query("SELECT COALESCE(SUM(c.monto), 0) FROM Cheque c WHERE c.estado = 'EN_CARTERA' AND c.esEmisionPropia = false")
    BigDecimal sumarChequesEnCartera();

    @Query("SELECT COALESCE(SUM(c.monto), 0) FROM Cheque c WHERE c.estado = 'EN_CARTERA' AND c.esEmisionPropia = false AND c.unidadNegocio.id = :unidadId")
    BigDecimal sumarChequesEnCarteraByUnidadNegocioId(@org.springframework.data.repository.query.Param("unidadId") Long unidadId);
}
