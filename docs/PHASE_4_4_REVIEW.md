# PHASE 4.4R REVIEW — PAPER STUDIO · NATIVE FIDELITY

## Motivo de la revisión

La primera implementación 4.4 pasó los gates estructurales pero falló el gate visual humano: las cuatro variantes existían, pero al sustituir completamente `makeCertTexture()` por el CanvasTexture de BANDEROLAS se eliminaba gran parte del diseño que hacía reconocibles a Original, Japanese, Certificate y Site of the Year.

La corrección 4.4R cambia el criterio: **ThreeUI manda sobre el diseño físico y BANDEROLAS sustituye/añade contenido sin destruir el shell nativo**.

## Principio de integración

Los archivos bajo `vendor/threeui/3d-paper/` siguen byte-for-byte inmutables y verificados por SHA-256.

En la runtime derivada:

1. `makeCertTexture()` original NO se reemplaza.
2. Se ejecuta exactamente la función nativa de cada variante.
3. Durante esa ejecución se interceptan temporalmente `fillText` y `strokeText` para suprimir solo el copy demo.
4. Se conserva todo el contenido no textual del canvas original: fondos, formas, marcos, ornamentos, gradientes, sellos gráficos, texturas y demás artwork.
5. Se captura ese resultado como `nativeBase`.
6. La composición BANDEROLAS se renderiza aparte sobre un canvas transparente.
7. Ese canvas se compone por encima de `nativeBase` y sigue admitiendo imagen, vídeo LIVE, logo y texto.

Además se elimina únicamente el `<h1>` demo del fondo DOM. Se conservan las capas de ambiente originales como DOF, grain, vignette, colores, luces y estructura de la variante.

## Modos de contenido

Dentro de `Surface / 3D → Paper Studio` aparecen tres modos:

- `Native + Content` — recomendado. Conserva el artwork nativo y superpone las capas BANDEROLAS sobre toda la superficie.
- `Native Safe Layout` — conserva el artwork nativo y coloca el contenido BANDEROLAS dentro de un área segura configurable para respetar bordes/ornamentos.
- `Full Bleed · replace artwork` — mantiene el comportamiento 4.3: reemplaza visualmente el artwork por la creatividad BANDEROLAS a sangre, conservando geometría/material/motion del Paper.

Controles añadidos:

- Content opacity.
- Native safe inset.

## Material Native ahora es realmente Native

`Material preset → Native / EXACT ThreeUI · no overrides` ya no intenta recrear el aspecto nativo mediante nuestros sliders.

En modo Native se restauran exactamente los valores capturados de la variante cargada: color, roughness, clearcoat, clearcoat roughness, envMap intensity, specular, iridescence, IOR, alphaTest, transmission/thickness cuando existen, sheen, uniforms de bend/rim, FOV, luces y posiciones base.

Los presets custom continúan disponibles como `Advanced Override`; solo entonces BANDEROLAS modifica esos parámetros.

`Motion preset → Native ThreeUI` mantiene igualmente el comportamiento ThreeUI original. Los perfiles custom solo actúan cuando el usuario los selecciona.

## Cuatro variantes exactas

- `Original`
- `Japanese`
- `Certificate`
- `Site of the Year`

Cada una se sigue cargando desde su HTML exacto y se verifica contra `SOURCE_LOCK.json` antes de montar la runtime.

## Compositor BANDEROLAS transparente

Nuevo archivo:

- `src/surfaces/paper3d-native-fidelity.js`

Este módulo crea un canvas interno transparente, no un segundo editor visible. Reutiliza el mismo `state.elements`, `runtimeAssets`, posiciones, crop, zoom, fit, opacidad, rotación, tipografía, auto-fit, letter spacing y orden de capas.

El adapter Paper sigue enviando `ImageBitmap` al iframe. Para `Native + Content` y `Native Safe Layout` envía el canvas transparente; para `Full Bleed` usa el `texCanvas` completo existente.

## Estado / persistencia

`state.surface` pasa a schema v4 y añade:

```json
{
  "content": {
    "mode": "native-content",
    "opacity": 1,
    "safeInset": 0.08
  }
}
```

Se conserva dentro del mismo flujo Save / autosave / history / JSON / import.

## Gate automático 4.4R

`Phase 4.4 Verify` comprueba ahora:

1. 4/4 hashes exactos y SOURCE_LOCK.
2. Ningún vendor contiene código BANDEROLAS.
3. La runtime conserva `makeCertTexture()` original y lo envuelve en vez de sustituirlo.
4. Solo se suprime texto demo durante el render nativo.
5. Existe `nativeBase` y se reutiliza para composición.
6. Existen los tres modos `native-content`, `native-layout`, `full-bleed`.
7. Native Material dispone de bypass/restauración exacta.
8. Canvas BANDEROLAS transparente cargado en producción.
9. Schema v4 activo.
10. Classic Fabric sigue fuera de esta modificación.

## Gate visual humano — obligatorio

Usar exactamente la misma creatividad en las cuatro variantes.

Primero seleccionar:

- `Content Mode → Native + Content`
- `Material → Native / EXACT ThreeUI · no overrides`
- `Motion → Native ThreeUI`

Luego comparar:

1. Original
2. Japanese
3. Certificate
4. Site of the Year

El criterio de aprobación es que las diferencias procedan del diseño/material/atmósfera original de cada source, no de presets inventados por BANDEROLAS.

Después probar `Native Safe Layout` con un logo, headline e imagen/vídeo y comprobar que respeta mejor los ornamentos. Finalmente probar `Full Bleed` para confirmar que el modo 4.3 continúa disponible.

Volver a `Classic Fabric` y comprobar grab → stretch → release sin regresión.

## Estado de merge

PR #4 continúa Draft hasta aprobación visual humana de esta corrección. No se mergea por pasar CI si las variantes no son claramente más fieles a sus originales.
