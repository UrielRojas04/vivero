import { toPng } from 'html-to-image';
import logoInvernaderoLopez from '../assets/logo-vivero.png';
import logoHerramientas from '../assets/logo-herramientas.png';

// Helpers compartidos de exportación de comprobante, extraídos de ComprobanteVentaModal.jsx
// (change registro-semillas-clientes, tarea 5.1). Lógica movida TAL CUAL, sin reescribirla:
// ComprobanteVentaModal.jsx (remito de venta, en producción) y ComprobanteSemillaModal.jsx
// (boletita de semillas) consumen estos mismos helpers.
//
// Por qué se extrae y no se copia (Decisión 7 de
// openspec/changes/registro-semillas-clientes/design.md): la reutilización de la MISMA
// pestaña de WhatsApp depende de `ventanaWhatsAppAbierta`, una variable a nivel de MÓDULO.
// Si cada modal tuviera su propia copia de este archivo, cada uno abriría su propia pestaña
// -- se rompería exactamente la propiedad que este código existe para garantizar. Compartir
// el módulo (y por lo tanto la variable) es la razón de ser de esta extracción, no higiene DRY.

const NOMBRE_VENTANA_WHATSAPP = 'whatsapp-remito';
// Referencia a nivel de MÓDULO (NO useRef): sobrevive al desmontaje del modal (el componente se
// destruye al cerrarse) y a los re-renders. La referencia directa es el único mecanismo fiable
// para reutilizar la MISMA pestaña: el "nombre de ventana" se pierde cuando WhatsApp Web te
// redirige cross-origin (web.whatsapp.com/send → web.whatsapp.com/), y entonces window.open() con
// ese nombre ya no encuentra la pestaña y abre una nueva.
let ventanaWhatsAppAbierta = null;

// Marca de documento por unidad de negocio, mismo criterio que [data-unidad] en index.css
// (decisión de sistema-diseno-acento-por-unidad, ver comentario ahí junto a --accent-plate):
// Vivero NO lleva placa de color detrás del logo -- el arte ya trae sus propios colores
// (verde/marrón) y va grande directo sobre el fondo blanco del comprobante. Herramientas SÍ
// necesita una placa oscura detrás (el logo Serhan es arte blanco: sin fondo oscuro se vuelve
// invisible) -- mismo hex que --accent-plate de index.css. Abono todavía no tiene logo propio
// (2026-09-02) -> `logo: null`, el caller muestra el nombre como texto en vez de una imagen.
const MARCA_POR_UNIDAD = {
  '1': { logo: logoInvernaderoLopez, nombre: 'Invernadero Lopez', placaHex: null },
  '2': { logo: logoHerramientas, nombre: 'Serhan', placaHex: '#123238' },
  '3': { logo: null, nombre: 'Abono Lopez', placaHex: null },
};

// Unidad desconocida (no debería pasar en la práctica, pero getMarcaDocumento no puede fallar
// silenciosamente en el resto del componente): mismo criterio, sin logo, nombre genérico.
const MARCA_DEFAULT = { logo: null, nombre: 'Vivero ERP', placaHex: null };

export const getMarcaDocumento = (unidadNegocioActiva) => MARCA_POR_UNIDAD[unidadNegocioActiva] || MARCA_DEFAULT;

// Paleta CLARA por unidad (mismos hex que [data-unidad="X"] .force-light-export en index.css).
// Bug real (2026-09-02): en el remito exportado, la fila de encabezado de la tabla
// (bg-accent-soft + text-accent-ink, varios niveles de profundidad dentro del nodo que clona
// generarPngDeNodo) seguía saliendo con los valores de MODO OSCURO pese a que el nodo tenía la
// clase force-light-export, mientras que un elemento con --accent aplicado más cerca de la raíz
// del nodo (ej. el borde del encabezado) sí salía bien -- el pipeline de captura de html-to-image
// no está resolviendo esas custom properties de forma confiable a esa profundidad. En vez de
// seguir dependiendo de la herencia de CSS variables para estos casos puntuales, se usan estilos
// inline con el color YA resuelto (no var()), que html-to-image sí captura siempre bien.
const PALETA_CLARA_POR_UNIDAD = {
  '1': { accentInk: '#2A5325', accentSoft: '#EEF3E4' },
  '2': { accentInk: '#0E4A51', accentSoft: '#E5EFF0' },
  '3': { accentInk: '#4A332A', accentSoft: '#F5EFEB' },
};
const PALETA_CLARA_DEFAULT = { accentInk: '#2A5325', accentSoft: '#EEF3E4' };

