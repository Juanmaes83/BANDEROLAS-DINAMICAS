'use strict';
(() => {
  const FN_START = 'function makeCertTexture(){';
  const FN_END_MARKER = '\n\n/* ======================================================================';
  const SHEET_MARKER = 'window.__sheet = {group, mat, uni, renderer, scene, camera, mesh,';

  function replaceRequired(source, search, replacement, label){
    if(!source.includes(search)) throw new Error(`ThreeDPaper runtime marker missing: ${label}`);
    return source.replace(search, replacement);
  }

  function buildRuntimeSource(source, options={}){
    if(typeof source !== 'string' || !source.includes(FN_START)){
      throw new Error('ThreeDPaper makeCertTexture marker not found');
    }

    let out = source;
    // Variant backgrounds are authored demo art, not engine geometry/material.
    // Hide them only in the derived runtime. Immutable vendor files stay untouched.
    out = out.replace(/<div id="bg"[\s\S]*?<\/div>/, '<div id="bg" aria-hidden="true" style="display:none!important"></div>');

    const start = out.indexOf(FN_START);
    const end = out.indexOf(FN_END_MARKER, start);
    if(start < 0 || end < 0) throw new Error('ThreeDPaper texture function boundary not found');

    const fn = `function makeCertTexture(){
  const c = document.createElement('canvas'); c.width=TW; c.height=TH;
  const ctx = c.getContext('2d', {alpha:true});
  ctx.clearRect(0,0,TW,TH);
  const t = new T.CanvasTexture(c);
  t.encoding = T.sRGBEncoding; t.anisotropy = 8; t.needsUpdate = true;

  window.__bpPaperTextureSinks = window.__bpPaperTextureSinks || [];
  window.__bpPaperTextureSinks.push({canvas:c,ctx,tex:t});

  const drawCover = (sink, image) => {
    const w = image.width || image.videoWidth || TW;
    const h = image.height || image.videoHeight || TH;
    const scale = Math.max(sink.canvas.width / Math.max(1,w), sink.canvas.height / Math.max(1,h));
    const sw = sink.canvas.width / scale;
    const sh = sink.canvas.height / scale;
    const sx = Math.max(0,(w-sw)/2);
    const sy = Math.max(0,(h-sh)/2);
    sink.ctx.clearRect(0,0,sink.canvas.width,sink.canvas.height);
    sink.ctx.drawImage(image,sx,sy,sw,sh,0,0,sink.canvas.width,sink.canvas.height);
    sink.tex.needsUpdate = true;
  };

  if(!window.__bpPaperBridgeInstalled){
    window.__bpPaperBridgeInstalled = true;
    window.addEventListener('message', (ev) => {
      const d = ev.data || {};
      if(d.type !== 'banderolas:paper-texture') return;
      const sinks = window.__bpPaperTextureSinks || [];
      const done = () => {
        try{ parent.postMessage({type:'banderolas:paper-texture-applied',seq:d.seq||0}, '*'); }catch(_){}
      };
      if(d.bitmap){
        sinks.forEach(s => drawCover(s,d.bitmap));
        try{ d.bitmap.close && d.bitmap.close(); }catch(_){}
        done();
      } else if(d.dataURL){
        const im = new Image();
        im.onload = () => { sinks.forEach(s => drawCover(s,im)); done(); };
        im.src = d.dataURL;
      }
    });
    try{ parent.postMessage({type:'banderolas:paper-ready'}, '*'); }catch(_){}
  }
  return t;
}`;

    out = out.slice(0,start) + fn + out.slice(end);
    out = out.replace(/<div id="hint"[\s\S]*?<\/div>/, '');

    // Preserve the authored frame loop while exposing normalized BANDEROLAS motion controls.
    out = replaceRequired(out, 'dragYaw   += dx*0.0060;', 'dragYaw   += dx*0.0060*(window.__bpPaperPointerSensitivity ?? 1);', 'drag yaw sensitivity');
    out = replaceRequired(out, 'dragPitch  = clamp(dragPitch - dy*0.0045, -0.60, 0.60);', 'dragPitch  = clamp(dragPitch - dy*0.0045*(window.__bpPaperPointerSensitivity ?? 1), -0.60, 0.60);', 'drag pitch sensitivity');
    out = replaceRequired(out, 'const decay = Math.pow(0.018, dt);', 'const decay = Math.pow(window.__bpPaperInertiaBase ?? 0.018, dt);', 'inertia decay');
    out = replaceRequired(out, 'mat.opacity = intro;', 'mat.opacity = intro * (window.__bpPaperEffectiveOpacity ?? 1);', 'material opacity');

    const motionBlock = `  const idle = REDUCED ? 0 : 1;
  const rise = 1 - intro;
  group.rotation.y = dragYaw + mouse.x*0.16 + Math.sin(t*0.23)*0.045*idle;
  group.rotation.x = dragPitch - mouse.y*0.11 + Math.sin(t*0.19)*0.026*idle + rise*0.28;
  group.rotation.z = Math.sin(t*0.27)*0.018*idle;
  group.position.y = Math.sin(t*0.36)*0.06*idle - rise*0.7;
  group.position.x = Math.sin(t*0.21)*0.05*idle + mouse.x*0.10;`;
    const motionReplacement = `  const __bpM = window.__bpPaperMotion || {intensity:1,idle:1,tilt:1,float:1};
  const idle = REDUCED ? 0 : __bpM.idle;
  const rise = 1 - intro;
  group.rotation.y = dragYaw + mouse.x*0.16*__bpM.tilt + Math.sin(t*0.23)*0.045*idle*__bpM.intensity;
  group.rotation.x = dragPitch - mouse.y*0.11*__bpM.tilt + Math.sin(t*0.19)*0.026*idle*__bpM.intensity + rise*0.28;
  group.rotation.z = Math.sin(t*0.27)*0.018*idle*__bpM.intensity;
  group.position.y = Math.sin(t*0.36)*0.06*idle*__bpM.float - rise*0.7;
  group.position.x = Math.sin(t*0.21)*0.05*idle*__bpM.float + mouse.x*0.10*__bpM.tilt;`;
    out = replaceRequired(out, motionBlock, motionReplacement, 'idle/tilt/float motion block');

    const controlsRuntime = `
/* BANDEROLAS 4.4 derived runtime controls. Vendor source remains immutable. */
const __bpPaperBase = {
  roughness:mat.roughness,
  clearcoat:mat.clearcoat,
  reflection:mat.envMapIntensity,
  specular:mat.specularIntensity,
  iridescence:Number(mat.iridescence||0),
  ior:Number(mat.ior||1.5),
  amp:uni.uAmp.value,
  rim:uni.uRim.value,
  fov:camera.fov,
  keyIntensity:key.intensity,
  fillIntensity:fill.intensity,
  rimIntensity:rim.intensity,
  keyPos:key.position.clone(),
  fillPos:fill.position.clone(),
  haloOpacity:halo && halo.material ? halo.material.opacity : 0.3
};
window.__bpPaperMotion = {intensity:1,idle:1,tilt:1,float:1};
window.__bpPaperPointerSensitivity = 1;
window.__bpPaperInertiaBase = 0.018;
window.__bpPaperEffectiveOpacity = 1;

function __bpClamp(v,a,b,f){ const n=Number(v); return Math.max(a,Math.min(b,Number.isFinite(n)?n:f)); }
function __bpApplyPaperControls(surface, seq){
  const s=surface||{}, m=s.material||{}, mo=s.motion||{}, inter=s.interaction||{};
  const opacity=__bpClamp(m.opacity,0.05,1,1);
  const transparency=__bpClamp(m.transparency,0,1,0);
  const translucency=__bpClamp(m.translucency,0,1,0);
  const backlight=__bpClamp(m.backlight,0,1,0);
  const reflection=__bpClamp(m.reflection,0,1,__bpPaperBase.reflection/2);
  const depth=__bpClamp(m.depth,0,1,0.55);
  const perspective=__bpClamp(m.perspective,0,1,0.5);
  const lightIntensity=__bpClamp(m.lightIntensity,0.2,2,1);
  const lightX=__bpClamp(m.lightX,-1,1,0);
  const lightY=__bpClamp(m.lightY,-1,1,0);

  window.__bpPaperEffectiveOpacity = __bpClamp(opacity*(1-transparency*0.82),0.05,1,1);
  mat.transparent = true;
  mat.roughness = __bpClamp(m.roughness,0.02,1,__bpPaperBase.roughness);
  mat.clearcoat = __bpClamp(m.clearcoat,0,1,__bpPaperBase.clearcoat);
  mat.envMapIntensity = reflection*2;
  mat.specularIntensity = __bpClamp(m.specular,0,1,__bpPaperBase.specular);
  if('iridescence' in mat) mat.iridescence = __bpClamp(m.iridescence,0,1,__bpPaperBase.iridescence);
  if('ior' in mat) mat.ior = __bpClamp(m.ior,1,2.33,__bpPaperBase.ior);
  if('transmission' in mat) mat.transmission = __bpClamp(Math.max(translucency,backlight*0.72),0,0.92,0);
  if('thickness' in mat) mat.thickness = 0.02 + backlight*0.28;
  mat.depthWrite = window.__bpPaperEffectiveOpacity > 0.92 && translucency < 0.08;
  mat.needsUpdate = true;

  uni.uAmp.value = __bpPaperBase.amp*(0.55 + depth*0.82);
  uni.uFlutter.value = __bpClamp(Math.max(0,(Number(mo.intensity||1)-1))*0.36 + Math.max(0,(Number(mo.float||1)-1))*0.12,0,0.7,0);
  uni.uRim.value = __bpPaperBase.rim*(0.55 + reflection*1.15) + backlight*0.06;
  uni.uRimA.value = backlight*0.32;
  uni.uSpecA.value = backlight*0.10;

  window.__bpPaperMotion = {
    intensity:__bpClamp(mo.intensity,0,2,1),
    idle:__bpClamp(mo.idle,0,2,1),
    tilt:__bpClamp(mo.tilt,0,2,1),
    float:__bpClamp(mo.float,0,2,1)
  };
  window.__bpPaperPointerSensitivity = __bpClamp(inter.sensitivity,0.25,2,1);
  const inertia=__bpClamp(mo.inertia,0,1,0);
  window.__bpPaperInertiaBase = 0.018 + inertia*0.80;

  camera.fov = __bpPaperBase.fov*(0.75 + perspective*0.50);
  key.intensity = __bpPaperBase.keyIntensity*lightIntensity;
  fill.intensity = __bpPaperBase.fillIntensity*(0.65 + lightIntensity*0.35);
  rim.intensity = __bpPaperBase.rimIntensity*(0.65 + lightIntensity*0.35);
  key.position.copy(__bpPaperBase.keyPos); key.position.x += lightX*3.0; key.position.y += lightY*2.2;
  fill.position.copy(__bpPaperBase.fillPos); fill.position.x -= lightX*1.4; fill.position.y -= lightY*1.1;
  if(halo && halo.material) halo.material.opacity = __bpPaperBase.haloOpacity*(0.55 + (1-transparency)*0.45);
  resize();
  try{ parent.postMessage({type:'banderolas:paper-controls-applied',seq:seq||0,variant:${JSON.stringify(options.variant||'unknown')}}, '*'); }catch(_){}
}
window.addEventListener('message', ev=>{
  const d=ev.data||{};
  if(d.type==='banderolas:paper-controls') __bpApplyPaperControls(d.surface||{}, d.seq||0);
});
try{ parent.postMessage({type:'banderolas:paper-controls-ready',variant:${JSON.stringify(options.variant||'unknown')}}, '*'); }catch(_){}

`;
    out = replaceRequired(out, SHEET_MARKER, controlsRuntime + SHEET_MARKER, 'sheet diagnostics export');
    return out;
  }

  function diagnostics(source, patched){
    return {
      sourceHasDemoBackground: /<div id="bg"[\s\S]*?<h1>/.test(String(source||'')),
      runtimeHasVisibleDemoBackground: /<div id="bg"(?![^>]*display:none)[\s\S]*?<h1>/.test(String(patched||'')),
      runtimeHasBridge: String(patched||'').includes('banderolas:paper-texture'),
      runtimeHasControls: String(patched||'').includes('banderolas:paper-controls-applied'),
      runtimeUsesCanvasTexture: String(patched||'').includes('new T.CanvasTexture(c)'),
      pointerSensitivityPatched: String(patched||'').includes('__bpPaperPointerSensitivity'),
      inertiaPatched: String(patched||'').includes('__bpPaperInertiaBase')
    };
  }

  window.BanderolasPaper3DBridge = Object.freeze({buildRuntimeSource, diagnostics});
})();
