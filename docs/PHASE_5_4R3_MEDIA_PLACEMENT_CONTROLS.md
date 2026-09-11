# Phase 5.4R3 — Placed Media Controls

Human review found a UX gap: MEDIA let users add content, but direct replacement/removal of the placed page element was not obvious.

## Fix

CONTENT now includes **MEDIA ON THIS PAGE** for generic user-added image/video/logo elements. Every placed media item exposes:

- **SELECT** — selects the existing element in the editor.
- **REPLACE FILE** — uploads a replacement asset into the existing IndexedDB store and swaps only that placed element.
- **REMOVE FROM PAGE** — removes the element from the active page while keeping the underlying asset in Media Library as unused, so it can be reused or deleted deliberately later.

This intentionally separates **placement lifecycle** from **asset lifecycle**. Removing an element from one page never silently destroys an asset that may be used elsewhere.

Protected restaurant structure media (Hero, Logo, Backdrop, dish media) keep their purpose-specific controls and are not made generically removable by this panel.

## Architecture guard

- Same active compositor and physical surface.
- No second canvas/WebGL context.
- No new requestAnimationFrame loop.
- No Verlet or Paper source changes.
- Active multipage state is saved through the existing Restaurant Pages API after replacement/removal.
