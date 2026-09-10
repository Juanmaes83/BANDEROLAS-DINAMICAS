# ROADMAP — FASE 4 · DYNAMIC 3D SURFACE ENGINES

## Objetivo

Evolucionar BANDEROLAS PRO desde un editor con un único motor de tela física a un estudio multimotor de superficies dinámicas 3D, manteniendo:

- una única aplicación;
- un único panel de personalización;
- el mismo sistema de capas/proyectos/assets;
- el mismo compositor dinámico imagen + vídeo + logo + texto;
- el motor `Classic Fabric` actual como fallback estable y protegido;
- las salidas PNG, vídeo, MP4, JSON, Interactive, ZIP, Share e iframe.

La creatividad debe ser independiente del motor. Una composición creada una sola vez debe poder cambiar entre `Classic Fabric`, `3D Paper` y `Woven Cloth` sin reconstruir capas.

---

## Principios no negociables

1. **No romper Classic Fabric.** El motor WebGL/Verlet validado no se reemplaza ni se reescribe durante la integración de nuevos motores.
2. **Exact source first.** ThreeUI/Neuform se integra desde la fuente registrada exacta; nunca se recrea desde preview, screenshots o descripciones.
3. **Source lock.** Todo archivo de tercero queda almacenado sin modificar bajo `vendor/` con su SHA-256 esperado y verificado.
4. **Adapters, no forks destructivos.** La integración BANDEROLAS vive en `src/engines/` y `src/adapters/`.
5. **Un solo panel.** Los controles de superficie se añaden al panel actual mediante una sección `Surface / 3D`.
6. **Feature parity de producción.** Un motor nuevo no se considera terminado hasta funcionar también con guardado, JSON, grabación, exportación, Interactive, Share e Embed.
7. **Human visual gate.** Cada subfase termina con URL de revisión visual antes de merge.

---

## Fuentes registradas a bloquear

### ThreeDPaper

Bundle registrado: `https://threeui.com/source-code/3d-paper.json`

- `src/shaders/3d-paper/sources/3d-paper.html`
  - SHA-256 `8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353`
- `src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html`
  - SHA-256 `fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d`
- `src/shaders/3d-paper/sources/3d-paper-japanese.html`
  - SHA-256 `4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738`
- `src/shaders/3d-paper/sources/3d-paper-certificate.html`
  - SHA-256 `0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32`
- `src/shaders/3d-paper/ThreeDPaper.tsx`
  - SHA-256 `c2c8d1e9a0baf69c9e477e270ccde0254d6270918c106b62dffb5c7931223b20`
- `src/shaders/threeui.css`
  - SHA-256 `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf`

### WovenCloth

Bundle registrado: `https://threeui.com/source-code/woven-cloth.json`

- `src/shaders/woven-cloth/WovenCloth.tsx`
  - SHA-256 `5a89ff035bdf33dbc642d2916b56dbe94e89cb0af184474c139ffbfe5a720550`
- `src/shaders/neuform-isolated/NeuformCraftEffects.tsx`
  - SHA-256 `0a1680c3c119dba8c61d946322afa0b64d36dfd80956fb5e7c3fd017d7bfa450`
- `src/shaders/neuform-isolated/sources/lumina-weavers-cloth.html`
  - SHA-256 `9bfd56ef7579a92cb6385b3e93866bc3ff54fa4489a0febb9809b720e2946fb6`
- `src/shaders/woven-cloth/woven-cloth-iridescent.html`
  - SHA-256 `e3b14adac39dfef04ed0bb0df99e86a1aa0aaf7cea4f8ecc4d5e0931b48bee7b`
- `src/shaders/woven-cloth/woven-cloth-atelier.html`
  - SHA-256 `f9be15756ff385db9cd3b7082b139d10b84a4eba0b3c4f19749b305570a7191f`
- `src/shaders/woven-cloth/woven-cloth-washi.html`
  - SHA-256 `00e5971f139e5427e56a062c12d7e8e3590938b9a400753693b360d1e4d1a5c1`
- `src/shaders/threeui.css`
  - SHA-256 `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf`

Si cualquiera de estas fuentes no puede recuperarse o no coincide con su hash, se detiene la integración de ese motor. No se aproxima.

---

# Subfase 4.1 — SURFACE ENGINE FOUNDATION

## Objetivo

Introducir una API común de motores sin cambiar todavía el aspecto final de Classic Fabric. Esta subfase crea la arquitectura que permitirá insertar ThreeDPaper y WovenCloth de forma segura.

### Entregables

- `src/surfaces/surface-manager.js`
- `src/surfaces/surface-schema.js`
- `src/surfaces/classic-fabric-adapter.js`
- nueva sección `Surface / 3D` en el panel existente;
- estado `state.surface` versionado y persistente;
- serialización en Save/JSON/Import;
- Classic Fabric registrado como primer engine;
- feature flags para `paper3d` y `woven` todavía desactivados;
- regression test visual: Classic debe comportarse idéntico antes y después.

### API objetivo

