import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Eraser } from 'lucide-react';

const CSS_WIDTH = 600;
const CSS_HEIGHT = 200;

// Color de trazo FIJO, deliberadamente NO tomado del token --color-ink del sistema de diseño
// (change entregas-pendientes-confirmacion-vivero, Decisión 14 de design.md, tarea 13.1/13.3): el
// fondo del canvas se pinta blanco explícito siempre, sin importar el tema activo, y --color-ink
// se invierte a un tono CLARO en tema oscuro -- si el trazo siguiera ese token, una firma
// capturada con el sistema en tema oscuro se vería invisible (trazo claro sobre fondo blanco).
const COLOR_TRAZO = '#221D1A';

/**
 * Change entregas-pendientes-confirmacion-vivero, tarea 13.1 (Decisión 14 de design.md). Canvas
 * de firma de 600x200 CSS, escalado por devicePixelRatio, con fondo blanco explícito y Pointer
 * Events (una sola familia de handlers cubre dedo, lápiz y mouse -- no hace falta duplicar
 * handlers de touch y de mouse). `touch-action: none` evita que firmar scrollee la página en el
 * celular. Cero dependencias nuevas (sin signature_pad ni similares).
 *
 * API vía ref: `toDataURL()` (data-URL PNG completa), `estaVacio()`, `limpiar()`.
 * Prop `onChange(dataUrlOrNull)`: se llama al terminar cada trazo (con el PNG actual) y al borrar
 * (con `null`) -- el padre decide qué hacer (ej. guardar en el estado del formulario).
 */
const FirmaCanvas = forwardRef(function FirmaCanvas({ onChange, className = '', imagenInicial = null }, ref) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const lastPointRef = useRef(null);
  // Si el usuario ya empezó a firmar, la restauración async de `imagenInicial` (ver más abajo) no
  // debe pisarle el trazo cuando termine de cargar -- se cancela apenas hay un pointerdown real.
  const restauracionCanceladaRef = useRef(false);

  const pintarFondoBlanco = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // ignora el scale(dpr) para pintar el bitmap completo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CSS_WIDTH * dpr;
    canvas.height = CSS_HEIGHT * dpr;
    canvas.style.width = `${CSS_WIDTH}px`;
    canvas.style.height = `${CSS_HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = COLOR_TRAZO;

    pintarFondoBlanco();

    // `imagenInicial` restaura una firma de un borrador guardado (useEntregaDraftStore) -- se lee
    // sólo al montar, a propósito: este efecto corre una única vez por instancia del componente,
    // así que no compite con los trazos que el usuario dibuje después. PERO la carga de la imagen
    // es asíncrona (img.onload): si el cliente ya empezó a firmar antes de que termine de cargar,
    // dibujarla igual pisaría el trazo recién hecho con la firma vieja -- de ahí el chequeo de
    // `restauracionCanceladaRef`, que handlePointerDown enciende apenas hay un trazo real.
    restauracionCanceladaRef.current = false;
    if (imagenInicial) {
      const img = new Image();
      img.onload = () => {
        if (restauracionCanceladaRef.current) return;
        ctx.drawImage(img, 0, 0, CSS_WIDTH, CSS_HEIGHT);
        hasStrokeRef.current = true;
      };
      img.src = imagenInicial;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pintarFondoBlanco]);

  const puntoDesdeEvento = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // `max-w-full` achica el canvas en pantallas más angostas que 600px (todo celular). El
    // contexto de dibujo sigue escalado a los 600x200 CSS "declarados" (ctx.scale(dpr, dpr) en el
    // useEffect de arriba), así que hay que reproyectar el punto tocado desde el tamaño
    // REALMENTE renderizado (rect.width/height) a ese espacio declarado -- si no, el trazo
    // aparece corrido respecto de donde tocás el dedo.
    const escalaX = CSS_WIDTH / rect.width;
    const escalaY = CSS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * escalaX,
      y: (e.clientY - rect.top) * escalaY,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    restauracionCanceladaRef.current = true;
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = puntoDesdeEvento(e);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const punto = puntoDesdeEvento(e);
    const anterior = lastPointRef.current;
    ctx.beginPath();
    ctx.moveTo(anterior.x, anterior.y);
    ctx.lineTo(punto.x, punto.y);
    ctx.stroke();
    lastPointRef.current = punto;
    hasStrokeRef.current = true;
  };

  const finalizarTrazo = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (hasStrokeRef.current) {
      onChange?.(canvasRef.current.toDataURL('image/png'));
    }
  };

  const handleBorrar = () => {
    pintarFondoBlanco();
    hasStrokeRef.current = false;
    onChange?.(null);
  };

  useImperativeHandle(ref, () => ({
    toDataURL: (type = 'image/png') => canvasRef.current?.toDataURL(type),
    estaVacio: () => !hasStrokeRef.current,
    limpiar: handleBorrar,
  }));

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="inline-block border border-line rounded-input overflow-hidden bg-white max-w-full">
        <canvas
          ref={canvasRef}
          className="max-w-full"
          style={{ touchAction: 'none', display: 'block', cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finalizarTrazo}
          onPointerLeave={finalizarTrazo}
          onPointerCancel={finalizarTrazo}
        />
      </div>
      <button
        type="button"
        onClick={handleBorrar}
        className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-ink border border-line rounded-input cursor-pointer transition-colors"
      >
        <Eraser className="w-3.5 h-3.5" />
        Borrar
      </button>
    </div>
  );
});

export default FirmaCanvas;
