package com.vivero.gestion.config;

import com.vivero.gestion.models.Permiso;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.PermisoRepository;
import com.vivero.gestion.repositories.RolRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.repositories.UnidadNegocioRepository;
import com.vivero.gestion.repositories.ProductoRepository;
import com.vivero.gestion.repositories.MovimientoStockRepository;
import com.vivero.gestion.repositories.ProveedorRepository;
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Producto;
import com.vivero.gestion.models.Proveedor;
import com.vivero.gestion.models.TipoMovimientoStock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final ProductoRepository productoRepository;
    private final MovimientoStockRepository movimientoStockRepository;
    private final MovimientoStockService movimientoStockService;
    private final PasswordEncoder passwordEncoder;
    // Sólo para la migración Marca -> Proveedor del grupo 9 (tarea 9.4).
    private final ProveedorRepository proveedorRepository;
    private final com.vivero.gestion.repositories.FacturaClienteRepository facturaClienteRepository;
    private final com.vivero.gestion.repositories.VentaRepository ventaRepository;

    @Autowired
    public DataInitializer(UsuarioRepository usuarioRepository,
                           RolRepository rolRepository,
                           PermisoRepository permisoRepository,
                           UnidadNegocioRepository unidadNegocioRepository,
                           ProductoRepository productoRepository,
                           MovimientoStockRepository movimientoStockRepository,
                           MovimientoStockService movimientoStockService,
                           PasswordEncoder passwordEncoder,
                           ProveedorRepository proveedorRepository,
                           com.vivero.gestion.repositories.FacturaClienteRepository facturaClienteRepository,
                           com.vivero.gestion.repositories.VentaRepository ventaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.productoRepository = productoRepository;
        this.movimientoStockRepository = movimientoStockRepository;
        this.movimientoStockService = movimientoStockService;
        this.passwordEncoder = passwordEncoder;
        this.proveedorRepository = proveedorRepository;
        this.facturaClienteRepository = facturaClienteRepository;
        this.ventaRepository = ventaRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {

        // 0. Crear Unidades de Negocio Base
        if (unidadNegocioRepository.count() == 0) {
            // 7mo parámetro = costeoPorCapasHabilitado (costeo-fifo-herramientas, Decisión 7):
            // false para las dos, explícito. Nadie activa el costeo por capas en el seed — se
            // activa recién en la migración real (grupo 7, PUERTA 3), fuera de este apply.
            unidadNegocioRepository.save(new UnidadNegocio(null, "Vivero", "Unidad principal de Vivero", java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, true, false));
            unidadNegocioRepository.save(new UnidadNegocio(null, "Herramientas", "Venta de herramientas", java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, true, false));
        }

        // 1. Crear Permisos
        Permiso pLeerStock = crearPermiso("LEER_STOCK");
        Permiso pEscribirStock = crearPermiso("ESCRIBIR_STOCK");
        Permiso pEscribirVentas = crearPermiso("ESCRIBIR_VENTAS");
        Permiso pAdminDb = crearPermiso("ADMIN_DB");
        Permiso pLeerClientes = crearPermiso("LEER_CLIENTES");
        Permiso pEscribirClientes = crearPermiso("ESCRIBIR_CLIENTES");
        Permiso pLeerInsumos = crearPermiso("LEER_INSUMOS");
        Permiso pEscribirInsumos = crearPermiso("ESCRIBIR_INSUMOS");
        Permiso pLeerFinanzas = crearPermiso("LEER_FINANZAS");
        Permiso pLeerBandejas = crearPermiso("LEER_BANDEJAS");
        Permiso pEscribirBandejas = crearPermiso("ESCRIBIR_BANDEJAS");
        Permiso pLeerPedidos = crearPermiso("LEER_PEDIDOS");
        Permiso pEscribirPedidos = crearPermiso("ESCRIBIR_PEDIDOS");

        // 2. Crear Roles y asignar permisos
        Set<Permiso> permisosJefe = new HashSet<>();
        permisosJefe.add(pLeerStock);
        permisosJefe.add(pEscribirStock);
        permisosJefe.add(pEscribirVentas);
        permisosJefe.add(pAdminDb);
        permisosJefe.add(pLeerClientes);
        permisosJefe.add(pEscribirClientes);
        permisosJefe.add(pLeerInsumos);
        permisosJefe.add(pEscribirInsumos);
        permisosJefe.add(pLeerFinanzas);
        permisosJefe.add(pLeerBandejas);
        permisosJefe.add(pEscribirBandejas);
        // Permisos del circuito de pedidos a proveedores (herramientas-pedidos-proveedores):
        // sólo JEFE los recibe por defecto. permisosEmpleado (más abajo) queda intacto a propósito
        // — ver Decisión 8 de design.md y el precedente de bandejas-acceso-limitado. El rol
        // "ADMIN 2" (creado a mano desde UsuariosAdmin.jsx) NO se toca acá: DataInitializer sólo
        // tiene autoridad sobre JEFE/EMPLEADO_VIVERO; otorgarle estos permisos a ADMIN 2 se hace
        // vía la API real de roles, en la verificación en vivo del grupo 11.
        permisosJefe.add(pLeerPedidos);
        permisosJefe.add(pEscribirPedidos);

        Rol rolJefe = crearRol("JEFE", permisosJefe);
        // Asegurar que el jefe siempre tenga todos los permisos, incluso si el rol ya existía
        rolJefe.setPermisos(permisosJefe);
        rolRepository.save(rolJefe);

        Set<Permiso> permisosEmpleado = new HashSet<>();
        permisosEmpleado.add(pLeerStock);
        permisosEmpleado.add(pEscribirStock);
        permisosEmpleado.add(pEscribirVentas);
        Rol rolEmpleado = crearRol("EMPLEADO_VIVERO", permisosEmpleado);
        rolEmpleado.setPermisos(permisosEmpleado);
        rolRepository.save(rolEmpleado);

        // 3. Crear o actualizar Usuario Jefe
        Usuario jefe = usuarioRepository.findByUsername("jefe@vivero.com").orElse(new Usuario());
        if (jefe.getId() == null) {
            jefe.setUsername("jefe@vivero.com");
            jefe.setPassword(passwordEncoder.encode("jefe123")); // Password seguro
            
            // Mapear Usuario a su Rol
            Set<Rol> rolesJefe = new HashSet<>();
            rolesJefe.add(rolJefe);
            jefe.setRoles(rolesJefe);
        }
        
        // Asignar SIEMPRE todas las unidades de negocio al jefe
        Set<UnidadNegocio> negocios = new HashSet<>(unidadNegocioRepository.findAll());
        jefe.setUnidadesNegocio(negocios);
        
        usuarioRepository.save(jefe);    
        
        // 4. Inicializar Movimientos de Stock para productos existentes
        if (movimientoStockRepository.count() == 0) {
            java.util.List<Producto> productos = productoRepository.findAll();
            for (Producto p : productos) {
                if (p.getStock() != null && p.getStock() > 0) {
                    movimientoStockService.registrarMovimiento(p, p.getStock(), TipoMovimientoStock.AJUSTE_INICIAL, jefe);
                }
            }
            System.out.println("Se inicializaron movimientos de stock históricos.");
        }

        // 5. Migrar descuento_proveedor a producto_descuentos (Decisión 8 de design.md de
        // costeo-flexible-por-producto). Idempotente: si el producto ya tiene al menos un
        // descuento cargado no se toca, así que reiniciar el backend muchas veces no duplica
        // filas. Productos con descuento_proveedor en 0/NULL no generan ninguna fila (serían
        // ruido visual y no cambian ningún número). La columna vieja NO se toca ni se vacía:
        // queda como red de rollback.
        migrarDescuentoProveedorAProductoDescuentos();

        // 6. Migrar Marca -> Proveedor (Decisión 2 de design.md de config-costeo-por-proveedor,
        // OQ1 — grupo 9, checkpoint del usuario confirmado el 2026-08-20, tarea 9.1). Idempotente:
        // un producto con `proveedor` ya asignado no se toca, así que reiniciar el backend muchas
        // veces no duplica proveedores ni cambia ningún vínculo (tarea 9.8). Escribe ÚNICAMENTE
        // `proveedor_id` (tarea 9.5): no toca costo_producto, descuentos, iva_porcentaje,
        // costo_envio_porcentaje, precio ni porcentaje_ganancia de ningún producto. `marca`/
        // `marca_id` quedan intactos, sin tocar, como red de rollback.
        migrarMarcaAProveedor();

        // 7. Migrar ventas históricas de Vivero a una primera Factura CERRADA (ciclos-facturacion-cliente)
        // migrarVentasAPrimeraFactura();

        System.out.println("Base de datos inicializada con roles y usuario jefe.");
    }

    private void migrarMarcaAProveedor() {
        java.util.List<Producto> productos = productoRepository.findAll();
        int productosMigrados = 0;
        int proveedoresCreados = 0;
        for (Producto p : productos) {
            // Sin marca (ej. "Masa", "prueba de pedido") o ya migrado: no se toca (idempotencia,
            // tarea 9.8). El producto queda sin proveedor a propósito hasta que el usuario lo
            // asigne a mano (Decisión 2).
            if (p.getMarca() == null || p.getProveedor() != null) {
                continue;
            }
            UnidadNegocio unidad = p.getUnidadNegocio();
            if (unidad == null) {
                continue;
            }
            String nombreMarca = p.getMarca().getNombre();
            if (nombreMarca == null || nombreMarca.trim().isEmpty()) {
                continue;
            }
            // Resolución por nombre normalizado (trim + mayúsculas), dentro de la misma unidad de
            // negocio (Decisión 2): SHIMURA se reusa si ya existe un proveedor vivo con ese
            // nombre en la unidad (caso real: id=4, aunque hoy 0 productos tienen esa marca); si
            // no existe, se crea un proveedor nuevo con perfil NEUTRO (los defaults de la entidad
            // Proveedor: IVA incluido=true, sin IVA/envío/descuentos por defecto, sin dólares) —
            // nunca se inventa un valor de costeo a partir de la marca.
            final Producto productoActual = p;
            Proveedor proveedor = proveedorRepository
                    .findByUnidadNegocioIdAndNombreNormalizado(unidad.getId(), nombreMarca)
                    .orElse(null);
            if (proveedor == null) {
                proveedor = new Proveedor();
                proveedor.setNombre(nombreMarca.trim());
                proveedor.setUnidadNegocio(unidad);
                proveedor = proveedorRepository.save(proveedor);
                proveedoresCreados++;
            }
            productoActual.setProveedor(proveedor);
            productoRepository.save(productoActual);
            productosMigrados++;
        }
        if (productosMigrados > 0 || proveedoresCreados > 0) {
            System.out.println("Migración Marca->Proveedor: " + productosMigrados
                    + " producto(s) asignado(s) a proveedor, " + proveedoresCreados
                    + " proveedor(es) nuevo(s) creado(s) con perfil neutro.");
        }
    }

    private void migrarDescuentoProveedorAProductoDescuentos() {
        java.util.List<Producto> productos = productoRepository.findAll();
        int migrados = 0;
        for (Producto p : productos) {
            java.math.BigDecimal desc = p.getDescuentoProveedor();
            if (desc == null || desc.compareTo(java.math.BigDecimal.ZERO) == 0) {
                continue; // 0 o NULL: no genera fila de descuento (tarea 4.2)
            }
            if (p.getDescuentos() != null && !p.getDescuentos().isEmpty()) {
                continue; // ya migrado / ya tiene descuentos cargados: idempotencia (tarea 4.1)
            }
            com.vivero.gestion.models.ProductoDescuento pd = new com.vivero.gestion.models.ProductoDescuento();
            pd.setProducto(p);
            pd.setNombre("Proveedor");
            pd.setPorcentaje(desc);
            pd.setOrden(0);
            p.getDescuentos().add(pd);
            productoRepository.save(p);
            migrados++;
        }
        if (migrados > 0) {
            System.out.println("Migración de descuentos: " + migrados + " producto(s) con descuento_proveedor convertido(s) a producto_descuentos.");
        }
    }

    private Permiso crearPermiso(String nombre) {
        Optional<Permiso> opt = permisoRepository.findByNombre(nombre);
        if (opt.isPresent()) return opt.get();
        return permisoRepository.save(new Permiso(nombre));
    }
    
    private Rol crearRol(String nombre, Set<Permiso> permisos) {
        Optional<Rol> opt = rolRepository.findByNombre(nombre);
        if (opt.isPresent()) return opt.get();
        
        Rol rol = new Rol(nombre);
        rol.setPermisos(permisos);
        return rolRepository.save(rol);
    }

    private void migrarVentasAPrimeraFactura() {
        java.util.List<com.vivero.gestion.models.Venta> ventas = ventaRepository.findAll();
        java.util.Map<Long, com.vivero.gestion.models.FacturaCliente> facturasPorCliente = new java.util.HashMap<>();
        int migradas = 0;
        for (com.vivero.gestion.models.Venta v : ventas) {
            if (v.getFactura() == null && v.getUnidadNegocio() != null && v.getUnidadNegocio().getId() == 1L) {
                com.vivero.gestion.models.Cliente cliente = v.getCliente();
                if (cliente == null) continue;
                
                com.vivero.gestion.models.FacturaCliente factura = facturasPorCliente.get(cliente.getId());
                if (factura == null) {
                    factura = new com.vivero.gestion.models.FacturaCliente();
                    factura.setCliente(cliente);
                    factura.setUnidadNegocio(v.getUnidadNegocio());
                    factura.setEstado("CERRADA");
                    factura.setFechaApertura(v.getFecha() != null ? v.getFecha() : java.time.LocalDateTime.now());
                    factura.setFechaCierre(java.time.LocalDateTime.now());
                    factura = facturaClienteRepository.save(factura);
                    facturasPorCliente.put(cliente.getId(), factura);
                }
                v.setFactura(factura);
                if (v.getPagos() != null) {
                    for (com.vivero.gestion.models.Pago p : v.getPagos()) {
                        p.setFactura(factura);
                    }
                }
                ventaRepository.save(v);
                migradas++;
            }
        }
        if (migradas > 0) {
            System.out.println("Migración de Facturas: " + migradas + " venta(s) histórica(s) asignadas a facturas CERRADAS.");
        }
    }
}
