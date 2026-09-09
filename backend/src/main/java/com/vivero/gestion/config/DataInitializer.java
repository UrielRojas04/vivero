package com.vivero.gestion.config;

import com.vivero.gestion.models.PermisoEnum;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.models.Usuario;
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

import java.util.EnumSet;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final UnidadNegocioRepository unidadNegocioRepository;
    private final ProductoRepository productoRepository;
    private final MovimientoStockRepository movimientoStockRepository;
    private final MovimientoStockService movimientoStockService;
    private final PasswordEncoder passwordEncoder;
    // Sólo para la migración Marca -> Proveedor del grupo 9 (tarea 9.4).
    private final ProveedorRepository proveedorRepository;
    private final com.vivero.gestion.repositories.FacturaClienteRepository facturaClienteRepository;
    private final com.vivero.gestion.repositories.VentaRepository ventaRepository;
    private final com.vivero.gestion.repositories.InsumoRepository insumoRepository;

    @Autowired
    public DataInitializer(UsuarioRepository usuarioRepository,
                           RolRepository rolRepository,
                           UnidadNegocioRepository unidadNegocioRepository,
                           ProductoRepository productoRepository,
                           MovimientoStockRepository movimientoStockRepository,
                           MovimientoStockService movimientoStockService,
                           PasswordEncoder passwordEncoder,
                           ProveedorRepository proveedorRepository,
                           com.vivero.gestion.repositories.FacturaClienteRepository facturaClienteRepository,
                           com.vivero.gestion.repositories.VentaRepository ventaRepository,
                           com.vivero.gestion.repositories.InsumoRepository insumoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.productoRepository = productoRepository;
        this.movimientoStockRepository = movimientoStockRepository;
        this.movimientoStockService = movimientoStockService;
        this.passwordEncoder = passwordEncoder;
        this.proveedorRepository = proveedorRepository;
        this.facturaClienteRepository = facturaClienteRepository;
        this.ventaRepository = ventaRepository;
        this.insumoRepository = insumoRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {

        // 0. Crear Unidades de Negocio Base
        if (unidadNegocioRepository.count() == 0) {
            // 7mo parámetro = costeoPorCapasHabilitado (costeo-fifo-herramientas, Decisión 7):
            // false para las dos, explícito. Nadie activa el costeo por capas en el seed — se
            // activa recién en la migración real (grupo 7, PUERTA 3), fuera de este apply.
            // 8vo y 9no parámetro = modeloCosto y porcentajeRepartoColega (negocio-abono)
            unidadNegocioRepository.save(new UnidadNegocio(null, "Vivero", "Unidad principal de Vivero", java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, true, false, com.vivero.gestion.models.ModeloCostoUnidad.INSUMOS, java.math.BigDecimal.ZERO, false));
            unidadNegocioRepository.save(new UnidadNegocio(null, "Herramientas", "Venta de herramientas", java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, true, false, com.vivero.gestion.models.ModeloCostoUnidad.MERCADERIA_VENDIDA, java.math.BigDecimal.ZERO, false));
        }

        // Migración retroactiva: asegurar que Herramientas tenga MERCADERIA_VENDIDA si ya existía
        migrarModeloCostoUnidadesExistentes();

        // Seed Unidad Abono
        seedUnidadAbono();
        // 1. Permisos ahora viven como PermisoEnum — no requieren tabla ni seeding.

        // 2. Crear Roles y asignar permisos
        Set<PermisoEnum> permisosJefe = EnumSet.allOf(PermisoEnum.class);

        Rol rolJefe = crearRol("JEFE", permisosJefe);
        // Asegurar que el jefe siempre tenga todos los permisos, incluso si el rol ya existía
        rolJefe.setPermisos(permisosJefe);
        // JEFE es un rol global (visible en las 3 unidades) — explícito aunque null ya sea el
        // default, para dejar documentada la intención (modelo unidadNegocio en Rol).
        rolJefe.setUnidadNegocio(null);
        rolRepository.save(rolJefe);

        Set<PermisoEnum> permisosColega = EnumSet.allOf(PermisoEnum.class);
        permisosColega.remove(PermisoEnum.ADMIN_DB);
        // LEER_CONFIGURACION también afuera (pedido del dueño 2026-09-05): la sección
        // Configuración debe verla sólo el JEFE en Vivero y Abono, Colega incluido -- aunque
        // Colega sea el otro "administrador" de Abono para temas financieros, no debe ver esta
        // sección en particular.
        permisosColega.remove(PermisoEnum.LEER_CONFIGURACION);
        // LEER_ENTREGAS / ESCRIBIR_ENTREGAS también afuera (change
        // entregas-pendientes-confirmacion-vivero, Decisión 8 de design.md): la sección Entregas
        // es exclusiva de Vivero y COLEGA es un rol exclusivo de Abono -- un permiso que no puede
        // ejercer en su unidad no debe figurar en su rol. Mismo criterio y mismo estilo de
        // comentario que LEER_CONFIGURACION de arriba.
        permisosColega.remove(PermisoEnum.LEER_ENTREGAS);
        permisosColega.remove(PermisoEnum.ESCRIBIR_ENTREGAS);
        Rol rolColega = crearRol("COLEGA", permisosColega);
        rolColega.setPermisos(permisosColega);
        // COLEGA sólo pertenece a Abono (confirmado por el dueño — ver modelo unidadNegocio en Rol).
        rolColega.setUnidadNegocio(unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta la unidad de negocio Abono")));
        rolRepository.save(rolColega);

        // 3. Crear o actualizar Usuario Jefe
        // Username real "Sergio" (2026-09-04, antes "jefe@vivero.com" -- pedido del dueño, ver
        // también CuentaAbonoFilter, UsuarioServiceImpl y los checks de frontend que dependen de
        // este literal exacto).
        Usuario jefe = usuarioRepository.findByUsername("Sergio").orElse(new Usuario());
        if (jefe.getId() == null) {
            jefe.setUsername("Sergio");
            // Sin contraseña hardcodeada en el código fuente (2026-08-27, limpieza pre-GitHub):
            // sólo se usa en la primera creación del usuario, en una base recién levantada — la
            // base real ya tiene este usuario, así que esta rama nunca vuelve a correr para él.
            // Requiere la variable de entorno INITIAL_JEFE_PASSWORD (sin default): una base
            // nueva sin esa variable falla fuerte en vez de sembrar una contraseña conocida.
            String initialPassword = System.getenv("INITIAL_JEFE_PASSWORD");
            if (initialPassword == null || initialPassword.isBlank()) {
                throw new IllegalStateException(
                        "Falta la variable de entorno INITIAL_JEFE_PASSWORD para crear el usuario jefe inicial.");
            }
            jefe.setPassword(passwordEncoder.encode(initialPassword));

            // Mapear Usuario a su Rol
            Set<Rol> rolesJefe = new HashSet<>();
            rolesJefe.add(rolJefe);
            jefe.setRoles(rolesJefe);
        }
        
        // Asignar SIEMPRE todas las unidades de negocio al jefe
        Set<UnidadNegocio> negocios = new HashSet<>(unidadNegocioRepository.findAll());
        jefe.setUnidadesNegocio(negocios);
        
        usuarioRepository.save(jefe);    
        
        // Crear o actualizar Usuario Colega
        // Username real "Pablo" (2026-09-04, antes "colega@vivero.com" -- pedido del dueño).
        Usuario colega = usuarioRepository.findByUsername("Pablo").orElse(new Usuario());
        if (colega.getId() == null) {
            colega.setUsername("Pablo");
            String initialColegaPassword = System.getenv("INITIAL_COLEGA_PASSWORD");
            if (initialColegaPassword == null || initialColegaPassword.isBlank()) {
                // Fallback a la password del jefe si no hay variable para el colega
                initialColegaPassword = System.getenv("INITIAL_JEFE_PASSWORD");
            }
            if (initialColegaPassword != null && !initialColegaPassword.isBlank()) {
                colega.setPassword(passwordEncoder.encode(initialColegaPassword));
            } else {
                throw new IllegalStateException("Falta password inicial para crear el usuario colega.");
            }

            Set<Rol> rolesColega = new HashSet<>();
            rolesColega.add(rolColega);
            colega.setRoles(rolesColega);
        }
        
        UnidadNegocio unidadAbono = unidadNegocioRepository.findByNombre("Abono")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Abono"));
        Set<UnidadNegocio> negociosColega = new HashSet<>();
        negociosColega.add(unidadAbono);
        colega.setUnidadesNegocio(negociosColega);
        usuarioRepository.save(colega);

        // Rol y usuario Hernán (2026-09-09, pedido del dueño): faltaban acá -- ambos se habían
        // creado a mano desde el panel de administración en la base real, así que una base nueva
        // (producción, VPS) no los tendría. Permisos calcados 1:1 de los que el rol "ADMIN 2" ya
        // tiene hoy en la base real (sin ADMIN_DB: Hernán administra Herramientas pero no
        // usuarios/roles del sistema).
        Set<PermisoEnum> permisosAdmin2 = EnumSet.of(
                PermisoEnum.LEER_CLIENTES, PermisoEnum.ESCRIBIR_CLIENTES,
                PermisoEnum.LEER_STOCK, PermisoEnum.ESCRIBIR_STOCK,
                PermisoEnum.ESCRIBIR_VENTAS,
                PermisoEnum.LEER_PEDIDOS, PermisoEnum.ESCRIBIR_PEDIDOS,
                PermisoEnum.LEER_FACTURACION, PermisoEnum.LEER_FINANZAS
        );
        Rol rolAdmin2 = crearRol("ADMIN 2", permisosAdmin2);
        rolAdmin2.setPermisos(permisosAdmin2);
        UnidadNegocio unidadHerramientas = unidadNegocioRepository.findByNombre("Herramientas")
                .orElseThrow(() -> new IllegalStateException("Falta unidad Herramientas"));
        rolAdmin2.setUnidadNegocio(unidadHerramientas);
        rolRepository.save(rolAdmin2);

        Usuario hernan = usuarioRepository.findByUsername("Hernan").orElse(new Usuario());
        if (hernan.getId() == null) {
            hernan.setUsername("Hernan");
            // Mismo patrón que Sergio/Pablo: sin contraseña hardcodeada, requiere su propia
            // variable de entorno en una base nueva.
            String initialHernanPassword = System.getenv("INITIAL_HERNAN_PASSWORD");
            if (initialHernanPassword == null || initialHernanPassword.isBlank()) {
                throw new IllegalStateException(
                        "Falta la variable de entorno INITIAL_HERNAN_PASSWORD para crear el usuario Hernán inicial.");
            }
            hernan.setPassword(passwordEncoder.encode(initialHernanPassword));

            Set<Rol> rolesHernan = new HashSet<>();
            rolesHernan.add(rolAdmin2);
            hernan.setRoles(rolesHernan);
        }
        // Hernán sólo pertenece a Herramientas (confirmado por el dueño -- Dashboard whitelist en
        // DashboardLayout.jsx confía en esto para no tener que acotarlo también por unidad ahí).
        Set<UnidadNegocio> negociosHernan = new HashSet<>();
        negociosHernan.add(unidadHerramientas);
        hernan.setUnidadesNegocio(negociosHernan);
        usuarioRepository.save(hernan);

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

        // 8. Retrofit Insumos: todo insumo sin unidad de negocio pasa a pertenecer a Vivero
        retrofitInsumosVivero();

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

    private Rol crearRol(String nombre, Set<PermisoEnum> permisos) {
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

    private void migrarModeloCostoUnidadesExistentes() {
        java.util.List<UnidadNegocio> unidades = unidadNegocioRepository.findAll();
        boolean modificado = false;
        for (UnidadNegocio u : unidades) {
            if ("Herramientas".equals(u.getNombre()) && u.getModeloCosto() != com.vivero.gestion.models.ModeloCostoUnidad.MERCADERIA_VENDIDA) {
                u.setModeloCosto(com.vivero.gestion.models.ModeloCostoUnidad.MERCADERIA_VENDIDA);
                unidadNegocioRepository.save(u);
                modificado = true;
            } else if ("Vivero".equals(u.getNombre()) && u.getModeloCosto() != com.vivero.gestion.models.ModeloCostoUnidad.INSUMOS) {
                u.setModeloCosto(com.vivero.gestion.models.ModeloCostoUnidad.INSUMOS);
                unidadNegocioRepository.save(u);
                modificado = true;
            }
        }
        if (modificado) {
            System.out.println("Migración: Modelos de costo actualizados en unidades de negocio existentes.");
        }
    }

    private void retrofitInsumosVivero() {
        java.util.List<com.vivero.gestion.models.Insumo> insumos = insumoRepository.findAll();
        int migrados = 0;
        UnidadNegocio vivero = null;
        for (com.vivero.gestion.models.Insumo insumo : insumos) {
            if (insumo.getUnidadNegocio() == null) {
                if (vivero == null) {
                    vivero = unidadNegocioRepository.findByNombre("Vivero").orElse(null);
                    if (vivero == null) break; // Si Vivero no existe, no migrar
                }
                insumo.setUnidadNegocio(vivero);
                insumoRepository.save(insumo);
                migrados++;
            }
        }
        if (migrados > 0) {
            System.out.println("Retrofit Insumos: " + migrados + " insumo(s) histórico(s) asignado(s) a Vivero.");
        }
    }

    private void seedUnidadAbono() {
        if (unidadNegocioRepository.findByNombre("Abono").isEmpty()) {
            UnidadNegocio abono = new UnidadNegocio(null, "Abono", "Unidad de abono",
                java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, true, false,
                com.vivero.gestion.models.ModeloCostoUnidad.INSUMOS, java.math.BigDecimal.ZERO, false);
            unidadNegocioRepository.save(abono);
            System.out.println("Unidad de Negocio 'Abono' creada.");
        }
    }


}
