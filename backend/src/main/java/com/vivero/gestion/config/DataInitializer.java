package com.vivero.gestion.config;

import com.vivero.gestion.models.Permiso;
import com.vivero.gestion.models.Rol;
import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.PermisoRepository;
import com.vivero.gestion.repositories.RolRepository;
import com.vivero.gestion.repositories.UsuarioRepository;
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
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DataInitializer(UsuarioRepository usuarioRepository, 
                           RolRepository rolRepository, 
                           PermisoRepository permisoRepository,
                           PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {

        // 1. Crear Permisos
        Permiso pLeerStock = crearPermiso("LEER_STOCK");
        Permiso pEscribirStock = crearPermiso("ESCRIBIR_STOCK");
        Permiso pEscribirVentas = crearPermiso("ESCRIBIR_VENTAS");
        Permiso pAdminDb = crearPermiso("ADMIN_DB");
        Permiso pLeerClientes = crearPermiso("LEER_CLIENTES");
        Permiso pEscribirClientes = crearPermiso("ESCRIBIR_CLIENTES");
        Permiso pLeerInsumos = crearPermiso("LEER_INSUMOS");
        Permiso pEscribirInsumos = crearPermiso("ESCRIBIR_INSUMOS");

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
        
        Rol rolJefe = crearRol("JEFE", permisosJefe);
        rolJefe.setPermisos(permisosJefe);
        rolRepository.save(rolJefe);

        Set<Permiso> permisosEmpleado = new HashSet<>();
        permisosEmpleado.add(pLeerStock);
        permisosEmpleado.add(pEscribirStock);
        permisosEmpleado.add(pEscribirVentas);
        Rol rolEmpleado = crearRol("EMPLEADO_VIVERO", permisosEmpleado);
        rolEmpleado.setPermisos(permisosEmpleado);
        rolRepository.save(rolEmpleado);

        // 3. Crear Usuario Jefe si no existe
        if (usuarioRepository.findByUsername("jefe@vivero.com").isEmpty()) {
            Usuario jefe = new Usuario();
            jefe.setUsername("jefe@vivero.com");
            jefe.setPassword(passwordEncoder.encode("jefe123")); // Password seguro
            
            // Mapear Usuario a su Rol
            Set<Rol> rolesJefe = new HashSet<>();
            rolesJefe.add(rolJefe);
            
            jefe.setRoles(rolesJefe);
            
            usuarioRepository.save(jefe);
            System.out.println("Base de datos inicializada con roles y usuario jefe.");
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
}
