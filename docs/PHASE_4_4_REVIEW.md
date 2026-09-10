# PHASE 4.4 REVIEW — PAPER STUDIO

## Objetivo

Convertir el motor `3D Paper` ya integrado en una superficie configurable de producción, manteniendo el mismo editor, el mismo compositor BANDEROLAS y el motor Classic Fabric protegido.

## Implementado

### 1. Cuatro variantes ThreeUI exactas

El selector `Surface / 3D → Variant` permite:

- `Original`
- `Japanese`
- `Certificate`
- `Site of the Year`

Cada variante se carga desde su archivo exacto vendorizado y se valida en runtime contra `SOURCE_LOCK.json` antes de montarse. No se modifica ningún archivo bajo `vendor/threeui/3d-paper/`.

### 2. Paper Studio dentro del mismo panel

Se añade una única sección compacta dentro de `Surface / 3D`. No existe un segundo editor, panel ni canvas de composición.

Presets de material:

- Native / Variant authored
- Opaque Paper
- Transparent Sheet
- Translucent / Backlit
- Glass Paper
- Soft Washi
- Iridescent Film

Controles de material en vivo:

- opacity
- transparency
- translucency
- backlight
- roughness
- reflection
- clearcoat
- iridescence
- 3D depth
- perspective
- light intensity
- light X / Y

Presets de motion:

- Native ThreeUI
- Calm
- Float
- Tilt / Hover
- Inertial Spin
- Dynamic

Controles de motion/interacción:

- motion intensity
- idle motion
- inertia
- pointer tilt
- float
- pointer sensitivity

### 3. Runtime derivada, vendor inmutable

`src/surfaces/paper3d-runtime-bridge.js` crea una runtime derivada en memoria. Sobre esa runtime se conectan:

- CanvasTexture viva de BANDEROLAS;
- parámetros de material;
- parámetros de motion;
- interacción/pointer sensitivity;
- cámara/perspectiva;
- iluminación.

La geometría, shaders y estructura base ThreeUI continúan procediendo del source exacto.

### 4. Persistencia

`state.surface` pasa a schema v3. La variante, material, motion e interacción forman parte del estado serializable del proyecto y siguen el mismo flujo existente de Save / JSON / Import / history.

Los proyectos Paper creados con schema anterior se migran al baseline nativo de Paper para no heredar por error parámetros visuales de Classic Fabric.

## Archivos principales

- `src/surfaces/surface-schema.js`
- `src/surfaces/paper3d-runtime-bridge.js`
- `src/surfaces/paper3d-adapter.js`
- `src/surfaces/paper3d-studio.js`
- `scripts/verify-phase4-4.mjs`
- `.github/workflows/phase4-4-verify.yml`

## Gate automático

`Phase 4.4 Verify` comprueba:

1. sintaxis JS;
2. SHA-256 exacto de las cuatro variantes;
3. coincidencia con `SOURCE_LOCK.json`;
4. ausencia de código BANDEROLAS dentro del vendor;
5. que las cuatro fuentes exactas pueden transformarse por el bridge sin romper los markers necesarios;
6. live texture bridge;
7. live material/motion bridge;
8. selector de cuatro variantes;
9. presets de material y motion;
10. carga de `paper3d-studio.js` en producción.

## Gate visual humano

Usar una sola creatividad: `vídeo Full Bleed + logo + headline + CTA`.

Secuencia de revisión:

1. comprobar `Classic Fabric` y su grab/stretch;
2. cambiar a `3D Paper`;
3. comprobar `Original` con contenido BANDEROLAS vivo;
4. cambiar a `Japanese` sin perder capas ni vídeo;
5. cambiar a `Certificate`;
6. cambiar a `Site of the Year`;
7. probar `Transparent Sheet`;
8. probar `Translucent / Backlit`;
9. probar `Glass Paper`;
10. probar `Soft Washi`;
11. probar `Iridescent Film`;
12. probar `Float`, `Tilt / Hover`, `Inertial Spin` y `Dynamic`;
13. mover sliders de Reflection, Depth, Perspective, Light y Pointer sensitivity;
14. volver a `Classic Fabric` y confirmar que la física original sigue intacta;
15. volver a Paper y comprobar que la creatividad continúa intacta.

## Criterio de aprobado

La misma creatividad debe cambiar entre las cuatro variantes sin reconstruirse, el vídeo debe seguir vivo y los cambios de material/motion deben ser visibles en tiempo real. Classic Fabric no puede sufrir regresión.

## Límites deliberados

- Woven Cloth no entra en 4.4; corresponde a 4.5.
- La paridad completa de Interactive/Share/Embed para Paper corresponde a 4.6.
- La edición directa de capas sobre la superficie 3D sigue fuera de este gate; la composición se edita desde el mismo panel actual.
