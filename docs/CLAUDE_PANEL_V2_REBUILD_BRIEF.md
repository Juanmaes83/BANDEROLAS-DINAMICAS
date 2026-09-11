# CLAUDE BRIEF — BANDEROLAS PRO Panel V2 Rebuild

## Context

This branch is a SAFE CLONE of PR #9 HEAD `c6abcd94b1d427f542cf624a91f15bde9f055b6b`.

Protected branches / commits:
- `main` currently contains the validated stable product after PR #8 merge.
- `backup/pr9-r7-before-claude-c6abcd94` is an immutable safety branch from the current PR #9 R7 state.
- Work ONLY on this branch: `claude/panel-v2-clean-clone-from-pr9-r7`.

Do not merge. Do not force push. Do not rewrite history. Deliver a preview URL and a clear human review checklist.

## Product goal

The app must feel like ONE professional design tool, not a pile of patches.

Final user flow:

1. User opens app.
2. Top bar is always visible: `EDIT CONTENT | FABRIC / INTERACT | SAVE STATUS | SAVE`.
3. In `EDIT CONTENT`, user clicks any visible object on the document.
4. Right panel shows one clear inspector for that object.
5. User can add, replace, move, resize, crop, hide/delete, lock/unlock, and save.
6. In `FABRIC / INTERACT`, editor fields disappear and the user only sees physical interaction guidance.
7. Classic Fabric must still do grab → stretch → deform → release.
8. Paper 3D must still show all four Variants: Original, Japanese, Certificate, Site of the Year.

## Hard rule

STOP stacking UI patches. Create a single visible panel owner.

Currently too many files compete for `#ui-panel`:
- `src/workspace-cleanup.js`
- `src/workspace-hardening.js`
- `src/workspace-media-placement-controls.js`
- `src/workspace-universal-element-editor.js`
- `src/workspace-single-ui-owner.js`

They move DOM nodes, hide nodes, mirror hidden controls, and install MutationObservers. This is the root UX problem.

## Required architecture

Create one new UI owner, for example:

`src/workspace-panel-v2.js`

It must be the only visible layout authority for the right panel.

Allowed service modules:
- Restaurant model / controls may provide data and functions, but should not decide main panel layout.
- Hardening may provide asset/export/persistence functions, but should not inject visible primary UI.
- Surface manager remains unchanged.
- Classic/Paper engines remain unchanged.

Remove from `index.html` any obsolete visible workspace owners that fight Panel V2. Keep engine/compositor/preset scripts intact.

## Panel V2 target layout

```text
TOP BAR — sticky
[ EDIT CONTENT ] [ FABRIC / INTERACT ]
● SAVED / ● UNSAVED / ● MISSING MEDIA      [ SAVE ]

GUIDE LIGHTS
1 DOCUMENT   2 CONTENT   3 DESIGN   4 SURFACE   5 OUTPUT
red / amber / green, clickable

1 DOCUMENT
- Page filmstrip with thumbnails
- New / Duplicate / Delete
- Page name
- Size: 9:16, 9:24, 9:32, 9:40, 1:1, 16:9, Custom
- Layout

2 CONTENT
- ADD: + Image, + Video, + Text, + Logo
- SELECTED ELEMENT inspector
- Secondary drawers:
  - Restaurant Data
  - Assets / Media
  - Layers Advanced

3 DESIGN
- Style preset
- Logo / brand / background actions
- Advanced brand/template controls

4 SURFACE
- Engine: Classic Fabric / 3D Paper
- If Classic: fabric preset, grip, reset fabric
- If Paper: Variant, Content Mode, Material, Motion

5 OUTPUT
- Save / Open / New
- Undo / Redo
- PNG / Portable Project / Import / Interactive HTML / All Pages ZIP
```

## Critical UX requirements

### Edit vs Interact

When `state.mode === 'interact'`:
- Hide the content inspector fields.
- Show one interaction card:
  `FABRIC / INTERACT ACTIVE — grab and deform the physical surface. Switch to EDIT CONTENT to edit elements.`
- No X/Y/Width/Height/Replace/Crop inputs should look active.

When `state.mode === 'edit'`:
- Show the content inspector.
- Click on canvas selects visible element.
- Selected element has visible handles / feedback.

### Universal selection

Everything visible should be selectable:
- Hero
- Logo
- Signature dish images
- Free images/videos/logos/text
- Simple text
- Structured text sections

Structured restaurant text must not be destroyed as raw text. It should show a button to edit Restaurant Data.

### Element capabilities

Use capabilities, not role exclusions:
- free media: replace, move, resize, duplicate, delete
- structural media/text: replace/move/resize where safe, hide/reset instead of destructive delete
- locked items remain selectable, but cannot be dragged until unlocked

### Media

Media must be easy and visual:
- `+ Image`, `+ Video`, `+ Logo` visible in Content
- Replace selected media visible in inspector
- Assets drawer shows saved/missing/unused media
- Delete unused asset only deletes the asset from library, not page instances
- Portable Project must include all pages and all referenced assets

### Pages

Duplicate must be obvious:
- Filmstrip must show Page 1, Page 2, etc.
- Active page highlighted
- One active physical surface only

### Variant

There must be ONE visible Variant owner in Surface.
Classic should not show Variant.
Paper should show four variants and they must remain distinct.
Do not modify ThreeUI vendor files.

## Do not touch

Do NOT rewrite:
- Classic Verlet physics
- grab/stretch/release implementation
- render loop / RAF
- ThreeUI vendor source
- Paper Native Fidelity source unless absolutely required
- core compositor unless needed for bug fix

## Existing working pieces to preserve

- Restaurant menu preset
- Multipage document model
- Extended page sizes
- Media IndexedDB storage
- Portable Project / All Pages ZIP concepts
- Universal capabilities concept
- Red/amber/green guide concept

## Acceptance checklist

A human must verify:

1. Right panel shows only one top sticky bar.
2. Five steps are understandable.
3. CONTENT starts with ADD + Selected Element inspector.
4. Restaurant Data opens and shows real controls.
5. Assets opens and shows real media library.
6. Layers Advanced opens and shows legacy precision tools.
7. Clicking Hero/Logo/Signature/Text/free media updates the same inspector.
8. Interact mode hides editing inputs and only shows physical interaction card.
9. Classic Fabric still grabs/stretches/deforms/releases.
10. Paper Variant cycles Original/Japanese/Certificate/Site of the Year correctly.
11. Duplicate page is visible in filmstrip.
12. Long page sizes still work.
13. Save status changes amber/green correctly.
14. Portable Project and All Pages ZIP include all pages/assets.

## Delivery

When complete, deliver:
- Branch name
- HEAD SHA
- immutable raw.githack preview URL
- PR or comparison URL
- what changed
- what to review
- known risks

Do not claim visual WebGL validation from CI. Browser human review is final.
