# BANDEROLAS PRO

Editor de creatividades interactivas sobre superficies físicas y 3D. La composición (imagen, vídeo, logos y texto) se renderiza en una única textura que se aplica al motor visual activo, de modo que el contenido forma parte real de la superficie y responde al movimiento, deformación, profundidad e interacción.

## Producción estable — Fases 1 a 3

La entrada canónica es `index.html`. Carga el editor base y los módulos de producción en este orden:

1. `src/editor-base.html` — UI, compositor, WebGL y Verlet base.
2. `src/editor-features.js` — capas, roles, smart spawn, layouts, texto y assets.
3. `src/state-sync.js` — sincronización de formato/proyecto/historial.
4. `src/composition-tools.js` — blank project, edición avanzada, background, Brand Kit y assets.
5. `src/interaction-stable.js` — ruta de grab/drag validada; no reemplaza el render físico.
6. `src/production.js` — Full Bleed, PNG, JSON, grabación y HTML interactivo.
7. `src/delivery.js` — MP4, ZIP, Share/Embed y acceso al laboratorio A/B.

Los antiguos `fix*.js` y `review-v*.html` se retiraron del árbol de producción. La funcionalidad se conserva bajo nombres semánticos en `src/`.

## Capacidades actuales

- Proyecto vacío por defecto; L.A.P.D. queda como plantilla opcional.
- Formatos 9:16, 1:1 y 16:9.
- Imágenes, vídeos, logos y texto como capas editables.
- Full Bleed real para imagen/vídeo (`x=0`, `y=0`, `w=1`, `h=1`, `cover`).
- Crop, zoom, fit, rotación, tamaño, opacidad, orden y lock.
- Smart spawn, roles y layouts.
- Brand Kit, templates, Asset Library, autosave, Undo/Redo.
- Física WebGL/Verlet con mouse y touch: grab, drag, stretch, release.
- Export DESIGN PNG y FABRIC FRAME PNG.
- Grabación del canvas WebGL a vídeo.
- Descarga MP4 directa cuando el navegador la soporta; fallback WebM→MP4 mediante ffmpeg.wasm.
- JSON portable con assets embebidos e importación round-trip.
- HTML interactivo autocontenido.
- ZIP estructurado con `index.html`, `project.json`, `README.txt` y `assets/` originales.
- Share URL comprimida para piezas pequeñas/medias y generación de iframe.
- Viewer limpio en `view/`.
- Laboratorio aislado de física A/B en `labs/physics-ab.html`.

## Share / Embed

`COPY SHARE URL` comprime el HTML interactivo autocontenido con `CompressionStream` y lo introduce en el fragmento `#p=` de `view/`. El fragmento no se envía al servidor; el viewer lo descomprime en el navegador.

Para proyectos con vídeos pesados, una URL gigante no es un formato de distribución fiable. En ese caso se debe usar `DOWNLOAD INTERACTIVE` o `DOWNLOAD ZIP` y alojar ese artefacto en la web/hosting del cliente. El iframe generado funciona directamente cuando la pieza entra dentro del límite práctico del Share URL.

## MP4

La grabación usa `canvas.captureStream(60)` + `MediaRecorder`. Si el navegador puede grabar H.264/MP4, la descarga es directa. Si solo genera WebM, `DOWNLOAD MP4` carga ffmpeg.wasm bajo demanda y transcodifica a H.264/yuv420p.

## Regla de estabilidad física

El motor Classic Fabric / Verlet validado queda protegido. Nuevas funciones no deben sustituirlo de forma destructiva. Los nuevos motores se integran mediante una capa `Surface Engine Manager`, se validan de forma aislada y deben poder activarse/desactivarse sin alterar capas, proyectos, assets, exportación ni el motor Classic.

## Nueva fase — Dynamic 3D Surface Engines

La siguiente evolución convierte BANDEROLAS PRO en un editor multimotor de superficies dinámicas 3D manteniendo el mismo panel y el mismo compositor. Objetivo inicial:

- `Classic Fabric` — motor WebGL/Verlet actual, protegido.
- `3D Paper` — fuente exacta ThreeUI, con variantes Original, Japanese, Certificate y Site of the Year.
- `Woven Cloth` — fuente exacta ThreeUI/Neuform, con variantes Woven, Iridescent, Atelier y Washi.
- Transparencia, translucencia, reflexión, profundidad y backlight cuando el motor lo soporte.
- Nuevos movimientos: float, tilt, inertial spin, wind/wave y combinaciones controladas.
- El mismo contenido de BANDEROLAS PRO debe poder cambiar de motor sin reconstruir la creatividad.
- Todas las salidas existentes (PNG, vídeo, MP4, JSON, Interactive, ZIP, Share e iframe) deben conservar el motor y sus parámetros.

Documentación de esta fase:

- `docs/ROADMAP_PHASE_4_DYNAMIC_SURFACES.md`
- `docs/THREEUI_INTEGRATION_SPEC.md`

## Estado

Fase 1: ✅ cerrada y mergeada a `main`.  
Fase 2: ✅ cerrada y mergeada a `main`.  
Fase 3: ✅ cerrada y mergeada a `main`.  
Fase 4 — Dynamic 3D Surface Engines: 🟡 documentación y roadmap abiertos en `feat/dynamic-3d-surface-engines`; implementación pendiente de aprobación por subfase.
