package com.vivero.gestion.services;

import java.util.List;

import com.vivero.gestion.dto.SiembraDTO;

public interface SiembraService {
    List<SiembraDTO> obtenerTodas();
    SiembraDTO obtenerPorId(Long id);
    SiembraDTO crearSiembra(SiembraDTO siembraDTO);
    SiembraDTO actualizarSiembra(Long id, SiembraDTO siembraDTO);
    void eliminarSiembra(Long id);
    SiembraDTO finalizarSiembra(Long idSiembra, Long idProducto, Integer cantidadLograda, Long usuarioId);
    SiembraDTO pasarAStock(Long id, com.vivero.gestion.dto.PasarStockRequestDTO request);
    List<SiembraDTO> obtenerAlertas();
}
