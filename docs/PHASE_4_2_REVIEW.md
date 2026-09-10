# PHASE 4.2 REVIEW — ThreeUI Source Lock + 3D Paper Original

Status: **IMPLEMENTED — pending human visual approval before merge**.

Branch: `feat/phase4-2-threeui-paper-original`

## What was implemented

1. The exact registered ThreeUI bundle is fetched from `https://threeui.com/source-code/3d-paper.json` on GitHub Actions.
2. Every required registered file is verified by SHA-256 before it is written to the repository.
3. The verified third-party files are stored unchanged under `vendor/threeui/3d-paper/`.
4. `vendor/threeui/3d-paper/SOURCE_LOCK.json` records source revision, byte counts and verified hashes.
5. `src/surfaces/paper3d-adapter.js` registers a second surface engine: `paper3d`.
6. The existing `Surface / 3D` selector now exposes `3D Paper / Original` after local source-lock preflight succeeds.
7. `Classic Fabric / Verlet` remains the protected fallback and can be restored immediately.
8. The Paper runtime uses the exact vendored ThreeUI HTML through `srcdoc`, matching the isolation model of the registered ThreeUI component. It does **not** embed the ThreeUI documentation page.

## Exact source lock

Required SHA-256 values:

- canonical `3d-paper.html`: `8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353`
- `3d-paper-site-of-the-year.html`: `fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d`
- `3d-paper-japanese.html`: `4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738`
- `3d-paper-certificate.html`: `0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32`
- `ThreeDPaper.tsx`: `c2c8d1e9a0baf69c9e477e270ccde0254d6270918c106b62dffb5c7931223b20`
- `threeui.css`: `efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf`

The source-lock workflow must fail rather than vendor a mismatching source.

## What to verify visually

1. Open the 4.2 review URL.
2. Leave `Classic Fabric / Verlet` selected and verify `grab → drag → stretch → release` still behaves exactly as the approved 4.1 build.
3. Open `Surface / 3D` and select `3D Paper / Original · verified`.
4. The Classic fabric should disappear visually and the exact 3D Paper Original runtime should occupy the same workspace area.
5. Drag the Paper directly. Verify its authored 3D rotation/inertial interaction.
6. Switch back to `Classic Fabric / Verlet`.
7. Verify the original fabric immediately returns and is still grabbable/stretchable.
8. Repeat `Classic ↔ 3D Paper` at least 5 times. There must still be only one application panel; no duplicated editor controls.
9. Save a project with Paper selected, reload/open it and confirm Paper is restored after source verification.
10. Export/import JSON and confirm `surface.engine = "paper3d"` and `surface.variant = "original"` survive the round trip.

## Deliberate boundary of 4.2

The exact ThreeUI Original artwork/content is expected to appear inside 3D Paper in this subphase. **BANDEROLAS user content is not injected into the Paper texture yet.** That is Subphase 4.3 — Dynamic CanvasTexture Adapter.

Japanese, Certificate and Site of the Year are already source-locked but are not enabled in the UI yet. They belong to 4.4.

Woven Cloth remains disabled until its own exact-source lock is completed in 4.5.

## Stability rule

4.2 does not replace the production Classic `render()`, Verlet constraints, requestAnimationFrame loop, pointer handlers or `grabbedParticle` route. When Paper is selected, Classic remains alive behind the Paper host rather than being destructively torn down. This favors reversibility and regression safety for this integration gate; lifecycle/performance tuning comes later after engine parity.

## Gate

4.2 is approved only when:

- source lock is green;
- Classic remains unchanged;
- 3D Paper Original is visually and interactively faithful;
- switching in both directions is reversible;
- project state persists the chosen engine;
- no second editor/sidebar is introduced.
