# PHASE 4.1 REVIEW — SURFACE ENGINE FOUNDATION

## Estado

Implementación completada en `feat/dynamic-3d-surface-engines` y pendiente de gate visual humano antes de avanzar a 4.2.

## Objetivo de 4.1

Introducir una arquitectura multimotor sin modificar la apariencia ni la física validada de `Classic Fabric / Verlet`.

## Implementado

### Surface schema

`src/surfaces/surface-schema.js`

- `state.surface` versionado (`schemaVersion: 1`).
- engine, variant, material, motion e interaction.
- normalización y límites de valores.
- feature flags: `classic=true`, `paper3d=false`, `woven=false`.
- cualquier engine todavía no habilitado cae de forma segura a Classic.

### Surface Engine Manager

`src/surfaces/surface-manager.js`

API común preparada para:

```js
surfaceManager.register(id, adapter)
surfaceManager.use(id, context)
surfaceManager.setTexture(texture)
surfaceManager.setFormat(format)
surfaceManager.setMaterial(material)
surfaceManager.setMotion(motion)
surfaceManager.setInteraction(interaction)
surfaceManager.sync(surface, context)
```

En 4.1 solo existe un adapter registrado: `classic`.

### Classic Fabric adapter

`src/surfaces/classic-fabric-adapter.js`

El adapter es deliberadamente no destructivo:

- NO reemplaza `render()`;
- NO crea otro `requestAnimationFrame`;
- NO crea otro WebGL context;
- NO añade handlers alternativos de pointer/grab;
- NO reemplaza constraints ni Verlet;
- NO reconstruye el shader Classic.

La ruta física que ya fue validada sigue siendo la autoridad.

### Panel único

La antigua sección `Premium Interaction` se convierte en `Surface / 3D` dentro de la sidebar existente.

Contiene:

- `Classic Fabric / Verlet` activo;
- `3D Paper · next` visible pero deshabilitado;
- `Woven Cloth · source lock pending` visible pero deshabilitado;
- variant `Default`;
- el mismo control Grip Radius existente.

No existe segundo editor, segundo panel ni segundo canvas WebGL.

### Persistencia

`surface` queda incluido en:

- Save Project;
- Save Template;
- autosave que usa `serializableProject()`;
- history snapshots / Undo / Redo;
- Portable Project JSON;
- Import JSON;
- Open Project;
- Apply Template;
- New Project vuelve de forma determinista a Classic.

Ejemplo:

```json
{
  "surface": {
    "schemaVersion": 1,
    "engine": "classic",
    "variant": "default",
    "material": {},
    "motion": {},
    "interaction": {
      "gripRadius": 80,
      "sensitivity": 1
    }
  }
}
```

## Autodiagnóstico 4.1

Al cargar, la foundation ejecuta 20 ciclos de selección del engine Classic y comprueba:

- engine activo = Classic;
- adapter Classic registrado;
- exactamente un `#glcanvas` en el DOM;
- exactamente un `#ui-panel`;
- `serializableProject().surface.engine === 'classic'`.

El resultado se muestra en `Surface / 3D` y también queda disponible en consola mediante:

```js
BanderolasSurfaceFoundation.check()
```

Este autodiagnóstico no sustituye la comprobación visual del movimiento WebGL.

## Gate visual humano 4.1

1. Abrir el build de revisión.
2. Confirmar que aparece `PHASE 4.1 · SURFACE FOUNDATION`.
3. Confirmar sección única `Surface / 3D`.
4. Confirmar `Classic Fabric / Verlet` activo y Paper/Woven deshabilitados.
5. En `FABRIC / INTERACT`: grab → drag → stretch → release.
6. Confirmar que el comportamiento físico se siente igual que el build 8.0 aprobado.
7. Cambiar Grip Radius y comprobar que solo cambia facilidad de captura.
8. Añadir imagen/vídeo/texto y confirmar que el compositor sigue funcionando.
9. Save Project → Open Project.
10. Download JSON → Import JSON y confirmar que Classic + Grip se conservan.
11. Undo / Redo sin perder `state.surface`.
12. Verificar PNG, grabación y Interactive siguen disponibles.

## Stop condition

Si Classic pierde grab/stretch, cambia su apariencia, aparece un segundo canvas/panel o se pierden capas al guardar/importar, 4.1 NO pasa y no se inicia 4.2.

## Siguiente subfase tras aprobación

**4.2 — ThreeUI Source Lock + 3D Paper Original**:

1. descargar el bundle registrado completo `3d-paper.json`;
2. verificar SHA-256 archivo por archivo;
3. detenerse si cualquier hash no coincide;
4. guardar fuentes originales inmutables bajo `vendor/threeui/3d-paper/`;
5. crear `paper3d-adapter.js` separado;
6. activar únicamente `3D Paper / Original`;
7. probar cambio reversible `Classic ↔ 3D Paper` sin pérdida de contenido.