```js
surfaceManager.register('classic', classicFabricAdapter)
surfaceManager.register('paper3d', paper3dAdapter)
surfaceManager.register('woven', wovenAdapter)

surfaceManager.use(state.surface.engine)
surfaceManager.setTexture(texCanvas)
surfaceManager.setFormat(state.format)
surfaceManager.setMaterial(state.surface.material)
surfaceManager.setMotion(state.surface.motion)
surfaceManager.setInteraction(state.surface.interaction)
```

### Gate 4.1

- Classic Fabric sigue agarrándose/estirándose igual.
- No cambia la composición ni las exportaciones existentes.
- Cambiar `state.surface.engine` no pierde capas.
- Save → reload → JSON → import conserva `state.surface`.
- El panel sigue siendo único.

---

# Subfase 4.2 — THREEUI SOURCE LOCK + 3D PAPER ORIGINAL

## Objetivo

Recuperar el bundle completo de `3d-paper.json`, verificar SHA-256 archivo por archivo y guardar los originales bajo `vendor/threeui/3d-paper/` sin modificación.

### Entregables

- manifiesto `vendor/threeui/3d-paper/SOURCE_LOCK.json`;
- archivos exactos originales;
- script/documento de comprobación de hashes;
- `src/surfaces/paper3d-adapter.js`;
- motor `paper3d` disponible en el selector;
- primera variante: `original`.

### Gate 4.2

- Source hashes coinciden.
- ThreeDPaper original funciona dentro de BANDEROLAS sin iframe de documentación.
- Classic Fabric sigue intacto.
- El cambio `Classic ↔ 3D Paper` es reversible en caliente.

---

# Subfase 4.3 — DYNAMIC CANVAS TEXTURE ADAPTER

## Objetivo

Sustituir únicamente la textura de contenido interna del motor ThreeDPaper por el `texCanvas` dinámico de BANDEROLAS, preservando shaders, geometría, motion e interacción originales.

### Gate 4.3

Una creatividad con `vídeo Full Bleed + logo + headline + CTA` debe aparecer en 3D Paper sin duplicar editor ni DOM overlay. El vídeo debe seguir reproduciéndose mientras la superficie se mueve.

---

# Subfase 4.4 — 3D PAPER VARIANTS + MATERIAL/MOTION CONTROLS

## Variantes

- Original
- Japanese
- Certificate
- Site of the Year

## Controles Surface / 3D

- Material: Opaque / Transparent / Translucent / Glass Paper / Washi
- Transparency
- Translucency / Backlight
- Roughness
- Reflection
- Depth
- Perspective
- Light direction / intensity
- Motion: Float / Tilt / Inertial Spin / Idle
- Motion intensity
- Inertia
- Grip / pointer sensitivity

Los controles se muestran condicionalmente según el engine activo.

### Gate 4.4

La misma creatividad cambia entre las cuatro variantes sin perder contenido ni estado.

---

# Subfase 4.5 — WOVEN CLOTH SOURCE LOCK + ENGINE

## Objetivo

Recuperar `woven-cloth.json`, verificar todos los hashes y solo entonces integrar el motor exacto.

## Variantes objetivo

- Woven Cloth
- Iridescent
- Atelier
- Washi

## Controles específicos

- Weave / thread visibility
- Hue
- Saturation
- Brightness
- Roughness
- Wind
- Stiffness
- Motion intensity

### Gate 4.5

Misma creatividad, vídeo vivo y cambio reversible `Classic ↔ Paper ↔ Woven`.

---

# Subfase 4.6 — EXPORT / INTERACTIVE / SHARE PARITY

Actualizar el esquema portable para incluir:

```json
{
  "surface": {
    "engine": "paper3d",
    "variant": "japanese",
    "material": {},
    "motion": {},
    "interaction": {}
  }
}
```

Todas las salidas deben respetar el motor seleccionado:

- Design PNG
- Surface/3D Frame PNG
- Recording WebM
- MP4
- Project JSON
- Interactive HTML
- ZIP
- Share URL
- iframe Embed

### Gate 4.6

Una pieza exportada debe conservar el mismo engine, variante, material y motion que el editor.

---

# Subfase 4.7 — PERFORMANCE + QA + CIERRE

## Pruebas

- Desktop Chrome/Edge/Safari cuando sea posible.
- Touch/pointer móvil.
- 9:16 / 1:1 / 16:9.
- 1 vídeo Full Bleed + 3 imágenes + 1 logo + 4 textos.
- Classic / Paper / Woven.
- cambio repetido de motor sin leaks visibles;
- grabación y exportación;
- Interactive/Embed.

## Gate final de Fase 4

Una única creatividad debe poder cambiar en vivo entre:

1. `Classic Fabric` — grab/stretch.
2. `Japanese Paper` — translucencia + float/tilt.
3. `Certificate` — reflection + inertial 3D.
4. `Woven` — weave + wind/wave.

Y los cuatro deben poder grabarse y distribuirse sin reconstruir el proyecto.

---

## Estrategia de ramas

- Base estable: `main` — Fases 1–3 cerradas.
- Desarrollo Fase 4: `feat/dynamic-3d-surface-engines`.
- Labs experimentales: `labs/`.
- Nunca experimentar directamente sobre `main`.

## Definición de terminado

Fase 4 solo se cierra cuando los motores nuevos superan sus gates visuales y de producción y el usuario aprueba la URL final de revisión antes de merge.
