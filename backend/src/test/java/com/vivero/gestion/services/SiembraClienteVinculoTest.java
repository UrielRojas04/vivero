package com.vivero.gestion.services;

import java.time.LocalDate;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import com.vivero.gestion.dto.SiembraDTO;
import com.vivero.gestion.dto.VariedadBandejaDTO;
import com.vivero.gestion.dto.VariedadPlantaDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.TipoOrigenSiembra;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.VariedadBandeja;
import com.vivero.gestion.models.VariedadPlanta;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.SiembraRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VariedadBandejaRepository;
import com.vivero.gestion.repositories.VariedadPlantaRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pedido del dueño (2026-09-05): "ahora sí necesitamos asociar la siembra a un cliente". Con
 * clienteId, Siembra.dueno es un snapshot del nombre del cliente (mismo patrón exacto que
 * RegistroSemilla.nombreQuienTrajo). Sin clienteId, sigue existiendo el caso "Jefe / Vivero
 * propio" sin cambios. Base real, sin mocks de DB.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class SiembraClienteVinculoTest {

    @Autowired
    private SiembraService siembraService;

    @Autowired
    private SiembraRepository siembraRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private VariedadPlantaRepository variedadPlantaRepository;

    @Autowired
    private VariedadBandejaRepository variedadBandejaRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private Long siembraId;
    private Long clienteId;
    private Long variedadPlantaId;
    private Long variedadBandejaId;

    @AfterEach
    void limpiar() {
        if (siembraId != null) siembraRepository.deleteById(siembraId);
        if (clienteId != null) clienteRepository.deleteById(clienteId);
        if (variedadPlantaId != null) variedadPlantaRepository.deleteById(variedadPlantaId);
        if (variedadBandejaId != null) variedadBandejaRepository.deleteById(variedadBandejaId);
        siembraId = null;
        clienteId = null;
        variedadPlantaId = null;
        variedadBandejaId = null;
    }

    private Long crearCliente(String nombre) {
        UnidadNegocio vivero = unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setUnidadNegocio(vivero);
        Cliente saved = clienteRepository.save(c);
        clienteId = saved.getId();
        return saved.getId();
    }

    private SiembraDTO dtoMinimoValido() {
        SiembraDTO dto = new SiembraDTO();
        VariedadPlanta vp = new VariedadPlanta();
        vp.setNombre("Test Cliente Vinculo Planta");
        VariedadPlanta vpSaved = variedadPlantaRepository.save(vp);
        variedadPlantaId = vpSaved.getId();
        VariedadPlantaDTO vpDto = new VariedadPlantaDTO();
        vpDto.setId(vpSaved.getId());
        dto.setVariedadPlanta(vpDto);

        VariedadBandeja vb = new VariedadBandeja();
        vb.setNombre("Test Cliente Vinculo Bandeja");
        vb.setCantidadCeldas(50);
        VariedadBandeja vbSaved = variedadBandejaRepository.save(vb);
        variedadBandejaId = vbSaved.getId();
        VariedadBandejaDTO vbDto = new VariedadBandejaDTO();
        vbDto.setId(vbSaved.getId());
        dto.setVariedadBandeja(vbDto);

        dto.setCodigoLote("LOTE-CLIENTE-TEST");
        dto.setNumeroSiembra("NS-CLIENTE-" + System.nanoTime());
        dto.setFechaSiembraInicio(LocalDate.now());
        dto.setTipoOrigen(TipoOrigenSiembra.SOBRE);
        dto.setCantidad(1);
        return dto;
    }

    @Test
    void vincularClienteAutocompletaDueno() {
        Long clienteId = crearCliente("Marcos Test Cliente Siembra");
        SiembraDTO dto = dtoMinimoValido();
        dto.setClienteId(clienteId);
        dto.setDueno("texto que el service debe ignorar");

        SiembraDTO creada = siembraService.crearSiembra(dto);
        siembraId = creada.getId();

        assertThat(creada.getClienteId()).isEqualTo(clienteId);
        assertThat(creada.getDueno()).isEqualTo("Marcos Test Cliente Siembra");
    }

    @Test
    void sinClienteIdMantieneElCasoJefeSinCambios() {
        // Triangulación: "Jefe / Vivero propio" sigue funcionando exactamente igual, sin
        // requerir ningún cliente.
        SiembraDTO dto = dtoMinimoValido();
        dto.setClienteId(null);
        dto.setDueno("Jefe / Vivero propio");

        SiembraDTO creada = siembraService.crearSiembra(dto);
        siembraId = creada.getId();

        assertThat(creada.getClienteId()).isNull();
        assertThat(creada.getDueno()).isEqualTo("Jefe / Vivero propio");
    }

    @Test
    void editarParaCambiarDeUnClienteAOtroActualizaElSnapshot() {
        Long clienteUno = crearCliente("Cliente Uno Test");
        SiembraDTO dto = dtoMinimoValido();
        dto.setClienteId(clienteUno);
        SiembraDTO creada = siembraService.crearSiembra(dto);
        siembraId = creada.getId();

        // Reusa la misma variedad/bandeja de la creación (no llama a dtoMinimoValido() de
        // nuevo): evita crear un segundo par de filas de prueba que quedarían huérfanas, ya que
        // variedadPlantaId/variedadBandejaId son campos de instancia trackeados uno solo a la vez.
        UnidadNegocio vivero = unidadNegocioRepository.findByNombre("Vivero").orElseThrow();
        Cliente clienteDos = new Cliente();
        clienteDos.setNombreRazonSocial("Cliente Dos Test");
        clienteDos.setUnidadNegocio(vivero);
        clienteDos = clienteRepository.save(clienteDos);

        try {
            dto.setClienteId(clienteDos.getId());

            SiembraDTO actualizada = siembraService.actualizarSiembra(siembraId, dto);

            assertThat(actualizada.getClienteId()).isEqualTo(clienteDos.getId());
            assertThat(actualizada.getDueno()).isEqualTo("Cliente Dos Test");
        } finally {
            clienteRepository.deleteById(clienteDos.getId());
        }
    }
}
