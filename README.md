# BANDEROLAS PRO

Editor de creatividades interactivas sobre superficies físicas y 3D. La composición (imagen, vídeo, logos y texto) se aplica al motor visual activo manteniendo un único editor y un único panel de personalización.

## Producción estable — Fases 1 a 3

La entrada canónica es `index.html`. El stack estable conserva:

1. `src/editor-base.html` — UI, compositor, WebGL y Verlet base.
2. `src/editor-features.js` — capas, roles, layouts, texto y assets.
3. `src/state-sync.js` — sincronización de formato/proyecto/historial.
4. `src/composition-tools.js` — edición avanzada, Brand Kit y assets.
5. `src/interaction-stable.js` — ruta física grab/drag validada.
6. `src/production.js` — Full Bleed, PNG, JSON, grabación e Interactive HTML.
7. `src/delivery.js` — MP4, ZIP, Share/Embed y laboratorio A/B.

## Capacidades actuales

- Formatos 9:16, 1:1 y 16:9.
- Imagen, vídeo, logo y texto como capas editables.
- Full Bleed real para imagen/vídeo.
- Crop, zoom, fit, rotación, tamaño, opacidad, orden y lock.
- Smart spawn, roles, layouts, Brand Kit, templates, Asset Library, autosave y Undo/Redo.
- Classic Fabric WebGL/Verlet: grab, drag, stretch y release.
- Export PNG, grabación WebGL, MP4/WebM, JSON portable, Interactive HTML, ZIP, Share URL e iframe.

## Regla de estabilidad física

`Classic Fabric / Verlet` queda protegido. Los motores nuevos se integran mediante `Surface Engine Manager` y deben poder activarse/desactivarse sin reescribir el renderer Classic ni perder capas, proyectos o assets.

## Fase 4 — Dynamic 3D Surface Engines

Arquitectura actual:

- `Classic Fabric` — motor WebGL/Verlet estable.
- `3D Paper` — fuentes ThreeUI exactas vendorizadas y verificadas por SHA-256.
- `Surface Engine Manager` — cambio reversible entre superficies.
- `Paper Studio` — Original, Japanese, Certificate y Site of the Year.
- `Woven Cloth` — siguiente motor objetivo; pendiente de source-lock exacto.

## Paper Studio 4.4R — Native Fidelity

La primera iteración 4.4 sustituyó por completo el artwork de `makeCertTexture()` y el gate visual humano detectó que las cuatro variantes perdían demasiada identidad. 4.4R corrige la arquitectura con un principio: **ThreeUI conserva el diseño físico; BANDEROLAS sustituye o añade el contenido**.

### Qué se conserva del original

- El `makeCertTexture()` original de cada variante se ejecuta; no se reemplaza.
- Se mantiene el artwork no textual nativo: marcos, formas, ornamentos, gradientes, texturas y elementos gráficos.
- Se conservan DOF, grain, vignette, atmósfera, geometría, shader, luces, material y movimiento originales.
- Solo se suprime el copy demo original durante el render del canvas y el gran `<h1>` demo del fondo DOM.
- `Material → Native / EXACT ThreeUI · no overrides` restaura los valores reales capturados de la variante y no los aproxima mediante presets BANDEROLAS.
- `Motion → Native ThreeUI` conserva el comportamiento original; los perfiles custom son opcionales.

### BANDEROLAS Content Layer

`src/surfaces/paper3d-native-fidelity.js` genera internamente una composición transparente desde el mismo `state.elements`; no existe un segundo editor visible.

Soporta:

- imagen;
- vídeo LIVE;
- logo;
- texto;
- orden de capas;
- crop, zoom, fit, opacidad, rotación y tipografía.

Modos de contenido:

- `Native + Content` — recomendado; conserva el shell nativo y superpone el contenido BANDEROLAS.
- `Native Safe Layout` — conserva el shell y aplica el contenido dentro de un inset configurable para respetar ornamentos.
- `Full Bleed · replace artwork` — conserva la opción 4.3 para usar la creatividad a sangre sobre la superficie 3D.

El estado `state.surface` usa schema v4 e incluye `content.mode`, `content.opacity` y `content.safeInset`, además de variant/material/motion/interaction.

### Advanced Overrides

Siguen disponibles Opaque, Transparent, Translucent/Backlit, Glass Paper, Soft Washi e Iridescent Film, junto con Calm, Float, Tilt/Hover, Inertial Spin y Dynamic. Son modificaciones opcionales. Para comparar con máxima fidelidad los cuatro originales se debe usar `Native` tanto en Material como en Motion.

## Source lock

Los originales ThreeUI permanecen inmutables bajo `vendor/threeui/3d-paper/` y se verifican contra `SOURCE_LOCK.json`. La adaptación BANDEROLAS vive exclusivamente fuera de `vendor/`.

Documentación principal:

- `docs/ROADMAP_PHASE_4_DYNAMIC_SURFACES.md`
- `docs/THREEUI_INTEGRATION_SPEC.md`
- `docs/PHASE_4_2_REVIEW.md`
- `docs/PHASE_4_3_REVIEW.md`
- `docs/PHASE_4_4_REVIEW.md`

## Estado

Fase 1: ✅ cerrada y mergeada a `main`.  
Fase 2: ✅ cerrada y mergeada a `main`.  
Fase 3: ✅ cerrada y mergeada a `main`.  
Fase 4.1 — Surface Engine Foundation: ✅ mergeada.  
Fase 4.2 — ThreeUI Source Lock + 3D Paper Original: ✅ mergeada.  
Fase 4.3 — Dynamic CanvasTexture Adapter: ✅ mergeada.  
Fase 4.4R — Native Fidelity Paper Studio: 🟡 implementada en PR #4 y pendiente exclusivamente de gate visual humano.  
Fase 4.5 — Woven Cloth: ⏳ pendiente.  
Fase 4.6 — Export / Interactive / Share parity: ⏳ pendiente.
