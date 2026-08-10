# Banderolas Dinámicas — Output V2

Corrección de la primera preview de Output.

## Cambios

- El panel de edición se fuerza visible en modo authoring.
- Los controles de Output se muestran arriba del panel.
- Record Video / Stop & Download usan `glcanvas.captureStream()` + `MediaRecorder`.
- Selector 30/60 FPS.
- Download PNG directo del canvas WebGL.
- Preview Clean.
- Save / Restore.
- Standalone HTML y Copy Embed.
- Media Size 0.50x–2.50x.
- Media X/Y ±300 dentro de la textura.
- El tamaño/posición del media se implementa mediante un parche controlado a `CanvasRenderingContext2D.drawImage` solo cuando la fuente dibujada es `platformState.mediaElement`; no se modifica la física WebGL.

## Protegido

No se reescriben shaders, Verlet/cloth physics, upload original, interacción del ratón ni render WebGL.
