package com.vivero.gestion.controllers;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Change clientes-dni-cuil, grupo 4 (Decisión 4 de design.md): el alta de cliente al vuelo desde
 * Nueva Venta necesita que un rol con permiso de escritura de ventas pero SIN escritura de
 * clientes pueda invocar `POST /api/clientes`. Mismo criterio y mismo patrón que ya se usó para
 * ESCRIBIR_SIEMBRAS/ESCRIBIR_REGISTRO_SEMILLAS (ver comentario en ClienteController.create).
 * Base real (Postgres localhost:5433), sin mocks de DB, mismo patrón que
 * ClienteControllerGetAllPermisoAmpliadoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class ClienteControllerCrearPermisoVentasTest {

    @Autowired
    private ClienteController controller;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CuentaCorrienteDineroRepository cuentaCorrienteDineroRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository cuentaCorrienteBandejasRepository;

    private final List<Long> clientesCreados = new ArrayList<>();

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
        for (Long id : clientesCreados) {
            cuentaCorrienteDineroRepository.findByClienteId(id)
                    .ifPresent(ccd -> cuentaCorrienteDineroRepository.deleteById(ccd.getId()));
            cuentaCorrienteBandejasRepository.findByClienteId(id)
                    .ifPresent(ccb -> cuentaCorrienteBandejasRepository.deleteById(ccb.getId()));
            clienteRepository.deleteById(id);
        }
        clientesCreados.clear();
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }

    private ClienteDTO dtoNuevoCliente() {
        return ClienteDTO.builder()
                .nombreRazonSocial("Cliente Permiso Ventas Test " + UUID.randomUUID())
                .build();
    }

    @Test
    void createPermiteUsuarioConSoloEscribirVentas() {
        autenticarCon("ESCRIBIR_VENTAS");

        var response = assertDoesNotThrow(() -> controller.create(dtoNuevoCliente()));
        clientesCreados.add(response.getBody().getId());

        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void createSigueFuncionandoConSoloEscribirClientes() {
        autenticarCon("ESCRIBIR_CLIENTES");

        var response = assertDoesNotThrow(() -> controller.create(dtoNuevoCliente()));
        clientesCreados.add(response.getBody().getId());

        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void createSigueFuncionandoConSoloEscribirSiembras() {
        autenticarCon("ESCRIBIR_SIEMBRAS");

        var response = assertDoesNotThrow(() -> controller.create(dtoNuevoCliente()));
        clientesCreados.add(response.getBody().getId());

        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void createSigueFuncionandoConSoloEscribirRegistroSemillas() {
        autenticarCon("ESCRIBIR_REGISTRO_SEMILLAS");

        var response = assertDoesNotThrow(() -> controller.create(dtoNuevoCliente()));
        clientesCreados.add(response.getBody().getId());

        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void createRechazaUsuarioSinNingunoDeLosCuatroPermisos() {
        // Permiso real que no tiene nada que ver con clientes.
        autenticarCon("ESCRIBIR_PEDIDOS");

        assertThatThrownBy(() -> controller.create(dtoNuevoCliente()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
