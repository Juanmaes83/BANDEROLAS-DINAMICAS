# Phase 5.4R2 — Workspace Hardening

This corrective pass closes the gaps found during human review of 5.4R.

## Media is primary, not Advanced
CONTENT now exposes a visible MEDIA block with:
- + IMAGE
- + VIDEO
- UPLOAD LOGO
- REPLACE HERO
- Media Library

Uploaded files are persisted in the existing IndexedDB asset store. The Media Library scans all document pages, reports where each asset is used, exposes SAVED/MISSING state, lets an existing asset be reused on the active page or assigned to the selected media layer, and can delete catalogued assets that are no longer referenced.

Cloud media sync is **not** claimed: this build remains local-first. Portable Project and All Pages ZIP provide explicit backup/transfer paths.

## Optional dish images
Normal dishes in Menu Sections now receive an `Add dish image` action. The association is stored per page in `page.dishMedia` and an image layer is placed next to the corresponding section. It is therefore preserved by page duplication and multipage project serialization without being destroyed by the existing text parser.

## Variant ownership
The old hidden `surface-engine` / `surface-variant` nodes are replaced after boot to detach their historical listeners and MutationObserver ownership. They remain compatibility mirrors only.

The visible SURFACE controls are rebound to one hardening controller that updates `state.surface` and calls `surfaceManager.sync()` directly. Paper Variant uses exactly:
- Original
- Japanese
- Certificate
- Site of the Year

The controller verifies `state.surface.variant`, `surfaceManager.activeId` and `BanderolasPaper3D.adapter.currentVariant` against each other. Classic never exposes a Variant field.

## Complete multipage persistence
Portable Project now explicitly saves:
- `restaurantDocument` including every page
- page-specific `elements`
- page-specific restaurant models
- page-specific `dishMedia`
- surface state
- all referenced media blobs from **all pages** as embedded data URLs
- asset catalogue metadata

Import restores every embedded Blob into IndexedDB and rebuilds the active page, compositor, physical cloth geometry and active surface.

## Extended formats in interactive delivery
The previously generated interactive HTML is captured from the validated production exporter and patched before delivery so its format table supports:
- 9:16
- 9:24
- 9:32
- 9:40
- 9:custom
- 1:1
- 16:9

No replacement fabric physics engine is introduced.

## All Pages ZIP
The new package export walks every document page on the existing single physical surface and stores:
- self-contained interactive HTML for each page
- rendered PNG for each page
- `index.html` page navigator
- `project-portable.json`
- original media from every page
- README

The active page is restored after packaging.

## Health guide hardening
Traffic lights now additionally detect:
- referenced media missing from IndexedDB -> RED
- unsaved changes after a previous Save -> OUTPUT AMBER
- Paper state/runtime Variant mismatch -> SURFACE RED/AMBER
- correctly persisted media -> CONTENT/OUTPUT can return GREEN

## Architecture guard
- One visible editor and one active physical surface remain.
- No additional WebGL context.
- No additional RAF/render loop.
- No replacement Verlet solver.
- No vendored ThreeUI source edit.
- Existing Advanced controls remain available.
