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
import com.vivero.gestion.services.MovimientoStockService;
import com.vivero.gestion.models.UnidadNegocio;
import com.vivero.gestion.models.Producto;
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

    @Autowired
    public DataInitializer(UsuarioRepository usuarioRepository, 
                           RolRepository rolRepository, 
                           PermisoRepository permisoRepository,
                           UnidadNegocioRepository unidadNegocioRepository,
                           ProductoRepository productoRepository,
                           MovimientoStockRepository movimientoStockRepository,
                           MovimientoStockService movimientoStockService,
                           PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.unidadNegocioRepository = unidadNegocioRepository;
        this.productoRepository = productoRepository;
        this.movimientoStockRepository = movimientoStockRepository;
        this.movimientoStockService = movimientoStockService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {

        // 0. Crear Unidades de Negocio Base
        if (unidadNegocioRepository.count() == 0) {
            unidadNegocioRepository.save(new UnidadNegocio(null, "Vivero", "Unidad principal de Vivero", java.math.BigDecimal.ZERO, true));
            unidadNegocioRepository.save(new UnidadNegocio(null, "Herramientas", "Venta de herramientas", java.math.BigDecimal.ZERO, true));
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

        System.out.println("Base de datos inicializada con roles y usuario jefe.");
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
}
