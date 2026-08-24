package com.vivero.gestion.services;

import java.util.List;

import com.vivero.gestion.dto.ProductoResumenProveedorDTO;
import com.vivero.gestion.dto.ProveedorDTO;

public interface ProveedorService {
    List<ProveedorDTO> getAll();
    ProveedorDTO getById(Long id);
    ProveedorDTO create(ProveedorDTO dto);
    ProveedorDTO update(Long id, ProveedorDTO dto);
    void delete(Long id);

    // Productos asociados a un proveedor, acotados a la unidad activa (tarea 3.6). Alimenta la
    // vista previa del grupo 11 ("reaplicar a sus productos"), que no se implementa en este grupo.
    List<ProductoResumenProveedorDTO> obtenerProductosAsociados(Long proveedorId);
}
