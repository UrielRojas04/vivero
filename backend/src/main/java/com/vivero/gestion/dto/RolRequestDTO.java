package com.vivero.gestion.dto;

import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolRequestDTO {
    private String nombre;
    private List<Long> permisoIds;
}
