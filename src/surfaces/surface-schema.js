'use strict';
(() => {
  const VERSION = 4;

  const PAPER_VARIANTS = Object.freeze(['original','japanese','certificate','site-of-the-year']);
  const PAPER_CONTENT_MODES = Object.freeze(['native-content','native-layout','full-bleed']);
  const PAPER_NATIVE_PRESETS = Object.freeze({
    original: Object.freeze({roughness:0.06, clearcoat:1.0, reflection:0.575, specular:1.0, iridescence:0.10, ior:1.50}),
    japanese: Object.freeze({roughness:0.30, clearcoat:0.62, reflection:0.31, specular:0.75, iridescence:0.82, ior:1.62}),
    certificate: Object.freeze({roughness:0.86, clearcoat:0.0, reflection:0.08, specular:0.30, iridescence:0.0, ior:1.50}),
    'site-of-the-year': Object.freeze({roughness:0.17, clearcoat:1.0, reflection:0.36, specular:1.0, iridescence:0.0, ior:1.50})
  });

  const CLASSIC_DEFAULT = Object.freeze({
    schemaVersion: VERSION,
    engine: 'classic',
    variant: 'default',
    content: Object.freeze({mode:'full-bleed', opacity:1, safeInset:0}),
    material: Object.freeze({
      preset: 'fabric', opacity:1, transparency:0, translucency:0,
      roughness:0.72, reflection:0.08, depth:0.18, clearcoat:0,
      iridescence:0, ior:1.5, specular:0.25, backlight:0,
      perspective:0.5, lightIntensity:1, lightX:0, lightY:0
    }),
    motion: Object.freeze({profile:'classic', intensity:1, idle:1, inertia:0, tilt:1, float:1}),
    interaction: Object.freeze({gripRadius:80, sensitivity:1})
  });

  const PAPER_DEFAULT = Object.freeze({
    schemaVersion: VERSION,
    engine: 'paper3d',
    variant: 'original',
    content: Object.freeze({mode:'native-layout', opacity:1, safeInset:0.08}),
    material: Object.freeze({
      preset:'native', opacity:1, transparency:0, translucency:0,
      roughness:0.06, reflection:0.575, depth:0.55, clearcoat:1,
      iridescence:0.10, ior:1.5, specular:1, backlight:0,
      perspective:0.5, lightIntensity:1, lightX:0, lightY:0
    }),
    motion: Object.freeze({profile:'native', intensity:1, idle:1, inertia:0, tilt:1, float:1}),
    interaction: Object.freeze({gripRadius:80, sensitivity:1})
  });

  const DEFAULT_SURFACE = CLASSIC_DEFAULT;
  const FEATURE_FLAGS = Object.freeze({classic:true, paper3d:true, woven:false});

  const clone = value => JSON.parse(JSON.stringify(value));
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const str = (value, fallback) => typeof value === 'string' && value ? value : fallback;

  function paperNative(variant='original'){
    const key = PAPER_VARIANTS.includes(variant) ? variant : 'original';
    return clone(PAPER_NATIVE_PRESETS[key]);
  }

  function defaultForEngine(engine='classic', variant){
    if(engine !== 'paper3d') return clone(CLASSIC_DEFAULT);
    const out = clone(PAPER_DEFAULT);
    out.variant = PAPER_VARIANTS.includes(variant) ? variant : 'original';
    Object.assign(out.material, paperNative(out.variant));
    return out;
  }

  function normalize(input = {}) {
    const src = input && typeof input === 'object' ? input : {};
    const requestedEngine = typeof src.engine === 'string' ? src.engine : 'classic';
    const engine = FEATURE_FLAGS[requestedEngine] ? requestedEngine : 'classic';
    const requestedVariant = str(src.variant, engine === 'paper3d' ? 'original' : 'default');
    const variant = engine === 'paper3d'
      ? (PAPER_VARIANTS.includes(requestedVariant) ? requestedVariant : 'original')
      : 'default';
    const base = defaultForEngine(engine, variant);

    const legacyPaper = engine === 'paper3d' &&
      (finite(src.schemaVersion, 0) < 3 || src.material?.preset === 'fabric');
    const materialSrc = legacyPaper ? {} : (src.material || {});
    const motionSrc = legacyPaper ? {} : (src.motion || {});
    const contentSrc = src.content || {};
    const requestedMode = str(contentSrc.mode, base.content.mode);

    return {
      schemaVersion: VERSION,
      engine,
      variant,
      content: {
        ...base.content,
        ...contentSrc,
        mode: engine === 'paper3d' && PAPER_CONTENT_MODES.includes(requestedMode) ? requestedMode : base.content.mode,
        opacity: clamp(finite(contentSrc.opacity, base.content.opacity), 0, 1),
        safeInset: clamp(finite(contentSrc.safeInset, base.content.safeInset), 0, 0.24)
      },
      material: {
        ...base.material,
        ...materialSrc,
        preset: str(materialSrc.preset, base.material.preset),
        opacity: clamp(finite(materialSrc.opacity, base.material.opacity), 0.05, 1),
        transparency: clamp(finite(materialSrc.transparency, base.material.transparency), 0, 1),
        translucency: clamp(finite(materialSrc.translucency, base.material.translucency), 0, 1),
        roughness: clamp(finite(materialSrc.roughness, base.material.roughness), 0.02, 1),
        reflection: clamp(finite(materialSrc.reflection, base.material.reflection), 0, 1),
        depth: clamp(finite(materialSrc.depth, base.material.depth), 0, 1),
        clearcoat: clamp(finite(materialSrc.clearcoat, base.material.clearcoat), 0, 1),
        iridescence: clamp(finite(materialSrc.iridescence, base.material.iridescence), 0, 1),
        ior: clamp(finite(materialSrc.ior, base.material.ior), 1, 2.33),
        specular: clamp(finite(materialSrc.specular, base.material.specular), 0, 1),
        backlight: clamp(finite(materialSrc.backlight, base.material.backlight), 0, 1),
        perspective: clamp(finite(materialSrc.perspective, base.material.perspective), 0, 1),
        lightIntensity: clamp(finite(materialSrc.lightIntensity, base.material.lightIntensity), 0.2, 2),
        lightX: clamp(finite(materialSrc.lightX, base.material.lightX), -1, 1),
        lightY: clamp(finite(materialSrc.lightY, base.material.lightY), -1, 1)
      },
      motion: {
        ...base.motion,
        ...motionSrc,
        profile: str(motionSrc.profile, base.motion.profile),
        intensity: clamp(finite(motionSrc.intensity, base.motion.intensity), 0, 2),
        idle: clamp(finite(motionSrc.idle, base.motion.idle), 0, 2),
        inertia: clamp(finite(motionSrc.inertia, base.motion.inertia), 0, 1),
        tilt: clamp(finite(motionSrc.tilt, base.motion.tilt), 0, 2),
        float: clamp(finite(motionSrc.float, base.motion.float), 0, 2)
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
    VERSION, DEFAULT_SURFACE, CLASSIC_DEFAULT, PAPER_DEFAULT,
    PAPER_VARIANTS, PAPER_CONTENT_MODES, PAPER_NATIVE_PRESETS, FEATURE_FLAGS,
    normalize, clone, defaultForEngine, paperNative
  });
})();
