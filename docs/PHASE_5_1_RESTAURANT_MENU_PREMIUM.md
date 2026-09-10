# BANDEROLAS PRO — Phase 5.1 · Restaurant Menu Premium

## Objective

Add a production-oriented **Restaurant Menu Premium · Editorial / Dark Fine Dining** document preset without creating another editor, sidebar, canvas, renderer or surface engine. The preset is composed with the existing BANDEROLAS layer model and appears inside the existing right-panel **Templates** section.

## What the preset creates

- 9:16 editorial menu under the demo identity **LUME**.
- Dark fine-dining art direction with ivory/gold typography and a generated non-textural editorial plate.
- Replaceable LUME logo layer.
- Hero audiovisual layer. The demo attempts to load a video already owned in `Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA`; if unavailable it falls back to a generated hero image instead of breaking the editor.
- Three curated food images from the same restaurant repository: Gamba roja salvaje, Atún rojo / naranja sanguina and Presa ibérica.
- Editable text layers for Chef Note, Platos de firma, Entrantes, Principales, Postres, Bodega/Cócteles and Reservas.
- Existing undo/history, layer selection, properties, brand controls, PNG/video/interactive delivery and surface selection remain the editor's responsibility; the preset does not fork those systems.

## Architecture boundary

Phase 5.1 is deliberately implemented in `src/presets/restaurant-menu-premium.js`. It does **not** edit `src/surfaces/`, does not create a new WebGL context, does not start another render loop and does not replace Classic Fabric or Paper 3D. It only prepares editor state and assets, then asks the existing compositor/UI to redraw.

Restaurant demo media is fetched in-browser, converted to Blob-backed assets, persisted through the editor's existing IndexedDB asset store and resolved through the existing runtime asset map. This avoids DOM media overlays on top of the WebGL creative.

## Human review gate

1. Open the immutable branch build or a static host that serves the branch.
2. Expand **Templates** in the existing right panel.
3. Press **APPLY PREMIUM MENU**.
4. Confirm the canvas switches to a complete 9:16 LUME menu and the hero media is visible/playing when browser codec policy permits it.
5. Select the hero, a signature dish, the logo and each menu text block from **Layers**; verify they remain individual editable layers.
6. Replace one image/video and edit one dish name + price; confirm the same canvas updates.
7. Switch between an already-supported surface and back; the menu content must remain the same project content.
8. Run an existing export path (PNG plus Interactive or Video) to ensure the preset does not bypass delivery.

## Automated static gate

```bash
node scripts/verify-phase5-1-restaurant-menu.mjs
```

The static gate checks boot wiring, required menu sections, editable media slots, absence of a competing render loop/direct WebGL mutation and JavaScript parse validity.

## Known validation boundary

Headless Chromium in the current automation environment cannot initialize the repository's WebGL/EGL path reliably. Static source validation can therefore guard architecture and syntax, but final WebGL motion/visual fidelity remains a normal-browser human review gate before merge.
