// src/main/java/com/vivero/gestion/repositories/BandejaRepository.java
package com.vivero.gestion.repositories;

import com.vivero.gestion.models.Bandeja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface BandejaRepository extends JpaRepository<Bandeja, Long> {

    @Query("SELECT SUM(b.cantidad) FROM Bandeja b WHERE b.ubicacion.id = :ubicacionId AND b.vendida = false")
    Integer sumCantidadByUbicacionId(@Param("ubicacionId") Long ubicacionId);

    // Método para la lógica híbrida de unificación
    Optional<Bandeja> findByCodigoLoteAndUbicacionIdAndVendidaFalse(String codigoLote, Long ubicacionId);

    boolean existsByVariedadId(Long variedadId);
    boolean existsByUbicacionId(Long ubicacionId);
    boolean existsByTipoBandejaId(Long tipoId);
}