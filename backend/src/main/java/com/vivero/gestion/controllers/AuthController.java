package com.vivero.gestion.controllers;

import com.vivero.gestion.models.Usuario;
import com.vivero.gestion.repositories.UsuarioRepository;
import com.vivero.gestion.security.JwtUtils; // Asegúrate de haber creado esta clase
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UsuarioRepository repository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils; // Inyectamos la utilidad de JWT

    @PostMapping("/register")
    public ResponseEntity<?> registrar(@RequestBody Usuario usuario) {
        if (repository.findByUsername(usuario.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("El nombre de usuario ya existe");
        }

        // Encriptamos la contraseña antes de guardarla
        String claveEncriptada = passwordEncoder.encode(usuario.getPassword());
        usuario.setPassword(claveEncriptada);

        return ResponseEntity.ok(repository.save(usuario));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Usuario usuario) {
        Optional<Usuario> u = repository.findByUsername(usuario.getUsername());

        // Verificamos si el usuario existe y la contraseña coincide
        if (u.isPresent() && passwordEncoder.matches(usuario.getPassword(), u.get().getPassword())) {
            // Generamos el token JWT
            String token = jwtUtils.generarToken(u.get().getUsername());

            // Preparamos la respuesta con el usuario y su token
            Map<String, Object> response = new HashMap<>();
            response.put("usuario", u.get());
            response.put("token", token);

            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Usuario o contraseña incorrectos");
    }
}