package com.vivero.gestion.repositories;

import com.vivero.gestion.models.VentaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface VentaDetalleRepository extends JpaRepository<VentaDetalle, Long> {

}