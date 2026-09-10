# Phase 5.2 — Restaurant Menu Controls

## Objective

Turn the Phase 5.1R restaurant simulation into a practical document editor inside the existing BANDEROLAS right panel. Phase 5.2 does not create another editor or touch the validated Surface engines.

## Controls delivered

The new open **Restaurant Menu · Edit** section controls the same underlying `state.elements` created by the premium menu preset.

### Identity
- Restaurant name
- Claim
- Location
- Edition
- Regenerate logo + editorial plate

### Hero
- Replace with image or video
- Cover / contain / fill
- Opacity
- Zoom
- Overlay intensity

### Chef Note
- Editable title and body

### Signature dishes
Three editable signature dishes with name, description, price and replaceable dish image.

### Menu sections
Entrantes, Principales, Postres and Bodega/Cócteles expose:
- section title
- visible on/off
- dish name
- description
- price
- add dish
- delete dish
- move dish up/down

### Reservations
- phone
- web
- Instagram
- address

### Visual styles
- Dark Fine Dining
- Elegant Ivory
- Mediterranean Premium

Style changes regenerate only the document plate/logo and text styling. They do not alter Classic Fabric, Paper 3D, ThreeUI shaders, materials, physics or motion.

## Same editor / same layers

The controls write directly into the existing menu layer roles (`hero`, `menu-signature`, `menu-starters`, `menu-mains`, `menu-desserts`, `menu-drinks`, `cta`, etc.) and set the normal `state.needsTextureUpdate` flag. No second visible canvas, sidebar, WebGL context or render loop is created.

Dish editing selects the corresponding existing menu layer so advanced editing remains available in **Layers / Selected Element**. A **Sync from layers** action and a Selected Element listener refresh the structured menu controls after generic layer edits.

## Persistence

The structured `state.restaurantMenu` model is injected into the existing project snapshot/restore lifecycle so project history/save flows can carry the document controls without forking storage.

## Non-regression boundary

Phase 5.2 starts from Phase 5.1R, which itself starts from the validated 4.4R head. No `src/surfaces/` file is modified by Phase 5.2. The index continues loading every 4.4R Surface module with `?build=4.4r`.

## Human visual gate

1. Open the immutable preview with `?demo=restaurant`.
2. Confirm the premium LUME menu appears.
3. Open **Restaurant Menu · Edit**.
4. Change restaurant name, claim and location.
5. Change one Signature dish and one price.
6. Add one Entrante, reorder it and delete it.
7. Replace the hero with an image/video and replace one signature image.
8. Switch Dark → Ivory → Mediterranean.
9. Edit phone/web/Instagram/address.
10. Switch Paper Original → Japanese → Certificate → Site of the Year; the same menu content must survive.
11. Return to Classic and verify grab/stretch/release.

Do not merge until this visual gate passes in a normal browser.
