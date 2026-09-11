# Phase 5.4R — Guided Workspace Cleanup

## Goal
Reduce panel chaos without removing capability. BANDEROLAS PRO keeps the same compositor, Restaurant document model, Classic Fabric/Verlet and Paper 3D engines, but exposes them through five user-facing steps:

1. **DOCUMENT** — pages, page filmstrip, duplicate/new/delete/reorder, one unified Size control and Layout.
2. **CONTENT** — restaurant identity, hero, Chef Note, dishes, prices, reservations, plus collapsed advanced layer editing.
3. **DESIGN** — visual style, logo/editorial plate, brand kit and templates.
4. **SURFACE** — Classic vs Paper; contextual Fabric or Paper controls. Paper Variant is a single visible control.
5. **OUTPUT** — save/open/new, undo/redo, PNG/JSON, with production/delivery/export in Advanced.

## Traffic-light guide
Each step has a live state:
- **RED / FIX** — a required state is invalid or missing.
- **AMBER / CHECK** — usable but incomplete or not yet saved.
- **GREEN / READY** — the step is valid for final review.

The top Guide shows all five lights at once and points to the next non-green step. This is guidance, not a wizard lock: advanced users can open any step at any time.

## Pages / Duplicate
Duplicate remains one physical-surface architecture. Multiple pages are now visible at the same time in a horizontal filmstrip. The active page is highlighted; clicking another card swaps content on the same physical surface. `Duplicate` immediately adds the new card so the operation is visually obvious. Thumbnails are lightweight session previews; project persistence remains the existing page/document model.

## Unified size
The user sees one **Size** selector in DOCUMENT:
- Portrait · Standard 9:16
- Portrait · Tall 9:24
- Portrait · Long 9:32
- Portrait · Extra 9:40
- Square · 1:1
- Landscape · 16:9
- Portrait · Custom height

The earlier separate Format/Layout and Extended Page controls remain internal compatibility controls and are hidden from the primary workspace. Existing 5.4A extended-page behavior is reused.

## Variant ownership
The user-facing Variant control lives only in SURFACE when Engine = 3D Paper. It calls `BanderolasPaperStudio.changeVariant()` directly and exposes exactly:
- Original
- Japanese
- Certificate
- Site of the Year

Legacy engine/variant DOM fields remain hidden for compatibility with the validated adapters. Classic never shows a Variant control. Surface health turns RED if Paper state has an invalid variant or engine/manager mismatch.

## Complexity strategy
Primary controls are visible. Detailed layers, selected-element transforms, Brand Kit internals, Paper material/motion sliders, production and delivery remain available under **Advanced** sections. No capability is deleted.

## Architecture guard
Phase 5.4R adds no second visible editor, no second visible canvas, no WebGL context, no RAF/render loop and no `surfaceManager.use()` call. It does not modify vendored ThreeUI sources or the validated Verlet solver.

## Human gate
1. Duplicate Page 1 and confirm Page 1 + Page 2 are visible together in the filmstrip.
2. Click each page card and confirm only the active page is sent to the physical surface.
3. Change Page 2 Size to Long 9:32 from DOCUMENT and confirm size/format controls are no longer split across distant sections.
4. Switch Surface Classic → Paper and confirm Variant appears only for Paper.
5. Test Original → Japanese → Certificate → Site of the Year → Classic → Paper.
6. Confirm the five guide lights update RED/AMBER/GREEN and identify incomplete steps.
7. Open Advanced sections and confirm previous editing/personalization controls still exist.
8. Verify Classic grab/stretch/release and Paper Native Fidelity remain visually correct.
