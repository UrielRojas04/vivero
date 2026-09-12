package com.vivero.gestion.services;

import com.vivero.gestion.dto.ClienteDTO;
import com.vivero.gestion.dto.VentaResponseDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaAbono;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Venta;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.VentaRepository;
import com.vivero.gestion.security.CuentaAbonoContextHolder;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Change clientes-compartidos-abono, grupo 1: la agenda de clientes de Abono deja de
 * particionarse por CuentaAbono (JEFE/COLEGA) — un mismo cliente debe verse y leerse igual
 * desde cualquiera de las dos cuentas. Base real (Postgres localhost:5433), sin mocks de DB,
 * mismo patrón que ClienteDocumentosTest y VentaServiceListarVentasAbonoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=${DB_PASS}",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class ClienteAgendaCompartidaAbonoTest {

    @Autowired
    private ClienteService clienteService;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CuentaCorrienteDineroRepository cuentaCorrienteDineroRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository cuentaCorrienteBandejasRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private VentaService ventaService;

    @PersistenceContext
    private EntityManager entityManager;

    private final List<Long> clientesCreados = new ArrayList<>();
    private final List<Long> ventasCreadas = new ArrayList<>();

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
        CuentaAbonoContextHolder.clear();
        // Las ventas referencian al cliente por FK: borrarlas primero.
        for (Long id : ventasCreadas) {
            ventaRepository.deleteById(id);
        }
        ventasCreadas.clear();
        // Mismo orden que ClienteDocumentosTest: cuentas corrientes primero, cliente después.
        for (Long id : clientesCreados) {
            cuentaCorrienteDineroRepository.findByClienteId(id)
                    .ifPresent(ccd -> cuentaCorrienteDineroRepository.deleteById(ccd.getId()));
            cuentaCorrienteBandejasRepository.findByClienteId(id)
                    .ifPresent(ccb -> cuentaCorrienteBandejasRepository.deleteById(ccb.getId()));
            clienteRepository.deleteById(id);
        }
        clientesCreados.clear();
    }

    private UnidadNegocio abono() {
        return unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono sembrada"));
    }

    private ClienteDTO crearComoCuenta(CuentaAbono cuenta, String nombre) {
        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(cuenta);
        ClienteDTO dto = ClienteDTO.builder().nombreRazonSocial(nombre).build();
        ClienteDTO creado = clienteService.create(dto);
        clientesCreados.add(creado.getId());
        return creado;
    }

    private String nombreUnico(String base) {
        return base + " " + UUID.randomUUID();
    }

    @Test
    void clienteApareceEnListadoConAmbasCuentas() {
        ClienteDTO creado = crearComoCuenta(CuentaAbono.JEFE, nombreUnico("Cliente Compartido"));

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
        List<Long> idsJefe = clienteService.getAll().stream().map(ClienteDTO::getId).toList();

        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);
        List<Long> idsColega = clienteService.getAll().stream().map(ClienteDTO::getId).toList();

        assertThat(idsJefe).contains(creado.getId());
        assertThat(idsColega).contains(creado.getId());
    }

    // --- Triangulación 1.3: getById cruzado entre cuentas ---

    @Test
    void clienteCreadoPorJefeEsLeiblePorGetByIdDesdeColega() {
        ClienteDTO creado = crearComoCuenta(CuentaAbono.JEFE, nombreUnico("Cliente De Jefe"));

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getId()).isEqualTo(creado.getId());
    }

    @Test
    void clienteCreadoPorColegaEsLeiblePorGetByIdDesdeJefe() {
        ClienteDTO creado = crearComoCuenta(CuentaAbono.COLEGA, nombreUnico("Cliente De Colega"));

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        ClienteDTO leido = clienteService.getById(creado.getId());

        assertThat(leido.getId()).isEqualTo(creado.getId());
    }

    // --- 1.5: aislamiento entre unidades de negocio intacto ---

    @Test
    void getAllConUnidadDistintaDeAbonoNoDevuelveClientesDeAbono() {
        ClienteDTO creadoAbono = crearComoCuenta(CuentaAbono.JEFE, nombreUnico("Cliente Solo Abono"));

        UnidadNegocio vivero = unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        List<Long> ids = clienteService.getAll().stream().map(ClienteDTO::getId).toList();

        assertThat(ids).doesNotContain(creadoAbono.getId());
    }

    // --- Grupo 2: alta, edición, baja y saldo ---

    // 2.1 RED — create() ya no debe estampar cuentaAbono. Se verifica contra la columna física
    // `cuenta_abono` por SQL nativo (no contra el campo mapeado en Cliente): la Decisión 2 de
    // design.md elimina ese campo de la entidad en la task 3.1 de este mismo change, así que la
    // única forma de comprobar el valor persistido que sobrevive a esa eliminación es leyendo la
    // columna directamente.
    @Test
    void clienteCreadoEnAbonoNoQuedaConCuentaOperativaAsignada() {
        ClienteDTO creado = crearComoCuenta(CuentaAbono.JEFE, nombreUnico("Cliente Sin Cuenta Estampada"));

        Object cuentaAbonoColumna = entityManager
                .createNativeQuery("SELECT cuenta_abono FROM clientes WHERE id = ?1")
                .setParameter(1, creado.getId())
                .getSingleResult();

        assertThat(cuentaAbonoColumna).isNull();
    }

    // 2.3 RED — un cliente creado con JEFE activa puede ser actualizado y ajustado de saldo
    // con COLEGA activa, y los cambios quedan sobre el mismo id.
    @Test
    void clienteCreadoPorJefePuedeSerActualizadoYAjustadoDeSaldoDesdeColega() {
        ClienteDTO creado = crearComoCuenta(CuentaAbono.JEFE, nombreUnico("Cliente Actualizable"));

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);

        ClienteDTO paraActualizar = ClienteDTO.builder()
                .nombreRazonSocial(nombreUnico("Cliente Actualizado Por Colega"))
                .build();
        ClienteDTO actualizado = clienteService.update(creado.getId(), paraActualizar);

        assertThat(actualizado.getId()).isEqualTo(creado.getId());
        assertThat(actualizado.getNombreRazonSocial()).isEqualTo(paraActualizar.getNombreRazonSocial());

        ClienteDTO conSaldoAjustado = clienteService.ajustarSaldo(creado.getId(), BigDecimal.valueOf(500));

        assertThat(conSaldoAjustado.getId()).isEqualTo(creado.getId());
        assertThat(conSaldoAjustado.getBalanceDinero()).isEqualByComparingTo(BigDecimal.valueOf(500));
    }

    // 2.5 TRIANGULAR — baja: delete() con la otra cuenta activa marca al cliente como borrado
    // y deja de aparecer en getAll() para ambas cuentas.
    @Test
    void clienteCreadoPorColegaPuedeSerBorradoDesdeJefeYDesaparecePorAmbasCuentas() {
        ClienteDTO creado = crearComoCuenta(CuentaAbono.COLEGA, nombreUnico("Cliente A Borrar"));

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);
        clienteService.delete(creado.getId());

        List<Long> idsJefe = clienteService.getAll().stream().map(ClienteDTO::getId).toList();
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);
        List<Long> idsColega = clienteService.getAll().stream().map(ClienteDTO::getId).toList();

        assertThat(idsJefe).doesNotContain(creado.getId());
        assertThat(idsColega).doesNotContain(creado.getId());
    }

    // --- Grupo 4: guarda de coherencia — sharing de clientes y sharing de ventas conviven ---

    // 4.1 (change historial-ventas-compartido-abono) — con la agenda de clientes ya compartida
    // (este change) y el historial de ventas también compartido (VentaServiceImpl.listarVentas()
    // ya no particiona por CuentaAbono, ver VentaServiceListarVentasAbonoTest), dos ventas sobre
    // el mismo cliente atribuidas a cuentas distintas deben listarse juntas con cualquiera de las
    // dos cuentas activa: documenta que ambos sharings — el de clientes y el de ventas — quedan
    // coherentes entre sí, en vez de que uno esté compartido y el otro siga particionado.
    private Venta crearVentaMinima(Cliente cliente, CuentaAbono cuenta) {
        Venta v = new Venta();
        v.setUnidadNegocio(cliente.getUnidadNegocio());
        v.setCliente(cliente);
        v.setCuentaAbono(cuenta);
        v.setSubtotal(BigDecimal.TEN);
        v.setTotalFinal(BigDecimal.TEN);
        v.setEstadoPago("PAGADO");
        v.setFecha(LocalDateTime.now());
        Venta guardada = ventaRepository.save(v);
        ventasCreadas.add(guardada.getId());
        return guardada;
    }

    @Test
    void ventasDeAbonoSobreClienteCompartidoTambienQuedanCompartidas() {
        ClienteDTO clienteDto = crearComoCuenta(CuentaAbono.JEFE, nombreUnico("Cliente Con Ventas De Ambos"));
        Cliente clienteEntity = clienteRepository.findById(clienteDto.getId())
                .orElseThrow(() -> new IllegalStateException("Cliente recién creado no encontrado"));

        Venta ventaJefe = crearVentaMinima(clienteEntity, CuentaAbono.JEFE);
        Venta ventaColega = crearVentaMinima(clienteEntity, CuentaAbono.COLEGA);

        UnidadNegocioContextHolder.setUnidadNegocioId(abono().getId());
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.JEFE);

        List<Long> idsJefe = ventaService.listarVentas().stream().map(VentaResponseDTO::getId).toList();

        assertThat(idsJefe).contains(ventaJefe.getId(), ventaColega.getId());

        // Triangulación: la dirección inversa también trae las dos ventas — mismo patrón de
        // VentaServiceListarVentasAbonoTest.unidadAbonoDevuelveVentasDeAmbasCuentasConCualquieraActiva.
        CuentaAbonoContextHolder.setCuentaAbono(CuentaAbono.COLEGA);

        List<Long> idsColega = ventaService.listarVentas().stream().map(VentaResponseDTO::getId).toList();

        assertThat(idsColega).contains(ventaJefe.getId(), ventaColega.getId());
    }
}
