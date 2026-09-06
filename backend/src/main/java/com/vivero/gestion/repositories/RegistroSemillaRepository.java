package com.vivero.gestion.repositories;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.RegistroSemilla;

@Repository
public interface RegistroSemillaRepository extends JpaRepository<RegistroSemilla, Long> {

    List<RegistroSemilla> findAllByOrderByFechaRecepcionDesc();

    // Firma paginada disponible desde el día uno aunque todavía no se use (Decisión 10):
    // activar paginación después es sólo cambiar el llamado del servicio, sin tocar esta
    // firma ni el contrato del endpoint.
    Page<RegistroSemilla> findAllByOrderByFechaRecepcionDesc(Pageable pageable);
}
