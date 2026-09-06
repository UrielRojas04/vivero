package com.vivero.gestion.services;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.vivero.gestion.dto.RegistroSemillaDTO;
import com.vivero.gestion.dto.SiembraDTO;
import com.vivero.gestion.dto.VariedadBandejaDTO;
import com.vivero.gestion.dto.VariedadPlantaDTO;
import com.vivero.gestion.models.EstadoRegistroSemilla;
import com.vivero.gestion.models.TipoOrigenSiembra;
import com.vivero.gestion.models.UnidadCantidadSemilla;
import com.vivero.gestion.models.VariedadBandeja;
import com.vivero.gestion.models.VariedadPlanta;
import com.vivero.gestion.repositories.RegistroSemillaRepository;
import com.vivero.gestion.repositories.SiembraRepository;
import com.vivero.gestion.repositories.VariedadBandejaRepository;
import com.vivero.gestion.repositories.VariedadPlantaRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Change trazabilidad-semillas-siembras (2026-09-04): vínculo opcional entre Siembra y
 * RegistroSemilla, y el efecto de ese vínculo sobre el estado del registro. Base real
 * (Postgres en localhost:5433), sin mocks de DB, mismo patrón que RegistroSemillaValidacionTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class SiembraRegistroSemillaVinculoTest {

    @Autowired
    private SiembraService siembraService;

    @Autowired
    private RegistroSemillaService registroSemillaService;

    @Autowired
    private SiembraRepository siembraRepository;

    @Autowired
    private RegistroSemillaRepository registroSemillaRepository;

    @Autowired
    private VariedadPlantaRepository variedadPlantaRepository;

    @Autowired
    private VariedadBandejaRepository variedadBandejaRepository;

    private Long siembraId;
    private Long registroId;
    private Long variedadPlantaId;
    private Long variedadBandejaId;

    @AfterEach
    void limpiar() {
        if (siembraId != null) siembraRepository.deleteById(siembraId);
        if (registroId != null) registroSemillaRepository.deleteById(registroId);
        if (variedadPlantaId != null) variedadPlantaRepository.deleteById(variedadPlantaId);
        if (variedadBandejaId != null) variedadBandejaRepository.deleteById(variedadBandejaId);
        siembraId = null;
        registroId = null;
        variedadPlantaId = null;
        variedadBandejaId = null;
    }

    private Long crearVariedadPlanta() {
        VariedadPlanta vp = new VariedadPlanta();
        vp.setNombre("Test Vinculo Planta");
        VariedadPlanta saved = variedadPlantaRepository.save(vp);
        variedadPlantaId = saved.getId();
        return saved.getId();
    }

    private Long crearVariedadBandeja(int celdas) {
        VariedadBandeja vb = new VariedadBandeja();
        vb.setNombre("Test Vinculo Bandeja");
        vb.setCantidadCeldas(celdas);
        VariedadBandeja saved = variedadBandejaRepository.save(vb);
        variedadBandejaId = saved.getId();
        return saved.getId();
    }

    private Long crearRegistroSemilla() {
        RegistroSemillaDTO dto = new RegistroSemillaDTO();
        dto.setFechaRecepcion(LocalDate.now());
        dto.setLote("TEST-VINCULO-" + System.nanoTime());
        dto.setNombreQuienTrajo("Cliente Test Vinculo");
        dto.setDescripcionSemilla("Semilla test vinculo");
        dto.setCantidad(BigDecimal.valueOf(1000));
        dto.setUnidadCantidad(UnidadCantidadSemilla.SEMILLAS);
        RegistroSemillaDTO creado = registroSemillaService.crear(dto, null);
        registroId = creado.getId();
        return creado.getId();
    }

    private SiembraDTO dtoMinimoValidoOrigenSobre(Long registroSemillaId) {
        SiembraDTO dto = new SiembraDTO();
        VariedadPlantaDTO vp = new VariedadPlantaDTO();
        vp.setId(crearVariedadPlanta());
        dto.setVariedadPlanta(vp);
        VariedadBandejaDTO vb = new VariedadBandejaDTO();
        vb.setId(crearVariedadBandeja(50));
        dto.setVariedadBandeja(vb);
        dto.setDueno("Dueno Test Vinculo");
        dto.setCodigoLote("LOTE-TEST");
        dto.setNumeroSiembra("NS-" + System.nanoTime());
        dto.setFechaSiembraInicio(LocalDate.now());
        dto.setTipoOrigen(TipoOrigenSiembra.SOBRE);
        dto.setCantidad(1);
        dto.setRegistroSemillaId(registroSemillaId);
        return dto;
    }

    @Test
    void vincularRegistroSinSembrarLoPasaASembradas() {
        Long registroSemillaId = crearRegistroSemilla();
        SiembraDTO dto = dtoMinimoValidoOrigenSobre(registroSemillaId);

        SiembraDTO creada = siembraService.crearSiembra(dto);
        siembraId = creada.getId();

        assertThat(creada.getRegistroSemillaId()).isEqualTo(registroSemillaId);
        RegistroSemillaDTO registroActualizado = registroSemillaService.obtenerPorId(registroSemillaId);
        assertThat(registroActualizado.getEstado()).isEqualTo(EstadoRegistroSemilla.SEMBRADAS);
    }

    @Test
    void vincularUnRegistroYaSembradoAOtraSiembraLoDejaSembradas() {
        // Triangulación: un registro puede repartirse en varias tandas -- vincularlo de nuevo
        // no debe romper nada ni cambiar el estado.
        //
        // Bug real corregido (2026-09-05, reportado por el dueño: aparecían variedades de
        // prueba en el buscador real): dtoMinimoValidoOrigenSobre() crea una VariedadPlanta y
        // una VariedadBandeja nuevas cada vez que se llama. Llamarla dos veces (una por
        // siembra) pisaba variedadPlantaId/variedadBandejaId -- campos de instancia -- con los
        // ids de la SEGUNDA llamada, dejando huérfana la primera pareja para siempre. Se reusa
        // el mismo dto (mismas variedad/bandeja) para la segunda siembra en vez de llamar de
        // nuevo al builder.
        Long registroSemillaId = crearRegistroSemilla();
        SiembraDTO dto = dtoMinimoValidoOrigenSobre(registroSemillaId);
        SiembraDTO primera = siembraService.crearSiembra(dto);

        dto.setNumeroSiembra("NS-SEGUNDA-" + System.nanoTime());
        SiembraDTO segunda = siembraService.crearSiembra(dto);

        try {
            assertThat(segunda.getRegistroSemillaId()).isEqualTo(registroSemillaId);
            RegistroSemillaDTO registroActualizado = registroSemillaService.obtenerPorId(registroSemillaId);
            assertThat(registroActualizado.getEstado()).isEqualTo(EstadoRegistroSemilla.SEMBRADAS);
        } finally {
            siembraRepository.deleteById(segunda.getId());
            siembraId = primera.getId();
        }
    }

    @Test
    void rechazaVincularUnRegistroConsumido() {
        Long registroSemillaId = crearRegistroSemilla();
        registroSemillaService.consumir(registroSemillaId);

        SiembraDTO dto = dtoMinimoValidoOrigenSobre(registroSemillaId);

        assertThatThrownBy(() -> siembraService.crearSiembra(dto))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void cambiarOrigenASueltoEnEdicionLimpiaElRegistroVinculado() {
        // Mismo bug de limpieza que el test de arriba: reusa el mismo dto (misma variedad/
        // bandeja) para la edición en vez de llamar de nuevo al builder.
        Long registroSemillaId = crearRegistroSemilla();
        SiembraDTO dto = dtoMinimoValidoOrigenSobre(registroSemillaId);
        SiembraDTO creada = siembraService.crearSiembra(dto);
        siembraId = creada.getId();

        dto.setTipoOrigen(TipoOrigenSiembra.SUELTO);
        dto.setCodigoLote(null);

        SiembraDTO actualizada = siembraService.actualizarSiembra(siembraId, dto);

        assertThat(actualizada.getRegistroSemillaId()).isNull();
    }
}
