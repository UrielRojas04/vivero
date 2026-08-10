package com.vivero.gestion.controllers;

import com.vivero.gestion.services.SseService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class SseController {

    private final SseService sseService;

    @GetMapping("/stock")
    public SseEmitter streamEvents(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "anonymous";
        return sseService.createEmitter(username);
    }
}
