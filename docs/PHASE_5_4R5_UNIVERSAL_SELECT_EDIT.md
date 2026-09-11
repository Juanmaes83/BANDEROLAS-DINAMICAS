# Phase 5.4R5 — Universal Select & Edit

Human review showed that the previous MEDIA editor solved generic uploads but did not give the same clear editing path to every visible restaurant element.

## Product rule

Anything visible on the active document can be selected through the same `state.selectedId` path. The workspace then renders one contextual **Selected Element** inspector.

Primary workflow:

1. Switch to **EDIT CONTENT**.
2. Click a visible element on the document, or choose **SELECT ON DOCUMENT** from Restaurant Content / Layers.
3. Edit the same element from the contextual inspector.
4. Replace media without changing geometry.
5. Lock, hide, duplicate or delete according to the element capability policy.
6. Save and follow the existing red / amber / green project health state.

## Capability policy

Free user elements can be moved, resized, replaced, duplicated and deleted.

Structural restaurant elements remain fully selectable and customizable but use safe lifecycle rules:

- media such as Hero, Logo and Signature images can be replaced;
- template structure is hidden/reset rather than destructively deleted;
- structured dish/price/reservation text routes to Restaurant Content so the semantic menu model remains consistent;
- logo replacement propagates through the multipage document.

## Unified inspector

The inspector exposes, as applicable:

- X / Y / Width / Height
- Rotation / Opacity
- Replace image/video/logo
- Fit / Zoom / Crop X / Crop Y
- Text / Font / Weight / Size / Color / Alignment
- Loop / Mute for video
- Lock / Unlock
- Hide / Show
- Duplicate for free elements
- Delete for free elements
- Reset / Hide for structural elements

## Selection from the existing product

The implementation reuses the existing stable EDIT mode switch, `setSelected(id)`, Layers renderer, properties renderer, compositor, multipage persistence and physical surface. It adds selection shortcuts to Restaurant Content for Hero, Chef Note, Signature images, Menu Sections, Reservations, Logo and Claim.

Locked elements remain selectable from the document in edit mode so the user can unlock them from the same inspector.

## Architecture guard

- one visible editor;
- one active physical surface;
- no second canvas or WebGL context;
- no new requestAnimationFrame loop;
- no Verlet changes;
- no Paper / ThreeUI changes;
- no changes to the validated physical interaction path.

Keep PR #9 Draft until human browser validation.