package com.vivero.gestion.services;

import com.vivero.gestion.models.Bandeja;
import com.vivero.gestion.repositories.BandejaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class BandejaService {
    @Autowired
    private BandejaRepository repository;

    public List<Bandeja> listarTodas() {
        return repository.findAll();
    }

    public Bandeja guardar(Bandeja bandeja) {
        return repository.save(bandeja);
    }

    public void eliminar(Long id) {
        repository.deleteById(id);
    }

    public Bandeja buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bandeja no encontrada"));
    }
}