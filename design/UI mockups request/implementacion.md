# Implementación — Sistema Vivero (par A confirmado)

Acento confirmado: **Vivero `#35682F`** · **Herramientas `#14666F`** (teal Serhan).
Todo el resto de la paleta es compartido. Orden sugerido: 1 → 5.

---

## 1. `frontend/src/index.css`

Reemplazar el bloque `@theme` actual por el contenido de `vivero-tokens.css` (en la raíz de este proyecto), adaptado a Tailwind 4:

```css
@import "tailwindcss";

@theme {
  --color-paper: #FFFFFF;
  --color-paper-alt: #FBFAF8;
  --color-canvas: #F5F3F0;
  --color-line: #DED9D2;
  --color-line-strong: #C6BFB6;
  --color-thead: #EFEBE6;
  --color-faint: #8C8177;
  --color-muted: #6E665E;
  --color-body: #413A34;
  --color-ink: #221D1A;

  --color-ok: #1F7A4C;     --color-ok-ink: #155C39;
  --color-ok-bg: #E6F2EA;  --color-ok-line: #B9DCC8;
  --color-warn: #B4610F;   --color-warn-ink: #8A4A0B;
  --color-warn-bg: #FBEEE0;--color-warn-line: #EBCFA8;
  --color-danger: #B3261E; --color-danger-ink: #8C1D18;
  --color-danger-bg: #FBE9E7;--color-danger-line: #EFC6C2;

  /* el acento se lee de las CSS vars de :root, no de @theme */
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-accent-ink: var(--accent-ink);
  --color-accent-hi: var(--accent-hi);

  --font-sans: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --radius-base: 2px;
  --radius-panel: 4px;
}
```

Y debajo, fuera de `@theme`, el bloque de acento por unidad (copiar tal cual de `vivero-tokens.css`):
`[data-unidad="vivero"] { … }` y `[data-unidad="herramientas"] { … }`, más el `@media (prefers-color-scheme: dark)`.

> `--font-factura` deja de existir: IBM Plex Sans pasa a ser la fuente global, así que la clase `font-factura` en `FacturaCliente.jsx` se puede borrar sin cambiar nada visual.

## 2. `frontend/index.html`

Agregar IBM Plex Mono (todo importe va en mono tabular) y sacar el comentario de "sólo para la factura":

```html
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

## 3. Aplicar la unidad activa en un solo lugar

En `DashboardLayout.jsx`, junto al `activeBusinessId` que ya existe:

```jsx
const activeBusinessId = parseInt(unidadNegocioActiva);
const isHerramientas = activeBusinessId === 2;

React.useEffect(() => {
  document.documentElement.dataset.unidad = isHerramientas ? 'herramientas' : 'vivero';
}, [isHerramientas]);
```

Con eso, cada `bg-accent` / `text-accent` / `border-accent` del árbol cambia solo. No hace falta duplicar componentes ni pasar props de tema.

## 4. Reemplazos de clase (búsqueda global)

| Antes | Ahora |
| --- | --- |
| `bg-emerald-600`, `hover:bg-emerald-700` | `bg-accent`, `hover:brightness-95` |
| `text-emerald-600 / -700` | `text-accent` / `text-accent-ink` |
| `bg-emerald-50`, `bg-emerald-100` | `bg-accent-soft` |
| `focus:ring-emerald-500` | `focus:ring-accent` |
| `bg-gray-50` (lienzo) | `bg-canvas` |
| `bg-white` | `bg-paper` |
| `border-gray-200` | `border-line` |
| `border-gray-300` (tablas) | `border-line-strong` |
| `text-gray-900 / -800 / -500 / -400` | `text-ink` / `text-body` / `text-muted` / `text-faint` |
| `rounded-xl`, `rounded-2xl` | `rounded-base` (`rounded-panel` en paneles) |
| `rounded-full` | sólo en chips de estado |
| `shadow-sm`, `shadow-md`, `shadow-xl` | borde de 1px; `shadow-md` sólo en popovers |
| importes | `font-mono tabular-nums` |

Los verdes/naranjas/rojos **semánticos** (`emerald` de "pagado", `orange` de "parcial", `red` de "deuda") pasan a `ok` / `warn` / `danger` — no a `accent`.

## 5. Estructura del sidebar (`DashboardLayout.jsx`)

1. Barra de identidad: `<div className="w-1 bg-accent" />` como primer hijo del contenedor flex raíz.
2. Cabecera del logo a `h-26` (104px), logo centrado: `h-[72px] object-contain` para Vivero; para Herramientas el logo va dentro de `<div className="bg-[var(--accent-plate)] h-[82px] flex items-center justify-center px-2.5">` porque `logo_herramientas_sin_fondo.png` es arte blanco sobre transparente.
3. Placa de unidad debajo del logo: `bg-accent-soft`, rótulo `UNIDAD DE NEGOCIO` + nombre — reemplaza al `<select>` gris del menú de perfil (el `<select>` puede quedar como fallback).
4. Ítem activo: `bg-accent-soft border-l-[3px] border-accent` (sin `rounded-lg`).

## Pendiente de assets

Falta una versión **positiva/oscura** del logo Serhan para poder usarlo sin placa en fondos claros. Con el archivo actual, la placa `#123238` es obligatoria.
