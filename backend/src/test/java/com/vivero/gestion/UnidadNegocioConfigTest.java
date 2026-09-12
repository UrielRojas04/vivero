package com.vivero.gestion;

import com.vivero.gestion.models.ModeloCostoUnidad;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
public class UnidadNegocioConfigTest {

    @Autowired
    private UnidadNegocioRepository repository;

    @Autowired
    private com.vivero.gestion.config.DataInitializer dataInitializer;

    @Test
    void testModeloCostoSeededCorrectly() throws Exception {
        // Run the seed again to ensure idempotence
        dataInitializer.run("");

        Optional<UnidadNegocio> vivero = repository.findByNombre("Vivero");
        assertThat(vivero).isPresent();
        assertThat(vivero.get().getModeloCosto()).isEqualTo(ModeloCostoUnidad.INSUMOS);
        assertThat(vivero.get().getPorcentajeRepartoColega()).isEqualByComparingTo("0.00");

        Optional<UnidadNegocio> herramientas = repository.findByNombre("Herramientas");
        assertThat(herramientas).isPresent();
        assertThat(herramientas.get().getModeloCosto()).isEqualTo(ModeloCostoUnidad.MERCADERIA_VENDIDA);
        assertThat(herramientas.get().getPorcentajeRepartoColega()).isEqualByComparingTo("0.00");
    }
}
