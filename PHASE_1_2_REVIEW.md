# BANDEROLAS PRO — Phase 1 + Phase 2 review

Branch: `feat/pro-editor-phase1-phase2`

## Scope implemented

This branch evolves the existing BANDEROLAS-DINAMICAS editor. It does not create a second editor or a second sidebar.

- One WebGL cloth canvas + one right-side control panel.
- EDIT mode for selecting/moving/resizing composition elements directly on the same cloth.
- INTERACT/PREVIEW mode for physically grabbing/deforming the same cloth.
- Formats: 9:16, 1:1, 16:9. The cloth geometry, texture compositor and layout reflow adapt with the format.
- Multi-layer media: multiple images, multiple videos, independent logos, arbitrary text layers.
- Image/video/logo controls: position, size, rotation, opacity, cover/contain/fill, crop X/Y, zoom, replace. Video loop/mute.
- Text controls: content, font, weight, size, color, alignment, line-height, position, size, rotation, opacity.
- Layers: select, visibility, lock, reorder by drag/drop, up/down, duplicate, delete.
- Layouts: Free Canvas, Full Bleed, Hero 2/3 + 1/3, Hero + 3 Blocks, 50/50 vertical, 50/50 horizontal, Grid 2x2, Editorial Left, Editorial Right.
- Smart snapping/guides while moving elements.
- Alignment commands.
- Local project persistence with localStorage + IndexedDB for uploaded media blobs.
- Brand Kit: client name, primary/secondary colors, default font, saved logo reference, save/apply.
- Reusable templates: save current project as template and apply it to a new project.
- Fabric presets and controls: wind, gravity, stiffness, elasticity, damping, weight; Banner, Flag, Silk, Canvas, Paper and Soft Fabric presets.
- Undo/Redo.
- PNG export without editor selection guides and JSON project export.
- Responsive desktop/mobile panel layout.

## Manual visual review checklist

1. Open the review URL in Chrome desktop.
2. Confirm the initial L.A.P.D. creative appears on one dynamic cloth and the right panel is the only editor panel.
3. In EDIT mode, click a text layer directly on the cloth, drag it, resize from corner handles and modify typography/color/opacity in Selected Element.
4. Add an IMAGE, a VIDEO and a LOGO. Confirm all appear as independent layers.
5. For image/video, test Cover, Contain, Fill, Crop X/Y and Zoom.
6. Add at least 3 images and apply `Hero + 3 Blocks`.
7. Switch 9:16 -> 1:1 -> 16:9 and use Apply / Reflow Layout. Confirm both cloth geometry and composition ratio change.
8. Reorder, hide, lock, duplicate and delete layers.
9. Drag an element near center or another layer and confirm guides/snap appear.
10. Save project, reload/open it and confirm uploaded images/video/logo rehydrate from IndexedDB in the same browser.
11. Save a Brand Kit with a logo and apply it.
12. Save the project as a Template and apply it.
13. Change Fabric presets and sliders.
14. Switch to INTERACT / PREVIEW and physically grab the cloth with the mouse. Confirm all layers deform together as a single printed texture.
15. Export PNG and Project JSON.

## Important boundary

Cloud persistence through Supabase is intentionally not activated in this branch because no Supabase project URL / anon key / schema credentials were available in the execution context. The full visual/product workflow is functional local-first and the persistent asset model is already separated so cloud storage can replace the local adapter without redesigning the editor.
