# Phase 5.3 — Restaurant Menu Multipage on one physical surface

## Objective

Extend Restaurant Menu from one card into a real multipage restaurant document without creating a second editor and without replacing the physical / 3D presentation layer.

The architectural rule is strict:

`Restaurant Menu controls → active page elements → existing compositor / texCanvas → same active physical surface`.

Pages are content states, not separate renderers. Classic Fabric keeps its grab / drag / stretch / deform / release behaviour. Paper 3D keeps its current Native Fidelity, variants, materials and motion. Page navigation never calls `surfaceManager.use()` and Phase 5.3 modifies no file under `src/surfaces/`.

## Document model

`state.restaurantDocument` stores:

- document schema version;
- mode `single-physical-sheet`;
- active page id;
- global restaurant data;
- ordered pages.

Each page stores its own `format`, `layout`, `elements` and `restaurantMenu` model. The active page is projected into the existing `state.elements`; switching page therefore changes the content texture while keeping the same physical / 3D skeleton.

## Page manager

A new open `Document / Pages` section appears in the existing right panel, above `Restaurant Menu · Edit`.

Available actions:

- Previous / Next page;
- direct page selector;
- rename page;
- page format using the currently supported 9:16, 1:1 and 16:9 formats;
- Add Page;
- Duplicate Full;
- Duplicate Layout;
- Delete Page;
- Move Up / Move Down.

`Duplicate Full` copies the current page content and layout with new element ids. `Duplicate Layout` preserves the visual structure but resets page-specific restaurant copy to editable placeholders.

## Global vs page-specific data

Global across pages:

- restaurant name;
- claim;
- location;
- visual style;
- reservations;
- logo asset;
- editorial plate asset.

Page-specific:

- page name and format;
- hero media;
- Chef Note body;
- signature dishes;
- menu sections;
- dish descriptions and prices.

When a global field changes in `Restaurant Menu · Edit`, the document manager captures it and applies it when any page becomes active.

## Persistence

Phase 5.3 wraps the existing snapshot / restore and project serialization lifecycle so the page collection travels with Undo / Redo and saved project data. Page activation hydrates the selected page media through the existing IndexedDB/runtime asset pipeline.

## Physical-surface non-regression

The page manager does not:

- create a canvas;
- create a WebGL context;
- start a render loop;
- modify `src/surfaces/`;
- switch or recreate the active surface engine.

During page activation the existing `state.surface` value is guarded and restored unchanged. Only content, format and document data are swapped.

## Scope boundary

Phase 5.3 implements multipage content on one physical sheet. Arbitrarily long physical sheets such as 9:24 / 9:32 are deliberately not added here because changing the physical aspect ratio beyond the existing format system would require a separate geometry / surface decision. That work must not be hidden inside a document feature.

## Human visual gate

1. Open the immutable branch preview with `?demo=restaurant`.
2. Confirm `Document / Pages` and `Restaurant Menu · Edit` are both visible in the same panel.
3. Duplicate the current page, rename it `Principales`, change dishes and hero.
4. Navigate Page 1 ↔ Page 2 and verify the content changes while the active surface remains the same.
5. In Classic, enter Interact and verify grab / stretch / release before and after page navigation.
6. In Paper 3D, compare Original / Japanese / Certificate / Site of the Year and navigate pages without losing the current Paper engine.
7. Save / reload a project and verify page count/order/content persist.

Do not merge until normal-browser human validation confirms the physical-surface gate.