export const getPaletaClaraUnidad = (unidadNegocioActiva) =>
  PALETA_CLARA_POR_UNIDAD[unidadNegocioActiva] || PALETA_CLARA_DEFAULT;

// jsPDF necesita la imagen ya cargada (no puede darle la URL del asset directamente) para
// doc.addImage(). Se resuelve una vez por descarga de PDF.
export const cargarImagenLogo = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

// jsPDF (doc.setFillColor/setDrawColor) pide r,g,b numéricos, no hex -- convierte los hex de
// index.css (--accent-plate, --accent de Vivero) para no tener que duplicarlos como RGB a mano.
export const hexARgb = (hex) => {
  const limpio = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
};

export const normalizarTelefonoWhatsApp = (tel) => {
  if (!tel) return '';
  const soloDigitos = String(tel).replace(/\D/g, '');
  if (!soloDigitos) return '';
  return soloDigitos.startsWith('00') ? soloDigitos.slice(2) : soloDigitos;
};

// Detecta si es dispositivo táctil (mobile/tablet)
export const esDispositivoTactil = typeof window !== 'undefined'
  && window.matchMedia('(pointer: coarse)').matches;

// Verifica si el navegador soporta compartir archivos via Web Share API
export const soportaCompartirArchivos = esDispositivoTactil
  && typeof navigator !== 'undefined'
  && !!navigator.canShare && !!navigator.share;

// Clon fuera de pantalla con ancho mínimo 500px para que la imagen no se corte en mobile.
export const generarPngDeNodo = async (nodo) => {
  if (!nodo) return null;

  const clon = nodo.cloneNode(true);
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  // Forzar un ancho mínimo de 500px para que la imagen no se corte en mobile.
  // En pantallas chicas el nodo visible puede ser de 320-375px, lo que recorta el contenido.
  const anchoMinimo = Math.max(nodo.offsetWidth, 500);
  wrapper.style.width = `${anchoMinimo}px`;
  clon.style.width = '100%';
  clon.style.maxWidth = 'none';
  clon.style.height = 'auto';
  clon.style.maxHeight = 'none';
  clon.style.overflow = 'visible';

  document.body.appendChild(wrapper);
  wrapper.appendChild(clon);
  try {
    const ancho = clon.offsetWidth;
    const alto = clon.offsetHeight;
    const dataUrl = await toPng(clon, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      width: ancho,
      height: alto,
    });
    const blob = await (await fetch(dataUrl)).blob();
    return { dataUrl, blob };
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
};

/**
 * Abre WhatsApp con el resumen/imagen del comprobante, reutilizando la misma pestaña entre
 * llamadas (mecanismo `ventanaWhatsAppAbierta` de arriba). Réplica literal del bloque
 * `enviarWhatsApp` de ComprobanteVentaModal.jsx, generalizado sólo en lo que varía entre
 * documentos (teléfono, resumen, archivo, textos de tituloCompartir/toasts) -- la mecánica de
 * Web Share / copia al portapapeles / construcción de URL / reutilización de pestaña es
 * idéntica a la original, sin cambios de comportamiento.
 *
 * @param {Object} params
 * @param {string} params.telefono - Teléfono ya normalizado o crudo (se normaliza acá adentro
 *   NO, el caller ya debe pasar el resultado de normalizarTelefonoWhatsApp).
 * @param {string} params.resumen - Texto a precargar en el chat.
 * @param {File|null} params.archivo - PNG del comprobante, generado con generarPngDeNodo.
 * @param {string} params.tituloCompartir - Título usado por la Web Share API.
 * @param {(type: string, message: string) => void} params.pushToast
 * @param {string} params.mensajeExitoCompartido
 * @param {string} params.mensajeExitoConImagenCopiada
 * @param {string} params.mensajeExitoSinImagenCopiada
 * @param {string} params.mensajeErrorPopup
 * @param {string} params.mensajeErrorGeneral
 */
