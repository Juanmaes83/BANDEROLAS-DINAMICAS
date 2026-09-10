# BANDEROLAS PRO — Phase 5.4A · Extended Restaurant Page

## Goal
Allow a restaurant menu page to grow vertically beyond the existing 9:16 sheet while preserving the same editor, same compositor, same Classic Fabric / Verlet skeleton, same 3D Paper stack and same restaurant content model.

## Scope
Phase 5.4A adds page-height presets inside `Document / Pages`:

- Standard · 9:16 · 1080×1920
- Tall · 9:24 · 1080×2880
- Long · 9:32 · 1080×3840
- Extra Long · 9:40 · 1080×4800
- Custom · 1080×1920–4800

`Extend Page` advances to the next preset. `Apply Height` applies the selected preset or custom height.

## Non-stretch rule
Extending a page does not scale the existing design vertically. Existing layer pixel dimensions and top offsets are preserved by reprojecting normalized coordinates to the new canvas height. The restaurant backdrop expands to the full new page and the reservations footer remains anchored to the bottom edge. The added area is real new document space available for additional content.

## Existing physical surfaces
No source file under `src/surfaces/` is modified. Phase 5.4A registers the new portrait aspect ratios in the existing format map and reuses the existing compositor and ratio-aware Classic cloth rebuild path. This means the validated Verlet algorithm, constraints, pointer-grab path, render loop and interaction code are not replaced.

3D Paper receives the same extended document texture through the existing Paper bridge. The exact ThreeUI vendor sources, Native Fidelity, Material, Motion and Variant logic are untouched. Human browser review remains authoritative for how very long pages read visually on Paper.

## Multipage behavior
Each page keeps its own `format` and `documentSize` metadata. A document can therefore contain, for example:

- Page 1 · Cover · 9:16
- Page 2 · Food · 9:32
- Page 3 · Desserts · 9:24
- Page 4 · Drinks · 9:16

Full duplication and layout duplication inherit page-size metadata because the existing page manager deep-clones the source page.

## Backdrop behavior
The active restaurant backdrop is regenerated at the active page's real width/height and persisted as an IndexedDB asset. This avoids vertically stretching the original 1080×1920 editorial plate. Style changes invalidate/regenerate the active page backdrop lazily.

## Persistence
The extension module registers custom dimensions before compositor/cloth restore, and adds a project-open wrapper that restores the serialized multipage `restaurantDocument` before activating its saved page. Undo/redo restores custom format dimensions before the existing snapshot restore runs.

## Explicit exclusions
Phase 5.4A does not implement:

- automatic pagination
- section splitting
- automatic dish reflow
- move-section-to-next-page
- infinite-height canvases
- new shaders, materials or Paper variants
- a second visible canvas/editor/sidebar

Those belong to later phases after human validation of variable-height pages.

## Human gate
1. Open the Restaurant demo.
2. Duplicate Page 1.
3. Set Page 2 to `Long · 9:32` and apply.
4. Confirm the existing design is not vertically stretched and that real empty space appears below it.
5. Move/add content into the new lower area.
6. Switch Page 1 ↔ Page 2 and confirm each page restores its own height.
7. Duplicate the long page and confirm the copy remains long.
8. Test a custom height between 1920 and 4800 px.
9. Save/open the project and confirm page heights persist.
10. Verify Classic Fabric interaction still works.
11. Verify 3D Paper still loads and `Variant` remains enabled with Original / Japanese / Certificate / Site of the Year.

Do not merge until the browser gate is accepted.
