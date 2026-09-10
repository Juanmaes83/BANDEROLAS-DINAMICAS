# BANDEROLAS PRO — Phase 1 + Phase 2 · FIX 3.3

Branch: `feat/pro-editor-phase1-phase2`
PR: #1 (Draft — pendiente de validación visual humana)

## Regla de producto

Esta rama **evoluciona el editor BANDEROLAS-DINAMICAS existente**. No crea un segundo editor, un segundo canvas ni un segundo panel: sigue existiendo una única tela WebGL y una única sidebar derecha.

## Correcciones de la pasada FIX 3.3

- Proyecto nuevo en blanco. La antigua composición L.A.P.D. deja de ser contenido obligatorio y pasa a ser una plantilla integrada opcional.
- Smart Spawn para texto, imagen, vídeo y logo: los nuevos elementos buscan una zona libre en vez de aparecer siempre en las mismas coordenadas.
- Capas semánticas para layouts: `hero`, `media1...`, `logo`, `headline`, `subheadline`, `body`, `price`, `cta`, `signature`, etc.
- Layouts reescritos para trabajar por roles y evitar el reflow destructivo basado únicamente en el orden del array.
- Motor de texto mejorado: Auto Fit, Auto Height, Fixed Frame, detección visible de overflow, partición de palabras largas y tracking/letter-spacing real.
- Historial corregido para incluir `projectId` y evitar guardar sobre el proyecto incorrecto después de Undo/Redo.
- New/Open/Template/Undo reconstruyen compositor y malla cuando cambia el formato.
- EDIT estabiliza/congela la simulación para edición precisa; INTERACT/PREVIEW reactiva Verlet, viento, gravedad y drag físico.
- Resize corregido para elementos rotados, handle de rotación y bloqueo de proporción para imagen/vídeo/logo.
- Lock real: una capa bloqueada no puede editarse ni reordenarse accidentalmente.
- Crop/Zoom operativos en Cover, Contain y Fill.
- Nombres de assets basados en fichero y miniaturas de imagen en Layers.
- Asset Library local reutilizable sobre IndexedDB; limpieza de Object URLs y blobs huérfanos cuando dejan de estar referenciados.
- Vídeo limitado aproximadamente a 30 actualizaciones de textura/s para reducir carga CPU/GPU.
- Background genérico: Solid Color, Paper preset o Transparent. El papel L.A.P.D. ya no es obligatorio.
- Brand Kit ampliado: múltiples logos, primary/secondary/accent/background y tipografía Heading/Body.
- Exportación diferenciada: `FABRIC PNG · VIEW` y `DESIGN PNG · EXACT` a 1080×1920, 1080×1080 o 1920×1080 según formato.
- Import + Export JSON.
- Autosave/recovery local.

## Funcionalidad de Phase 1 + 2 disponible

- Formatos: 9:16, 1:1 y 16:9.
- Multi-layer: múltiples imágenes, vídeos, logos y textos.
- Edición directa sobre la misma tela: seleccionar, mover, redimensionar y rotar.
- Layers: visibilidad, lock, reorder, up/down, duplicate y delete.
- Media: Cover/Contain/Fill, Crop X/Y, Zoom, Replace; vídeo Loop/Mute.
- Texto: contenido, fuente, peso, tamaño, color, alineación, line-height, tracking y sizing mode.
- Layouts: Free Canvas, Full Bleed, Hero 2/3 + 1/3, Hero + 3 Blocks, 50/50 vertical/horizontal, Grid 2×2 y Editorial Left/Right.
- Smart snapping/guides y alineación.
- Proyectos, templates, Brand Kit y biblioteca de assets local-first.
- Fabric presets y controles: wind, gravity, stiffness, elasticity, damping y weight.
- Undo/Redo.
- Export PNG y Project JSON / Import JSON.

## Checklist de validación visual humana — Gate de cierre

1. Abrir `review-v3.html` en Chrome desktop. Debe arrancar en blanco si no existe autosave de esta build.
2. En Templates, cargar `Built-in · L.A.P.D. Evidence` y confirmar que sigue disponible solo como preset opcional.
3. Crear un proyecto nuevo y añadir al menos 6 textos consecutivos. Confirmar que no nacen superpuestos.
4. Probar en un texto `Auto Fit`, `Auto Height`, `Fixed Frame`, tracking y un párrafo largo. Confirmar aviso de overflow cuando proceda.
5. Añadir 1 vídeo + 4 imágenes + 2 logos. Confirmar que son capas independientes, con nombre de fichero y sin nacer todas en el mismo punto.
6. Probar Cover / Contain / Fill, Crop X/Y y Zoom.
7. Asignar roles y probar `Hero + 3 Blocks`, `Hero 2/3 + 1/3`, Grid 2×2 y Editorial. Confirmar que no aparecen textos arbitrariamente fuera de la tela.
8. Cambiar 9:16 → 1:1 → 16:9. Confirmar que cambian textura, composición y geometría física.
9. Rotar un elemento, redimensionarlo desde los handles y probar `Lock aspect ratio`.
10. Bloquear una capa y confirmar que no puede editarse/reordenarse hasta desbloquearla.
11. En EDIT la tela debe quedar estable. En INTERACT / PREVIEW debe volver a reaccionar a grab, viento y física.
12. Guardar, abrir, duplicar, Undo/Redo y recargar navegador. Confirmar que proyecto, assets y background se recuperan sin cambiar de identidad.
13. Guardar un Brand Kit con varios logos y aplicar el kit.
14. Reutilizar un asset desde Asset Library sin volver a subirlo.
15. Exportar `DESIGN PNG · EXACT` y comprobar resolución nativa del formato. Exportar también `FABRIC PNG · VIEW`.
16. Exportar JSON e importarlo de nuevo.

## Boundary actual

La persistencia cloud con Supabase no se activa en esta rama porque no hay credenciales/proyecto/schema aportados. Phase 1 + 2 queda operativa en modo local-first con LocalStorage + IndexedDB; el almacenamiento remoto puede sustituir posteriormente este adapter sin cambiar la experiencia del editor.

**No mergear PR #1 hasta superar la revisión visual humana de este checklist.**