export const abrirWhatsApp = async ({
  telefono,
  resumen,
  archivo,
  tituloCompartir,
  pushToast,
  mensajeExitoCompartido = 'Comprobante compartido correctamente.',
  mensajeExitoConImagenCopiada,
  mensajeExitoSinImagenCopiada,
  mensajeErrorPopup = 'No se pudo abrir WhatsApp. Verificá el bloqueo de ventanas emergentes.',
  mensajeErrorGeneral = 'No se pudo abrir WhatsApp en este dispositivo.',
}) => {
  // Móvil/tablet: intenta Web Share con el PNG (abre WhatsApp app con la imagen lista para enviar).
  if (soportaCompartirArchivos) {
    try {
      if (archivo && navigator.canShare({ files: [archivo] })) {
        await navigator.share({
          files: [archivo],
          title: tituloCompartir,
          text: resumen,
        });
        pushToast('success', mensajeExitoCompartido);
        return;
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
    }
  }

  // Desktop: los deep links de WhatsApp Web SOLO precargan texto, no pueden adjuntar archivos.
  // Para dejar la imagen "lista para enviar", se copia el PNG al portapapeles y se abre el chat SIN
  // texto; el usuario pega la imagen en el chat con Ctrl+V. Si el portapapeles no está disponible,
  // se abre con el resumen de texto (comportamiento previo).
  const copiarImagenAlPortapapeles = async () => {
    if (esDispositivoTactil || typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
      return false;
    }
    try {
      if (!archivo) return false;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': archivo })]);
      return true;
    } catch (error) {
      return false; // API no disponible o permiso denegado → fallback a texto
    }
  };

  const construirUrl = (conTexto) => {
    // En mobile: usar api.whatsapp.com que invoca el deep link a la app nativa de WhatsApp.
    // En desktop: usar web.whatsapp.com/send que navega directamente al chat si hay sesión abierta.
    // wa.me redirige con pantallas intermedias, y en mobile a veces no abre la app.
    if (esDispositivoTactil) {
      const base = telefono
        ? `https://api.whatsapp.com/send?phone=${telefono}`
        : 'https://api.whatsapp.com/send';
      if (!conTexto) return base;
      return `${base}${telefono ? '&' : '?'}text=${encodeURIComponent(resumen)}`;
    }
    // Desktop
    const base = telefono
      ? `https://web.whatsapp.com/send?phone=${telefono}`
      : 'https://wa.me/';
    if (!conTexto) return base;
    return `${base}${telefono ? '&' : '?'}text=${encodeURIComponent(resumen)}`;
  };

  try {
    const imagenCopiada = await copiarImagenAlPortapapeles();
    const url = construirUrl(!imagenCopiada);
    // Reutilización de la MISMA pestaña de WhatsApp (mecanismo fiable):
    // - Guardamos la referencia DIRECTA de la ventana que abrimos (variable de módulo, sobrevive
    //   al cierre del modal). El nombre de ventana se pierde cuando WhatsApp redirige cross-origin,
    //   así que no se usa window.open('', NOMBRE) para recuperarla.
    // - Si la referencia sigue viva: navegamos la misma pestaña con location.href (permitido
    //   cross-origin para una ventana abierta por este script) y la enfocamos.
    // - Si no existe o fue cerrada: recién ahí creamos una con window.open(url, NOMBRE).
    let ventana = ventanaWhatsAppAbierta;
    if (ventana && !ventana.closed) {
      try {
        ventana.location.href = url;
      } catch (ignored) {
        // Navegación de la ventana existente bloqueada (muy raro): se recrea con nombre fijo.
        ventana = window.open(url, NOMBRE_VENTANA_WHATSAPP);
        ventanaWhatsAppAbierta = ventana;
      }
      ventana.focus();
    } else {
      ventana = window.open(url, NOMBRE_VENTANA_WHATSAPP);
      ventanaWhatsAppAbierta = ventana;
    }
    if (!ventana) {
      pushToast('error', mensajeErrorPopup);
      return;
    }
    pushToast(
      'success',
      imagenCopiada ? mensajeExitoConImagenCopiada : mensajeExitoSinImagenCopiada,
    );
  } catch (error) {
    pushToast('error', mensajeErrorGeneral);
  }
};
