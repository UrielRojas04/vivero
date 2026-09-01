package com.vivero.gestion;

import com.vivero.gestion.dto.DashboardResumenDTO;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import com.vivero.gestion.services.FinanzasService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
public class FinanzasBaselineTest {

    @Autowired
    private FinanzasService finanzasService;

    @Test
    public void printBaselines() {
        LocalDateTime desde = LocalDate.of(2026, 8, 1).atStartOfDay();
        LocalDateTime hasta = LocalDate.of(2026, 8, 31).atTime(LocalTime.MAX);

        // Vivero
        UnidadNegocioContextHolder.setUnidadNegocioId(1L);
        DashboardResumenDTO resumenVivero = finanzasService.resumen(desde, hasta, null);
        System.out.println("=== BASELINE VIVERO (1L) ===");
        System.out.println("totalVentas: " + resumenVivero.getTotalVentas());
        System.out.println("totalCostos: " + resumenVivero.getTotalCostos());
        System.out.println("gananciaNeta: " + resumenVivero.getGananciaNeta());
        System.out.println("margen: " + resumenVivero.getMargen());

        // Herramientas
        UnidadNegocioContextHolder.setUnidadNegocioId(2L);
        DashboardResumenDTO resumenHerr = finanzasService.resumen(desde, hasta, null);
        System.out.println("=== BASELINE HERRAMIENTAS (2L) ===");
        System.out.println("totalVentas: " + resumenHerr.getTotalVentas());
        System.out.println("totalCostos: " + resumenHerr.getTotalCostos());
        System.out.println("gananciaNeta: " + resumenHerr.getGananciaNeta());
        System.out.println("margen: " + resumenHerr.getMargen());
    }
}
