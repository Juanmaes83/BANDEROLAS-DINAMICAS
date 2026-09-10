# PHASE 4.3 REVIEW — 3D PAPER · LIVE BANDEROLAS CONTENT

## Objetivo

Conectar el compositor existente de BANDEROLAS PRO al motor ThreeUI `3D Paper / Original` para que el contenido demo deje de ser la creatividad visible y la superficie 3D muestre las mismas capas editables del proyecto:

- imagen;
- vídeo;
- logo;
- texto;
- múltiples capas;
- Full Bleed / Cover;
- mismo panel derecho;
- mismo proyecto y estado.

## Regla de source lock

Los archivos originales de ThreeUI bajo `vendor/threeui/3d-paper/` permanecen inmutables. La fuente canónica sigue validándose contra:

`8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353`

No se modifica el vendor para eliminar los textos demo. `paper3d-runtime-bridge.js` deriva en memoria un `srcdoc` de ejecución a partir de la fuente exacta verificada y cambia únicamente la fuente de contenido visual. Geometría, Three.js incluido, material físico, shaders, luces, responsive e interacción inercial siguen procediendo de la fuente registrada.

## Arquitectura 4.3

```text
BANDEROLAS LAYERS
 image / video / logo / text
          ↓
 existing texCanvas compositor
          ↓
 parent createImageBitmap()
          ↓ postMessage transfer
 sandbox ThreeDPaper runtime
          ↓
 persistent CanvasTexture canvas
          ↓
 original ThreeUI Paper material / mesh / shader / motion
```

No hay un segundo editor ni una segunda sidebar.

## Rendimiento

- Con vídeo visible: objetivo de actualización de textura ~24 fps.
- Sin vídeo visible: ~8 fps para cambios de edición/estado.
- Se transfiere `ImageBitmap` cuando está disponible para evitar serializar PNG en cada frame.
- `dataURL` existe solo como fallback de compatibilidad.
- El pump de Paper solo existe mientras `paper3d` está montado y se cancela al volver a Classic.

## Gate visual humano

1. Abrir la review con `Classic Fabric / Verlet`.
2. Crear una composición usando los controles existentes: imagen o vídeo, logo y textos.
3. Para una imagen/vídeo principal, usar `Selected Element → FULL BLEED`.
4. Confirmar que Classic continúa con `grab → drag → stretch → release`.
5. Ir a `Surface / 3D → 3D Paper / Original · live content · verified`.
6. Confirmar que ya NO aparecen como creatividad los textos `Studio of the Week`, `Nocturne Studio` ni el gran fondo `NOCTURNE`.
7. Confirmar que la misma composición BANDEROLAS aparece mapeada sobre el papel 3D.
8. Si hay vídeo, comprobar que continúa reproduciéndose dentro de Paper.
9. Cambiar un texto, logo, imagen o posición desde el panel y confirmar actualización de la textura.
10. Arrastrar Paper y comprobar tilt/rotación/inercia originales.
11. Volver a `Classic Fabric / Verlet` y comprobar de nuevo grab/stretch.
12. Repetir `Classic → Paper → Classic` varias veces y comprobar que no aparecen canvas/paneles duplicados.

## Señales esperadas en UI

En `Surface / 3D`:

- `3D Paper / Original · live content · verified`
- `CONTENT SOURCE · BANDEROLAS LAYERS → LIVE CANVAS TEXTURE`
- al activar Paper: `3D PAPER · LIVE BANDEROLAS CONTENT · ACTIVE`

## Límites deliberados de 4.3

- `Original` es todavía la única variante de Paper activa. Japanese / Certificate / Site of the Year se habilitan en 4.4.
- Material, transparencia, reflexión, profundidad, iluminación e intensidad de motion se controlarán en 4.4.
- Con Paper activo, el iframe de la superficie es dueño del pointer para conservar la interacción inercial exacta. La edición de capas se realiza desde el mismo panel (`Layers`, `Selected Element`, texto/media). La edición directa arrastrando una capa sobre la superficie Paper no es todavía el gate de 4.3.
- Export/Interactive/Share con paridad específica del nuevo engine pertenece a 4.6; las salidas Classic existentes no se eliminan.

## Anti-regresión

Esta fase no sustituye ni reescribe:

- `render()` de Classic;
- solver Verlet;
- constraints;
- `grabbedParticle`;
- handlers físicos de Classic;
- compositor de BANDEROLAS.

Si Paper falla su source lock o su runtime derivado, debe poder regresarse a Classic sin perder el proyecto.

## Definición de aprobado

4.3 se considera aprobada cuando el usuario valida visualmente que una creatividad propia con imagen/vídeo + logo + texto aparece viva dentro de 3D Paper, conserva la interacción 3D y puede volver a Classic con el grab/stretch original intacto.
