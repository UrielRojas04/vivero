package com.vivero.gestion.repositories;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vivero.gestion.models.Cliente;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    
    @EntityGraph(attributePaths = {"cuentaCorrienteDinero", "cuentaCorrienteBandejas"})
    List<Cliente> findAll();
}
