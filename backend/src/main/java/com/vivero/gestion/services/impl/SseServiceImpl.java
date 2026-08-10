package com.vivero.gestion.services.impl;

import com.vivero.gestion.dto.StockUpdateEvent;
import com.vivero.gestion.services.SseService;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

@Slf4j
@Service
public class SseServiceImpl implements SseService {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @Override
    public SseEmitter createEmitter(String username) {
        // 0L timeout means infinite (or rely on client retry). We'll set 1 hour to prevent infinite open connections.
        SseEmitter emitter = new SseEmitter(3600000L); 
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        
        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    @Override
    public void emitStockUpdate(StockUpdateEvent event) {
        List<SseEmitter> deadEmitters = new CopyOnWriteArrayList<>();
        emitters.forEach(emitter -> {
            try {
                emitter.send(SseEmitter.event()
                        .name("STOCK_UPDATE")
                        .data(event));
            } catch (IOException e) {
                deadEmitters.add(emitter);
            }
        });
        emitters.removeAll(deadEmitters);
    }
}
