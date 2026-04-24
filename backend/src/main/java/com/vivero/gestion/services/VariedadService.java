package com.vivero.gestion.services;

import com.vivero.gestion.models.Variedad;
import com.vivero.gestion.repositories.VariedadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VariedadService {

    @Autowired
    private VariedadRepository repository;

    public List<Variedad> listarTodas() {
        return repository.findAll();
    }

    public Variedad guardar(Variedad variedad) {
        return repository.save(variedad);
    }

    public void eliminar(Long id) {
        repository.deleteById(id);
    }
}