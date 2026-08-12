package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Cheque;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;

@Repository
public interface ChequeRepository extends JpaRepository<Cheque, Long> {
    Page<Cheque> findAllByOrderByFechaRecepcionDesc(Pageable pageable);

    @Query("SELECT COALESCE(SUM(c.monto), 0) FROM Cheque c WHERE c.estado = 'EN_CARTERA' AND c.esEmisionPropia = false")
    BigDecimal sumarChequesEnCartera();
}
