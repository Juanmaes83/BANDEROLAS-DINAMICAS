# Physics decision — BANDEROLAS PRO

## Production engine

Production keeps the current WebGL + CPU Verlet implementation because it is already visually validated in the editor and in the interactive artifact. The key invariant is that every feature around the creative editor must preserve the same `grabbedParticle -> constraints -> release/recovery` path.

## Breeze reference

`Juanmaes83/breeze` remains a high-value reference, but it is not dropped directly into production. Breeze uses Three.js WebGPU/TSL compute, a spring/vertex force pipeline, configurable stiffness/friction, a target of 360 simulation steps per second and a separate smoothed-position pass. That is attractive for stability and high-density cloth, but it also changes the renderer/runtime requirements and would create unnecessary regression risk if transplanted wholesale.

## A/B strategy

`labs/physics-ab.html` isolates two behaviors:

- A: current validated feel.
- B: Breeze-inspired higher substep rate + smoothing.

No A/B code is imported by the production editor.

## Production-safe improvement

The only interaction parameter added to production in this closure is `Grip radius` (40–140 px). It changes hit tolerance only; it does not replace the Verlet integrator, render loop, constraints or cloth topology.

## Migration rule

A future GPU/Breeze migration is allowed only if a visual A/B test proves a clear improvement in at least three of these areas without degrading the others: grab response, stretch quality, recovery, fold stability, video-texture performance, mobile/touch performance, and FPS. Until then, the current engine is the production source of truth.