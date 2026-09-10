# Phase 5.1R — Restaurant Menu Premium on Phase 4.4R

## Correction

The first Phase 5.1 branch started from `main`, while Phase 4.4R Native Fidelity was still an unmerged review branch. That meant the Restaurant Menu preview unintentionally regressed the visually distinct Paper styles.

This corrected branch starts **exactly from Phase 4.4R head `047dd60a6315861e402f1098b703fa5eb90fb195`** and adds only the Restaurant Menu product layer on top.

## Non-regression rule

Phase 5.1R does not edit any file under `src/surfaces/`. Original, Japanese, Certificate and Site of the Year remain exactly as implemented in Phase 4.4R, including native artwork/material/motion controls and the Native Fidelity bridge.

## Restaurant Menu Premium

The same right panel now contains an open `Restaurant Menu Premium` section with a prominent `APPLY PREMIUM RESTAURANT MENU` action. The preset builds a 9:16 LUME fine-dining menu using the existing layer system: generated editorial plate and logo, one owned restaurant video, three owned food images, Chef Note, Signature Dishes, Entrantes, Principales, Postres, Bodega/Cócteles and Reservas.

All content remains editable through the existing Layers / Selected Element controls. No second editor, sidebar, visible canvas, WebGL context or render loop is introduced.

## Human review

Use `?demo=restaurant` on the immutable preview URL to auto-apply the menu. Verify the menu first, then switch Surface / 3D through Original, Japanese, Certificate and Site of the Year. The same menu creative must remain while the distinct Phase 4.4R Paper identity changes. Finally return to Classic and verify grab/stretch/release.
