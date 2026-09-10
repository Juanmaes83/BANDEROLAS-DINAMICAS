'use strict';
(() => {
  const VERSION = 1;
  const DEFAULT_SURFACE = Object.freeze({
    schemaVersion: VERSION,
    engine: 'classic',
    variant: 'default',
    material: Object.freeze({
      preset: 'fabric',
      opacity: 1,
      transparency: 0,
      translucency: 0,
      roughness: 0.72,
      reflection: 0.08,
      depth: 0.18
    }),
    motion: Object.freeze({
      profile: 'classic',
      intensity: 1,
      idle: 1,
      inertia: 0
    }),
    interaction: Object.freeze({
      gripRadius: 80,
      sensitivity: 1
    })
  });

  const FEATURE_FLAGS = Object.freeze({
    classic: true,
    paper3d: false,
    woven: false
  });

  const clone = value => JSON.parse(JSON.stringify(value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function normalize(input = {}) {
    const base = clone(DEFAULT_SURFACE);
    const src = input && typeof input === 'object' ? input : {};
    const requestedEngine = typeof src.engine === 'string' ? src.engine : base.engine;
    const engine = FEATURE_FLAGS[requestedEngine] ? requestedEngine : 'classic';

    return {
      schemaVersion: VERSION,
      engine,
      variant: typeof src.variant === 'string' && src.variant ? src.variant : 'default',
      material: {
        ...base.material,
        ...(src.material || {}),
        opacity: clamp(finite(src.material?.opacity, base.material.opacity), 0, 1),
        transparency: clamp(finite(src.material?.transparency, base.material.transparency), 0, 1),
        translucency: clamp(finite(src.material?.translucency, base.material.translucency), 0, 1),
        roughness: clamp(finite(src.material?.roughness, base.material.roughness), 0, 1),
        reflection: clamp(finite(src.material?.reflection, base.material.reflection), 0, 1),
        depth: clamp(finite(src.material?.depth, base.material.depth), 0, 1)
      },
      motion: {
        ...base.motion,
        ...(src.motion || {}),
        intensity: clamp(finite(src.motion?.intensity, base.motion.intensity), 0, 2),
        idle: clamp(finite(src.motion?.idle, base.motion.idle), 0, 2),
        inertia: clamp(finite(src.motion?.inertia, base.motion.inertia), 0, 1)
      },
      interaction: {
        ...base.interaction,
        ...(src.interaction || {}),
        gripRadius: clamp(finite(src.interaction?.gripRadius, base.interaction.gripRadius), 40, 140),
        sensitivity: clamp(finite(src.interaction?.sensitivity, base.interaction.sensitivity), 0.25, 2)
      }
    };
  }

  window.BanderolasSurfaceSchema = Object.freeze({
    VERSION,
    DEFAULT_SURFACE,
    FEATURE_FLAGS,
    normalize,
    clone
  });
})();
