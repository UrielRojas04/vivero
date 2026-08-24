package com.vivero.gestion.services;

import com.vivero.gestion.dto.ProductoDTO;
import com.vivero.gestion.dto.RevisionCostoProductoDTO;
import java.util.List;

public interface ProductoService {
    ProductoDTO crearProducto(ProductoDTO productoDTO);
    ProductoDTO obtenerProductoPorId(Long id);
    List<ProductoDTO> obtenerTodosLosProductos();
    ProductoDTO actualizarProducto(Long id, ProductoDTO productoDTO);
    void eliminarProducto(Long id);

    // Panel de revisión de costos (grupo 3 de tasks.md de revision-costos-productos). Sólo
    // lectura: arma el DTO de cada fila reusando CostoCalculator, sin lógica de negocio nueva
    // sobre el costo (tarea 3.4).
    List<RevisionCostoProductoDTO> listarRevisionCostos();
}
