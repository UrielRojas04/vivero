package com.vivero.gestion.services;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.vivero.gestion.dto.PedidoDTO;
import com.vivero.gestion.dto.RecepcionPedidoDTO;
import com.vivero.gestion.models.EstadoPedido;

public interface PedidoService {
    PedidoDTO crear(PedidoDTO dto, String username);
    PedidoDTO obtenerPorId(Long id);
    Page<PedidoDTO> listar(EstadoPedido estado, Long proveedorId, Pageable pageable);
    PedidoDTO actualizar(Long id, PedidoDTO dto);
    void cancelar(Long id);
    void eliminar(Long id);
    PedidoDTO confirmarRecepcion(Long id, RecepcionPedidoDTO recepcionDTO, String username);
}
