package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Change clientes-dni-cuil, grupo 1: `Cliente` gana `dni` y `cuil`, ambos opcionales e
 * independientes (Decisión 1 de design.md). Base real (Postgres localhost:5433), sin mocks de
 * DB, mismo patrón que ClienteControllerGetAllPermisoAmpliadoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class ClienteDocumentosTest {

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CuentaCorrienteDineroRepository cuentaCorrienteDineroRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository cuentaCorrienteBandejasRepository;

    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        // Orden de borrado igual al de FacturaClienteSaldoBandejasTest: las cuentas corrientes
        // (creadas en cascada por ClienteServiceImpl.create) se borran primero, y recién después
        // el cliente -- borrar el cliente primero (soft delete) con las cuentas corrientes todavía
        // colgando de él dispara un TransientObjectException al flushear.
        for (Long id : clientesCreados) {
            cuentaCorrienteDineroRepository.findByClienteId(id)
                    .ifPresent(ccd -> cuentaCorrienteDineroRepository.deleteById(ccd.getId()));
            cuentaCorrienteBandejasRepository.findByClienteId(id)
                    .ifPresent(ccb -> cuentaCorrienteBandejasRepository.deleteById(ccb.getId()));
            clienteRepository.deleteById(id);
        }
        clientesCreados.clear();
    }

    private ClienteDTO crear(String nombre, String dni, String cuil) {
        ClienteDTO dto = ClienteDTO.builder()
                .nombreRazonSocial(nombre)
                .dni(dni)
                .cuil(cuil)
                .build();
        ClienteDTO creado = clienteService.create(dto);
        clientesCreados.add(creado.getId());
        return creado;
    }

    private String nombreUnico(String base) {
        return base + " " + UUID.randomUUID();
    }

    @Test
    void clienteConSoloDniPersisteYLeeCorrectamente() {
        ClienteDTO creado = crear(nombreUnico("Cliente Solo DNI"), "30123456", null);

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getDni()).isEqualTo("30123456");
        assertThat(leido.getCuil()).isNull();
    }

    @Test
    void clienteConSoloCuilPersisteYLeeCorrectamente() {
        ClienteDTO creado = crear(nombreUnico("Cliente Solo CUIL"), null, "20301234563");

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getDni()).isNull();
        assertThat(leido.getCuil()).isEqualTo("20301234563");
    }

    @Test
    void clienteConAmbosDocumentosPersisteLosDos() {
        ClienteDTO creado = crear(nombreUnico("Cliente Ambos Docs"), "30123456", "20301234563");

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getDni()).isEqualTo("30123456");
        assertThat(leido.getCuil()).isEqualTo("20301234563");
    }

    @Test
    void clienteSinNingunDocumentoQuedaEnNullEnAmbosCampos() {
        ClienteDTO creado = crear(nombreUnico("Cliente Sin Docs"), null, null);

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getDni()).isNull();
        assertThat(leido.getCuil()).isNull();
    }

    // --- Triangulación 1.5: normalización de espacios ---

    @Test
    void documentoConEspaciosAlrededorSeGuardaTrimmeado() {
        ClienteDTO creado = crear(nombreUnico("Cliente Doc Con Espacios"), "  30123456  ", "  20301234563  ");

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getDni()).isEqualTo("30123456");
        assertThat(leido.getCuil()).isEqualTo("20301234563");
    }

    @Test
    void documentoVacioOSoloEspaciosSeGuardaComoNull() {
        ClienteDTO creado = crear(nombreUnico("Cliente Doc Vacio"), "", "   ");

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getDni()).isNull();
        assertThat(leido.getCuil()).isNull();
    }

    // --- Triangulación 1.6: actualización no altera saldos de cuentas corrientes ---

    @Test
    void editarClienteCambiandoYVaciandoDocumentoNoAlteraSaldos() {
        ClienteDTO creado = crear(nombreUnico("Cliente Editar Doc"), "30123456", "20301234563");
        assertThat(creado.getBalanceDinero()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(creado.getBalanceBandejas()).isEqualTo(0);

        ClienteDTO paraActualizar = ClienteDTO.builder()
                .nombreRazonSocial(creado.getNombreRazonSocial())
                .dni("40999888")
                .cuil("")
                .build();

        ClienteDTO actualizado = clienteService.update(creado.getId(), paraActualizar);

        assertThat(actualizado.getDni()).isEqualTo("40999888");
        assertThat(actualizado.getCuil()).isNull();
        assertThat(actualizado.getBalanceDinero()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(actualizado.getBalanceBandejas()).isEqualTo(0);
    }
}
