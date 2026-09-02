package com.vivero.gestion.services;

import com.vivero.gestion.dto.FacturaClienteDTO;
import com.vivero.gestion.dto.PagoRequestDTO;
import com.vivero.gestion.models.Cliente;
import com.vivero.gestion.models.CuentaCorrienteBandejas;
import com.vivero.gestion.models.CuentaCorrienteDinero;
import com.vivero.gestion.models.FacturaCliente;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.repositories.ClienteRepository;
import com.vivero.gestion.repositories.CuentaCorrienteBandejasRepository;
import com.vivero.gestion.repositories.CuentaCorrienteDineroRepository;
import com.vivero.gestion.repositories.FacturaClienteRepository;
import com.vivero.gestion.repositories.PagoRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.security.UnidadNegocioContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Change saldo-bandejas-en-factura: `FacturaClienteDTO` expone `saldoBandejas`, leyendo
 * `Cliente.cuentaCorrienteBandejas.balanceBandejas` de forma null-safe -- el mismo patrón
 * que `ClienteServiceImpl.mapToDTO` ya usa para `ClienteDTO.balanceBandejas` (línea ~267).
 * Base real (Postgres en localhost:5433), sin mocks de DB, igual que
 * VentaServiceListarVentasAbonoTest.
 */
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.password=root",
    "spring.datasource.url=jdbc:postgresql://localhost:5433/vivero_db?serverTimezone=UTC"
})
class FacturaClienteSaldoBandejasTest {

    @Autowired
    private FacturaClienteService facturaClienteService;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CuentaCorrienteBandejasRepository cuentaCorrienteBandejasRepository;

    @Autowired
    private CuentaCorrienteDineroRepository cuentaCorrienteDineroRepository;

    @Autowired
    private FacturaClienteRepository facturaClienteRepository;

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private UnidadNegocioRepository unidadNegocioRepository;

    private Long clienteId;
    private Long facturaId;
    private Long ccbId;
    private Long pagoId;

    @AfterEach
    void limpiar() {
        UnidadNegocioContextHolder.clear();
        if (pagoId != null) pagoRepository.deleteById(pagoId);
        if (facturaId != null) facturaClienteRepository.deleteById(facturaId);
        if (ccbId != null) cuentaCorrienteBandejasRepository.deleteById(ccbId);
        if (clienteId != null) {
            cuentaCorrienteDineroRepository.findByClienteId(clienteId)
                    .ifPresent(ccd -> cuentaCorrienteDineroRepository.deleteById(ccd.getId()));
            clienteRepository.deleteById(clienteId);
        }
        pagoId = null;
        facturaId = null;
        ccbId = null;
        clienteId = null;
    }

    private UnidadNegocio obtenerVivero() {
        return unidadNegocioRepository.findByNombre("Vivero")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Vivero sembrada"));
    }

    private Cliente crearCliente(UnidadNegocio unidad, String nombre) {
        Cliente c = new Cliente();
        c.setNombreRazonSocial(nombre);
        c.setUnidadNegocio(unidad);
        return clienteRepository.save(c);
    }

    private FacturaCliente crearFacturaAbierta(Cliente cliente, UnidadNegocio unidad) {
        FacturaCliente f = new FacturaCliente();
        f.setCliente(cliente);
        f.setUnidadNegocio(unidad);
        f.setEstado("ABIERTA");
        f.setFechaApertura(LocalDateTime.now());
        return facturaClienteRepository.save(f);
    }

    @Test
    void facturaDeClienteConSaldoDeBandejasDevuelveEseValor() {
        UnidadNegocio vivero = obtenerVivero();

        Cliente cliente = crearCliente(vivero, "Cliente Bandejas Test");
        clienteId = cliente.getId();

        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(7);
        ccb = cuentaCorrienteBandejasRepository.save(ccb);
        ccbId = ccb.getId();

        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        facturaId = factura.getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        FacturaClienteDTO dto = facturaClienteService.obtenerFacturaActiva(clienteId);

        assertThat(dto).isNotNull();
        assertThat(dto.getSaldoBandejas()).isEqualTo(7);
    }

