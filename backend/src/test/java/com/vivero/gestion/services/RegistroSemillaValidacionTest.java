package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.repositories.UsuarioRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Change registro-semillas-clientes: valida validarYNormalizar() de
 * RegistroSemillaServiceImpl (tareas 2.4, 4.1, 4.2, 4.5). Base real (Postgres en
 * localhost:5433), sin mocks de DB, mismo patrón que FacturaClienteSaldoBandejasTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class RegistroSemillaValidacionTest {

    @Autowired
    private RegistroSemillaService registroSemillaService;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Long usuarioId;
    private Long registroId;

    @AfterEach
    void limpiar() {
        if (registroId != null) registroSemillaRepository.deleteById(registroId);
        registroId = null;
    }

    private Long obtenerUsuarioJefeId() {
        if (usuarioId == null) {
            Usuario jefe = usuarioRepository.findByUsername("Sergio")
                    .orElseThrow(() -> new IllegalStateException("Falta usuario jefe sembrado"));
            usuarioId = jefe.getId();
        }
        return usuarioId;
    }

    private RegistroSemillaDTO dtoMinimoValido() {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("PL154303");
        dto.setNombreQuienTrajo("Claudio Cardon");
        dto.setDescripcionSemilla("Pimiento camino Real");
        dto.setCantidad(BigDecimal.valueOf(1000));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SEMILLAS);
        return dto;
    }

    @Test
    void altaValidaMinimaSePersisteCorrectamente() {
        RegistroSemillaDTO dto = dtoMinimoValido();

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getId()).isNotNull();
        assertThat(creado.getLote()).isEqualTo("PL154303");
        assertThat(creado.getNombreQuienTrajo()).isEqualTo("Claudio Cardon");
        assertThat(creado.getDescripcionSemilla()).isEqualTo("Pimiento camino Real");
        assertThat(creado.getUsuarioRecibeNombre()).isEqualTo("Sergio");
        assertThat(creado.getFechaRegistro()).isNotNull();
    }

    @Test
    void rechazaLoteEnBlanco() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setLote("   ");

        assertThatThrownBy(() -> registroSemillaService.crear(dto, obtenerUsuarioJefeId()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void rechazaDescripcionSemillaEnBlanco() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setDescripcionSemilla("");

        assertThatThrownBy(() -> registroSemillaService.crear(dto, obtenerUsuarioJefeId()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void rechazaUnidadCantidadNula() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setUnidadCantidad(null);

        assertThatThrownBy(() -> registroSemillaService.crear(dto, obtenerUsuarioJefeId()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void rechazaNombreQuienTrajoEnBlancoSinCliente() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setNombreQuienTrajo("  ");
        dto.setClienteId(null);

        assertThatThrownBy(() -> registroSemillaService.crear(dto, obtenerUsuarioJefeId()))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void conservaContenidoPorSobreCuandoUnidadEsSobres() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setUnidadCantidad(UnidadCantidadSemilla.SOBRES);
        dto.setCantidad(BigDecimal.valueOf(3));
        dto.setContenidoPorSobre(1250);

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getContenidoPorSobre()).isEqualTo(1250);
    }

    @Test
    void fuerzaContenidoPorSobreANuloCuandoUnidadEsGramos() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setUnidadCantidad(UnidadCantidadSemilla.GRAMOS);
        dto.setCantidad(BigDecimal.valueOf(10));
        dto.setContenidoPorSobre(1250); // valor espurio que el servicio debe descartar

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getContenidoPorSobre()).isNull();
    }

    @Test
    void loteConCeroInicialSePersisteTalCual() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setLote("043");

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getLote()).isEqualTo("043");
    }

    @Test
    void loteAlfanumericoSePersistaSinNormalizar() {
        RegistroSemillaDTO dto = dtoMinimoValido();
        dto.setLote("FP12.5H526");

        RegistroSemillaDTO creado = registroSemillaService.crear(dto, obtenerUsuarioJefeId());
        registroId = creado.getId();

        assertThat(creado.getLote()).isEqualTo("FP12.5H526");
    }

    @Test
    void dosRegistrosPuedenCompartirElMismoLoteSinErrorDeUnicidad() {
        RegistroSemillaDTO dto1 = dtoMinimoValido();
        dto1.setLote("18KR");
        RegistroSemillaDTO creado1 = registroSemillaService.crear(dto1, obtenerUsuarioJefeId());

        RegistroSemillaDTO dto2 = dtoMinimoValido();
        dto2.setLote("18KR");
        dto2.setNombreQuienTrajo("Otro Cliente");
        RegistroSemillaDTO creado2 = registroSemillaService.crear(dto2, obtenerUsuarioJefeId());

        try {
            assertThat(creado1.getLote()).isEqualTo("18KR");
            assertThat(creado2.getLote()).isEqualTo("18KR");
            assertThat(creado1.getId()).isNotEqualTo(creado2.getId());
        } finally {
            registroSemillaRepository.deleteById(creado1.getId());
            registroSemillaRepository.deleteById(creado2.getId());
        }
    }
}
