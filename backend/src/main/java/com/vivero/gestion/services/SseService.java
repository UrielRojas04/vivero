package com.vivero.gestion.services;

import com.vivero.gestion.dto.StockUpdateEvent;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface SseService {
    SseEmitter createEmitter(String username);
    void emitStockUpdate(StockUpdateEvent event);
}
