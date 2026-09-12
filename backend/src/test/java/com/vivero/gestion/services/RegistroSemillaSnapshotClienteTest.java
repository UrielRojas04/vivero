package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.UsuarioRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Change registro-semillas-clientes, tareas 2.5 y 4.4: al vincular un Cliente se copian
 * nombreRazonSocial y telefono a nombreQuienTrajo/telefonoContacto en el momento del alta
 * (snapshot, NO referencia viva -- Decisión 2). Si el cliente se borra lógicamente después,
 * el registro histórico debe seguir devolviendo esos datos. Base real, sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaSnapshotClienteTest {

    @Autowired
    private RegistroSemillaService registroSemillaService;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private Long registroId;
    private Long clienteId;

    @AfterEach
    void limpiar() {
        if (registroId != null) registroSemillaRepository.deleteById(registroId);
        if (clienteId != null) clienteRepository.deleteById(clienteId);
        registroId = null;
        clienteId = null;
    }

    private Long obtenerUsuarioJefeId() {
        Usuario jefe = usuarioRepository.findByUsername("Sergio")
                .orElseThrow(() -> new IllegalStateException("Falta usuario jefe sembrado"));
        return jefe.getId();
    }

    private Cliente crearCliente(String nombre, String telefono) {
        UnidadNegocio vivero = unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setTelefono(telefono);
        c.setUnidadNegocio(vivero);
        return clienteRepository.save(c);
    }

    @Test
    void alVincularClienteSeCopianNombreYTelefonoAlRegistro() {
        Cliente cliente = crearCliente("Gustavo Aleo", "1122334455");
        clienteId = cliente.getId();

        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("40055");
        dto.setClienteId(clienteId);
        dto.setDescripcionSemilla("Super Red");
        dto.setCantidad(BigDecimal.valueOf(2));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SOBRES);

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getNombreQuienTrajo()).isEqualTo("Gustavo Aleo");
        assertThat(creado.getTelefonoContacto()).isEqualTo("1122334455");
        assertThat(creado.getClienteId()).isEqualTo(clienteId);
    }

    @Test
    void trasBorrarLogicamenteElClienteElRegistroConservaNombreYTelefono() {
        Cliente cliente = crearCliente("Ismael Test Snapshot", "3512223344");
        clienteId = cliente.getId();

        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("126898");
        dto.setClienteId(clienteId);
        dto.setDescripcionSemilla("Berenjena Aragon");
        dto.setCantidad(BigDecimal.valueOf(3));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SOBRES);

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        // Borrado lógico del cliente (mismo mecanismo @SQLDelete que usa el resto del sistema).
        clienteRepository.deleteById(clienteId);

        RegistroSemillaDTO releido = registroSemillaService.obtenerPorId(registroId);

        assertThat(releido.getNombreQuienTrajo()).isEqualTo("Ismael Test Snapshot");
        assertThat(releido.getTelefonoContacto()).isEqualTo("3512223344");
    }
}
