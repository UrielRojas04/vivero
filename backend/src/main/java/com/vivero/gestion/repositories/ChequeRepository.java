package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Cheque;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChequeRepository extends JpaRepository<Cheque, Long> {
    Page<Cheque> findAllByOrderByFechaRecepcionDesc(Pageable pageable);
}
