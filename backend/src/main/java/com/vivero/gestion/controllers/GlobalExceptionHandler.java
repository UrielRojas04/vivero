package com.vivero.gestion.controllers;

import com.vivero.gestion.exceptions.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Más específico que handleAuthException de abajo -- Spring resuelve por el handler más
    // específico sin importar el orden de declaración, así que LockedException (lanzada por
    // LoginAttemptService cuando se superan los intentos) muestra su propio mensaje en vez de
    // caer en el genérico "Credenciales incorrectas".
    @ExceptionHandler(org.springframework.security.authentication.LockedException.class)
    public ResponseEntity<Map<String, String>> handleLockedException(org.springframework.security.authentication.LockedException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Too Many Requests");
        errorResponse.put("message", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.TOO_MANY_REQUESTS);
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthException(org.springframework.security.core.AuthenticationException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Unauthorized");
        errorResponse.put("message", "Credenciales incorrectas o usuario no encontrado");
        return new ResponseEntity<>(errorResponse, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDeniedException(org.springframework.security.access.AccessDeniedException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Forbidden");
        errorResponse.put("message", "No tienes permisos para acceder a este recurso");
        return new ResponseEntity<>(errorResponse, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", "Parámetro inválido: " + ex.getName());
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Conflict");
        errorResponse.put("message", "No se puede eliminar el registro porque está en uso por otros elementos del sistema.");
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    // Hallazgo de auditoría de seguridad (2026-09-09, antes de subir a GitHub/VPS): estas tres son
    // EXCEPCIONES DE NEGOCIO deliberadas -- el resto del código (services de Ventas, Entregas,
    // Rendición, etc.) las tira a propósito con mensajes en español pensados para llegar al
    // usuario ("La entrega ya fue resuelta...", "El precio no puede ser negativo", etc., ver
    // getErrorMessage() del frontend). Sacarlas del catch-all de abajo y darles su propio handler
    // preserva ese comportamiento explícitamente, en vez de que dependan por accidente del
    // catch-all genérico (que ahora deja de exponer mensajes libres).
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleResourceNotFound(ResourceNotFoundException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Not Found");
        errorResponse.put("message", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleBusinessRuleViolation(RuntimeException ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Bad Request");
        errorResponse.put("message", ex.getMessage());
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    // Catch-all para todo lo NO esperado (NullPointerException, errores de SQL, bugs reales,
    // etc.): antes devolvía la clase de la excepción, el mensaje y la causa raíz tal cual en el
    // body de la respuesta -- útil en desarrollo, pero una vez que la API es accesible desde
    // internet le regala a cualquiera detalles internos (nombres de campos/entidades, mensajes de
    // Hibernate/SQL) sin ganar nada a cambio. El detalle completo se sigue viendo en los logs del
    // servidor (log.error con el stacktrace), sólo cambia lo que sale por HTTP.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllExceptions(Exception ex) {
        log.error("Error no esperado procesando la request", ex);
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "Internal Server Error");
        errorResponse.put("message", "Ocurrió un error inesperado. Si el problema persiste, contactá al administrador.");
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
