package com.vivero.gestion.controllers;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/**
 * Pedido del dueño (2026-09-03): el buscador de "dueño de lote" en Siembras y el buscador de
 * cliente en Registro de Semillas necesitan poder listar clientes (nombre/teléfono) aunque el
 * usuario no tenga LEER_CLIENTES -- Samu (sólo Siembras) y cualquier usuario de sólo Registro de
 * Semillas se quedaban sin poder buscar clientes existentes. En vez de un endpoint nuevo (opción
 * descartada explícitamente por el dueño), se amplía el permiso de lectura de GET /api/clientes
 * para aceptar también LEER_SIEMBRAS y LEER_REGISTRO_SEMILLAS -- el frontend de esos dos
 * formularios ya no muestra saldo, sólo nombre y teléfono, así que no hay exposición visual de
 * datos financieros aunque el payload completo viaje igual (ver ClienteDTO).
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class ClienteControllerGetAllPermisoAmpliadoTest {

    @Autowired
    private ClienteController controller;

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    private void autenticarCon(String... autoridades) {
        List<SimpleGrantedAuthority> authorities = List.of(autoridades).stream()
                .map(SimpleGrantedAuthority::new)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("Sergio", null, authorities));
    }

    @Test
    void getAllPermiteUsuarioConSoloLeerSiembras() {
        autenticarCon("LEER_SIEMBRAS");

        assertDoesNotThrow(() -> controller.getAll());
    }

    @Test
    void getAllPermiteUsuarioConSoloLeerRegistroSemillas() {
        autenticarCon("LEER_REGISTRO_SEMILLAS");

        assertDoesNotThrow(() -> controller.getAll());
    }

    @Test
    void getAllSigueFuncionandoConSoloLeerClientes() {
        autenticarCon("LEER_CLIENTES");

        assertDoesNotThrow(() -> controller.getAll());
    }

    @Test
    void getAllRechazaUsuarioSinNingunPermisoRelevante() {
        // ESCRIBIR_VENTAS ya no sirve acá para "irrelevante" -- se sumó como autorización válida
        // el mismo día (ver VentasBusquedaClientesYProductosTest). ESCRIBIR_PEDIDOS es un permiso
        // real que no tiene nada que ver con clientes.
        autenticarCon("ESCRIBIR_PEDIDOS");

        assertThatThrownBy(() -> controller.getAll())
                .isInstanceOf(AccessDeniedException.class);
    }
}
