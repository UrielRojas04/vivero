import React, { useEffect, useRef, useState } from 'react';
import { X, ScanBarcode, CameraOff, VideoOff, ShieldAlert, Keyboard, Flashlight, FlashlightOff } from 'lucide-react';

// Componente único de escaneo (Decisión 7 de design.md de codigo-barras-herramientas): no sabe
// nada de productos ni de formularios, sólo abre la cámara, decodifica un código de barras y
// devuelve el string ya normalizado (trim) vía onDetectado. Lo usan tanto ProductoForm (llenar el
// campo) como Productos.jsx (disparar la búsqueda) — toda la interacción con @zxing/browser vive
// acá y en ningún otro lugar del frontend.
//
// Import DINÁMICO de @zxing/browser (tarea 7.3): así Vivero y Abono, que nunca montan este
// componente (los botones que lo abren están condicionados a unidadNegocioActiva === '2'), no
// descargan los ~200 KB gzip de la librería.
const EscanerCodigoBarra = ({ isOpen, onClose, onDetectado }) => {
  const videoRef = useRef(null);
  // Referencia a los controles que devuelve decodeFromVideoDevice(...) de @zxing/browser
  // (tiene un método .stop() que detiene el loop de decodificación Y el MediaStream). Se guarda
  // en un ref (no en estado) porque el cleanup tiene que poder acceder al valor más reciente
  // desde el retorno del useEffect sin depender de un re-render.
  const controlsRef = useRef(null);

  const [estado, setEstado] = useState('iniciando'); // iniciando | escaneando | sin-contexto-seguro | permiso-denegado | sin-camara | error
  // Carga manual dentro del propio modal (no sólo en el campo de ProductoForm): así el fallback
  // funciona también en Productos.jsx, que no tiene un input propio para el código. Disponible
  // siempre, no sólo cuando la cámara falla — por si el escaneo tarda o el código está dañado.
  const [codigoManual, setCodigoManual] = useState('');
  // Linterna (pedido del usuario, para mejorar la lectura con poca luz o sombra sobre el código):
  // @zxing/browser expone controls.switchTorch sólo si el dispositivo/navegador lo soporta —
  // torchDisponible se activa recién cuando eso se confirma, no antes.
  const [torchDisponible, setTorchDisponible] = useState(false);
  const [torchActivo, setTorchActivo] = useState(false);

  // Detiene TODO lo relacionado a la cámara: el loop de decodificación (controls.stop(), que ya
  // internamente detiene los tracks del MediaStream) y, como red de seguridad adicional (Decisión
  // 7 de design.md: "el bug clásico de este tipo de componente" es la cámara que queda prendida),
  // también se para cualquier track que haya quedado colgado del propio elemento <video> por las
  // dudas. Se llama tanto al desmontar/cerrar como al detectar un código (tarea 7.6).
  const detenerCamara = () => {
    try {
      controlsRef.current?.stop();
    } catch (err) {
      console.error('Error al detener el escáner de código de barras', err);
    }
    controlsRef.current = null;
    setTorchDisponible(false);
    setTorchActivo(false);

    const video = videoRef.current;
    const stream = video?.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (video) {
      video.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    // Contexto seguro requerido (Decisión 6 de design.md): getUserMedia sólo existe en HTTPS o
    // localhost. Si falta, NO se monta el <video> — se muestra el motivo y se deja la carga
    // manual del código como camino alternativo (el input de texto vive en ProductoForm, no acá).
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado('sin-contexto-seguro');
      return undefined;
    }

    let cancelado = false;
    setEstado('iniciando');

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');

        // Formatos restringidos (Decisión 2 de design.md, tarea 7.4): acelera el decode y reduce
        // falsos positivos frente a un decoder "todo formato".
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ]);
        // Pedido del usuario (código que no se leía, foto con blur/curvatura de envase): que el
        // decoder insista más por cuadro en vez de rendirse rápido ante un frame marginal. Corre
        // sobre cada frame de un stream de video en vivo (no una sola vez), así que el costo extra
        // de CPU por frame es aceptable a cambio de más chances de éxito en casos límite.
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints);
        if (cancelado || !videoRef.current) {
          return;
        }

        // decodeFromConstraints en vez de decodeFromVideoDevice (pedido del usuario: códigos
        // chicos o con líneas muy finas no se leían) — decodeFromVideoDevice sólo pide
        // { facingMode: 'environment' }, sin ninguna resolución, así que el navegador elige la
        // que quiere (a veces baja). Pedir una resolución alta como preferencia ("ideal", no
        // "exact" — si el dispositivo no la soporta, cae a la que pueda sin romper nada) le da al
        // decoder más detalle real para distinguir barras finas.
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current,
          (result, _err) => {
            if (cancelado) return;
            if (result) {
              const codigo = result.getText()?.trim();
              detenerCamara();
              if (codigo) {
                onDetectado(codigo);
              }
              onClose();
            }
            // err (NotFoundException por frame sin código legible) se ignora a propósito: es el
            // caso normal mientras la cámara todavía no encuadra el código, no un error real.
          }
        );

        if (cancelado) {
          // El componente se cerró mientras se esperaba el permiso de cámara: no dejar el
          // stream abierto aunque la promesa haya resuelto después del cleanup.
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setEstado('escaneando');
        // switchTorch sólo existe en el objeto de controles si el dispositivo/navegador
        // realmente soporta linterna (BrowserCodeReader lo verifica internamente antes de
        // definirlo) — no hay forma de saberlo antes de este punto.
        if (typeof controls.switchTorch === 'function') {
          setTorchDisponible(true);
        }
      } catch (err) {
        if (cancelado) return;
        console.error('Error al abrir la cámara para escanear', err);
        if (err?.name === 'NotAllowedError') {
          setEstado('permiso-denegado');
        } else if (err?.name === 'NotFoundError') {
          setEstado('sin-camara');
        } else {
          setEstado('error');
        }
      }
    })();

    // Cleanup: se ejecuta al desmontar Y cada vez que isOpen pasa a false (tarea 7.6) — el punto
    // crítico de este componente, para que la cámara nunca quede prendida atrás del modal.
    return () => {
      cancelado = true;
      detenerCamara();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCerrar = () => {
    detenerCamara();
    setCodigoManual('');
    onClose();
  };

  const handleToggleTorch = async () => {
    if (!controlsRef.current?.switchTorch) return;
    const nuevoEstado = !torchActivo;
    try {
      await controlsRef.current.switchTorch(nuevoEstado);
      setTorchActivo(nuevoEstado);
    } catch (err) {
      console.error('Error al prender/apagar la linterna', err);
    }
  };

  const handleEnviarManual = (e) => {
    e.preventDefault();
    const codigo = codigoManual.trim();
    if (!codigo) return;
    detenerCamara();
    setCodigoManual('');
    onDetectado(codigo);
    onClose();
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCerrar();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) handleCerrar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const mensajePorEstado = {
    'sin-contexto-seguro': {
      Icono: ShieldAlert,
      titulo: 'El escaneo necesita una conexión segura (HTTPS)',
      detalle: 'Este dispositivo está accediendo por una dirección sin HTTPS, así que el navegador no habilita la cámara. Cargá el código a mano acá abajo.',
    },
    'permiso-denegado': {
      Icono: CameraOff,
      titulo: 'Permiso de cámara denegado',
      detalle: 'Habilitá el permiso de cámara para este sitio en la configuración del navegador y volvé a intentar, o cargá el código a mano acá abajo.',
    },
    'sin-camara': {
      Icono: VideoOff,
      titulo: 'No se encontró una cámara disponible',
      detalle: 'Puede que esté siendo usada por otra aplicación, o que el dispositivo no tenga cámara. Cargá el código a mano acá abajo mientras tanto.',
    },
    error: {
      Icono: CameraOff,
      titulo: 'No se pudo iniciar el escaneo',
      detalle: 'Ocurrió un error inesperado al intentar abrir la cámara. Cargá el código a mano acá abajo.',
    },
  };

  const infoError = mensajePorEstado[estado];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-panel border border-line-strong w-full max-w-md flex flex-col max-h-[90vh] scale-100 transition-transform duration-300 animate-scaleIn overflow-hidden">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-accent" />
            Escanear código de barras
          </h2>
          <button
            onClick={handleCerrar}
            className="p-1.5 rounded-full hover:bg-canvas transition-colors text-faint hover:text-body cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {infoError ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <div className="w-14 h-14 bg-warn-bg text-warn-ink rounded-full flex items-center justify-center border border-warn-line">
                <infoError.Icono className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-ink">{infoError.titulo}</h3>
              <p className="text-sm text-muted max-w-sm">{infoError.detalle}</p>
            </div>
          ) : (
            <>
              <div className="relative rounded-base overflow-hidden bg-ink aspect-square">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="pointer-events-none absolute inset-0 border-2 border-accent/70 m-8 rounded-base" />
                {/* Linterna (pedido del usuario): sólo aparece si el dispositivo la soporta —
                    se confirma recién cuando la cámara ya está corriendo (torchDisponible). */}
                {torchDisponible && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`absolute top-2 right-2 p-2 rounded-full transition-colors cursor-pointer ${
                      torchActivo ? 'bg-accent text-paper' : 'bg-black/40 text-paper hover:bg-black/60'
                    }`}
                    title={torchActivo ? 'Apagar linterna' : 'Prender linterna'}
                  >
                    {torchActivo ? <FlashlightOff className="w-4 h-4" /> : <Flashlight className="w-4 h-4" />}
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-muted text-center">
                {estado === 'iniciando'
                  ? 'Iniciando cámara...'
                  : 'Apuntá al código de barras del envase.'}
              </p>
            </>
          )}

          {/* Carga manual: siempre disponible, no sólo cuando la cámara falla — por si el
              escaneo tarda o el código está dañado/ilegible (pedido explícito del usuario). */}
          <form onSubmit={handleEnviarManual} className="mt-4 pt-4 border-t border-line">
            <label htmlFor="codigo-barra-manual" className="flex items-center gap-1.5 text-xs font-medium text-muted mb-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              O ingresá el código a mano
            </label>
            <div className="flex gap-2">
              <input
                id="codigo-barra-manual"
                type="text"
                // Sin inputMode="numeric": los códigos EAN/UPC son sólo números, pero CODE-128
                // (formato también soportado por el decoder, ver hints más arriba) puede tener
                // letras — restringir el teclado a números lo haría imposible de tipear a mano.
                value={codigoManual}
                onChange={(e) => setCodigoManual(e.target.value)}
                placeholder="Ej: 7501234567890"
                className="flex-1 px-3 py-2 rounded-base border border-line bg-paper text-sm text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
              />
              <button
                type="submit"
                disabled={!codigoManual.trim()}
                className="px-4 py-2 rounded-base bg-accent text-paper text-sm font-semibold hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Usar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EscanerCodigoBarra;
