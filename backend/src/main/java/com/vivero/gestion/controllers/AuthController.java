package com.vivero.gestion.controllers;

import com.vivero.gestion.security.JwtUtils;
import com.vivero.gestion.security.LoginAttemptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.security.core.GrantedAuthority;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final LoginAttemptService loginAttemptService;

    @Autowired
    public AuthController(AuthenticationManager authenticationManager, JwtUtils jwtUtils, LoginAttemptService loginAttemptService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.loginAttemptService = loginAttemptService;
    }

    // Hallazgo de auditoría de seguridad (2026-09-09): sin límite de intentos, este endpoint
    // (permitAll en SecurityConfig, por necesidad) quedaba abierto a fuerza bruta de contraseña
    // apenas fuera alcanzable desde internet. Ver LoginAttemptService para el detalle del bloqueo.
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        if (loginAttemptService.estaBloqueado(request.getUsername())) {
            throw new LockedException("Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar.");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
        } catch (AuthenticationException ex) {
            loginAttemptService.registrarFallo(request.getUsername());
            throw ex;
        }
        loginAttemptService.registrarExito(request.getUsername());

        String token = jwtUtils.generateToken(authentication.getName());

        com.vivero.gestion.models.Usuario usuario = (com.vivero.gestion.models.Usuario) authentication.getPrincipal();

        List<String> authorities = usuario.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());
                
        List<String> roles = usuario.getRoles().stream()
                .map(com.vivero.gestion.models.Rol::getNombre)
                .collect(Collectors.toList());

        List<Map<String, Object>> negocios = usuario.getUnidadesNegocio().stream()
                .map(un -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", un.getId());
                    map.put("nombre", un.getNombre());
                    map.put("descripcion", un.getDescripcion());
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("authorities", authorities);
        response.put("roles", roles);
        response.put("username", usuario.getUsername());
        response.put("negociosDisponibles", negocios);
        return ResponseEntity.ok(response);
    }
}

class LoginRequest {
    private String username;
    private String password;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
