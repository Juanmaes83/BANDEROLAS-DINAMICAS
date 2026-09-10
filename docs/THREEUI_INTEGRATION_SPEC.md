# THREEUI INTEGRATION SPEC — BANDEROLAS PRO

## Propósito

Definir cómo integrar `ThreeDPaper` y `WovenCloth` en BANDEROLAS PRO sin recrear los efectos, sin romper Classic Fabric y sin introducir un segundo editor.

## Regla principal

Las implementaciones de ThreeUI se tratan como fuentes de tercero **inmutables**. La aplicación BANDEROLAS nunca debe editar directamente los archivos registrados. Toda adaptación vive en adapters propios.

## Estructura objetivo

```text
vendor/
  threeui/
    3d-paper/
      SOURCE_LOCK.json
      sources/
      ThreeDPaper.tsx
      threeui.css
    woven-cloth/
      SOURCE_LOCK.json
      sources/
      WovenCloth.tsx
      NeuformCraftEffects.tsx
      threeui.css

src/
  surfaces/
    surface-manager.js
    surface-schema.js
    classic-fabric-adapter.js
    paper3d-adapter.js
    woven-adapter.js
```

## Contrato Surface Engine

Cada engine debe exponer, directa o adaptadamente:

```js
{
  id,
  mount(context),
  unmount(),
  setTexture(canvas),
  setFormat(format),
  setMaterial(params),
  setMotion(params),
  setInteraction(params),
  resize(width, height),
  reset(),
  getCanvas(),
  serialize()
}
```

`context` contiene referencias a los servicios existentes de BANDEROLAS, nunca una copia del editor:

```js
{
  host,
  texCanvas,
  format,
  project,
  requestTextureUpdate,
  onInteractionState
}
```

## Estado común

```js
state.surface = {
  engine: 'classic',
  variant: 'default',
  material: {
    transparency: 0,
    translucency: 0,
    roughness: 0.5,
    reflection: 0,
    backlight: 0,
    depth: 0.5
  },
  motion: {
    mode: 'stretch',
    intensity: 0.5,
    wind: 0.2,
    inertia: 0.5,
    idle: 0.2
  },
  interaction: {
    gripRadius: 80,
    sensitivity: 1
  }
}
```

El esquema se ampliará solo cuando la fuente exacta del motor confirme que un parámetro existe o puede adaptarse sin destruir el comportamiento original.

## Classic Fabric

- Sigue siendo engine por defecto.
- El adapter encapsula el motor actual sin reescribirlo.
- `render()`, Verlet, constraints y la ruta `grabbedParticle` permanecen protegidos.
- Debe poder hacerse rollback instantáneo a Classic desde cualquier motor alternativo.

## ThreeDPaper

### Fuente

Bundle: `https://threeui.com/source-code/3d-paper.json`

Antes de integrar:

1. recuperar bundle completo;
2. escribir los archivos exactos bajo `vendor/threeui/3d-paper/`;
3. calcular SHA-256 localmente;
4. comparar con el manifiesto aprobado;
5. abortar si existe cualquier diferencia.

### Adapter

El objetivo no es mostrar la documentación ni mantener un iframe opaco como producto final. El objetivo es preservar el motor exacto y exponer una frontera de integración controlada.

La primera integración debe demostrar el engine original sin modificar. La segunda sustituirá únicamente el origen de la `CanvasTexture` por `texCanvas`, conservando geometría, shaders, responsive behavior, motion e interaction del source registrado.

### Variantes

- `default`
- `japanese`
- `certificate`
- `site-of-the-year`

Las variantes son estilos/motores de superficie, no composiciones de contenido bloqueadas. BANDEROLAS mantiene la propiedad del contenido creativo.

## WovenCloth

### Fuente

Bundle: `https://threeui.com/source-code/woven-cloth.json`

Se aplica la misma política source-lock. Hasta que el bundle completo sea recuperado y todos los hashes coincidan, `woven` permanece deshabilitado en producción.

### Variantes esperadas

- `woven-cloth`
- `iridescent`
- `atelier`
- `washi`

No se crearán aproximaciones si la fuente falla o no coincide.

## Panel único

Se añade un único bloque `Surface / 3D` al panel existente. Debe incluir:

- Engine
- Variant
- Material
- Motion
- Interaction

Los controles son contextuales. Classic no muestra controles de reflectividad que no use; Woven no muestra parámetros no soportados; Paper no hereda sliders de tela si no tienen equivalente real.

## CanvasTexture dinámica

La fuente creativa sigue siendo `texCanvas`:

```text
media + video + logos + text
          ↓
       texCanvas
          ↓
    active surface engine
```

Para vídeo, el adapter debe actualizar la textura sobre los frames reales del vídeo sin convertirlo en una captura estática.

## Transparencia

Se distinguen tres comportamientos:

- `transparent`: alpha real de la superficie/fondo cuando técnicamente proceda;
- `translucent`: transmisión parcial de luz/material;
- `glass-paper`: reflexión + transparencia/transmisión cuando el shader exacto permita una implementación coherente.

Nunca se etiquetará como translucencia un simple `opacity` global.

## Exportación

El pipeline de salida debe consultar al engine activo. El proyecto portable guarda `state.surface`.

Para grabación se captura el canvas activo del engine. Para Interactive/Share/Embed el runtime debe montar el engine seleccionado, no degradarlo silenciosamente a Classic.

Si un engine no soporta una salida todavía, la UI debe indicarlo explícitamente y bloquear ese botón hasta completar parity.

## Seguridad de integración

- No sobrescribir `main` durante experimentos.
- No reemplazar el motor Classic para probar Paper/Woven.
- No duplicar sidebar/editor.
- No perder capas al cambiar engine.
- Liberar WebGL contexts, listeners, animation frames y object URLs en `unmount()`.
- Evitar múltiples loops `requestAnimationFrame` activos tras cambiar de engine.

## Gate técnico mínimo por engine

1. Mount/unmount repetido 20 veces sin listeners/RAF duplicados evidentes.
2. Resize 9:16 ↔ 1:1 ↔ 16:9.
3. Imagen Full Bleed.
4. Vídeo Full Bleed vivo.
5. Logo + texto por encima.
6. Interacción mouse y touch.
7. Save/JSON/import conserva configuración.
8. Recording y frame PNG.
9. Interactive runtime.
10. Volver a Classic sin degradación.

## Decisión de producto

BANDEROLAS PRO pasa a tratar la banderola como una `Dynamic Surface`. El editor y el compositor son comunes; la superficie física/3D es intercambiable. Esta separación es la base de la Fase 4.