    @Test
    void clienteSinCuentaCorrienteBandejasDevuelveCeroYNoFalla() {
        UnidadNegocio vivero = obtenerVivero();

        Cliente cliente = crearCliente(vivero, "Cliente Sin Bandejas Test");
        clienteId = cliente.getId();

        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        facturaId = factura.getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        FacturaClienteDTO dto = facturaClienteService.obtenerFacturaActiva(clienteId);

        assertThat(dto).isNotNull();
        assertThat(dto.getSaldoBandejas()).isEqualTo(0);
    }

    @Test
    void historialDeFacturasMapeaSaldoBandejasSinLazyException() {
        UnidadNegocio vivero = obtenerVivero();

        Cliente cliente = crearCliente(vivero, "Cliente Historial Bandejas Test");
        clienteId = cliente.getId();

        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(3);
        ccb = cuentaCorrienteBandejasRepository.save(ccb);
        ccbId = ccb.getId();

        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        facturaId = factura.getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        java.util.List<FacturaClienteDTO> historial = facturaClienteService.listarHistorialFacturas(clienteId);

        assertThat(historial).isNotEmpty();
        assertThat(historial).allSatisfy(f -> assertThat(f.getSaldoBandejas()).isEqualTo(3));
    }

    @Test
    void registrarPagoNoAlteraSaldoDeBandejasNiTotalesDeDinero() {
        UnidadNegocio vivero = obtenerVivero();

        Cliente cliente = crearCliente(vivero, "Cliente Pago Bandejas Test");
        clienteId = cliente.getId();

        CuentaCorrienteBandejas ccb = new CuentaCorrienteBandejas();
        ccb.setCliente(cliente);
        ccb.setBalanceBandejas(5);
        ccb = cuentaCorrienteBandejasRepository.save(ccb);
        ccbId = ccb.getId();

        FacturaCliente factura = crearFacturaAbierta(cliente, vivero);
        facturaId = factura.getId();

        UnidadNegocioContextHolder.setUnidadNegocioId(vivero.getId());

        FacturaClienteDTO antes = facturaClienteService.obtenerFacturaActiva(clienteId);
        java.math.BigDecimal totalVentasAntes = antes.getTotalVentas();
        java.math.BigDecimal totalPagosAntes = antes.getTotalPagos();
        java.math.BigDecimal totalConceptosAntes = antes.getTotalConceptos();
        java.math.BigDecimal saldoDeudorAntes = antes.getSaldoDeudor();

        PagoRequestDTO pagoRequest = new PagoRequestDTO();
        pagoRequest.setMonto(java.math.BigDecimal.valueOf(100));
        pagoRequest.setMetodoPago("EFECTIVO");

        FacturaClienteDTO despues = facturaClienteService.registrarPago(facturaId, pagoRequest);
        pagoId = despues.getPagos().get(despues.getPagos().size() - 1).getId();

        assertThat(despues.getSaldoBandejas()).isEqualTo(5);
        assertThat(despues.getTotalVentas()).isEqualByComparingTo(totalVentasAntes);
        assertThat(despues.getTotalConceptos()).isEqualByComparingTo(totalConceptosAntes);
        assertThat(despues.getTotalPagos()).isEqualByComparingTo(totalPagosAntes.add(pagoRequest.getMonto()));
        assertThat(despues.getSaldoDeudor()).isEqualByComparingTo(saldoDeudorAntes.subtract(pagoRequest.getMonto()));

        CuentaCorrienteBandejas ccbDespues = cuentaCorrienteBandejasRepository.findByClienteId(clienteId)
                .orElseThrow();
        assertThat(ccbDespues.getBalanceBandejas()).isEqualTo(5);
    }
}
