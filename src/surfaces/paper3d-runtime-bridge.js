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

    // 4.4R Native Fidelity: remove only authored demo copy from the DOM background.
    // Keep the original background layer, DOF, grain, vignette and all other authored atmosphere.
    out = out.replace(/<div id="bg"([^>]*)>\s*<h1>[\s\S]*?<\/h1>\s*<\/div>/i,
      '<div id="bg"$1 aria-hidden="true"></div>');
    out = out.replace(/<div id="hint"[\s\S]*?<\/div>/, '');

    const start = out.indexOf(FN_START);
    const end = out.indexOf(FN_END_MARKER, start);
    if(start < 0 || end < 0) throw new Error('ThreeDPaper texture function boundary not found');

    // Do NOT replace makeCertTexture(). The exact ThreeUI function remains intact.
    // We wrap it at runtime, suppress only text drawing, capture its non-text native artwork,
    // and then composite BANDEROLAS content over that preserved native base.
    const nativeTextureBridge = `
/* BANDEROLAS 4.4R NATIVE FIDELITY BRIDGE — exact vendor makeCertTexture preserved. */
window.__bpPaperTextureSinks = window.__bpPaperTextureSinks || [];
window.__bpPaperContent = window.__bpPaperContent || {mode:'native-content',opacity:1,safeInset:0.08};
window.__bpPaperReadySent = false;

function __bpClampContent(v,a,b,f){
  const n=Number(v); return Math.max(a,Math.min(b,Number.isFinite(n)?n:f));
}
function __bpDrawCover(ctx, canvas, image){
  const iw=image.width||image.videoWidth||canvas.width;
  const ih=image.height||image.videoHeight||canvas.height;
  const scale=Math.max(canvas.width/Math.max(1,iw),canvas.height/Math.max(1,ih));
  const sw=canvas.width/scale, sh=canvas.height/scale;
  const sx=Math.max(0,(iw-sw)/2), sy=Math.max(0,(ih-sh)/2);
  ctx.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
}
function __bpCompositePaperSink(sink,image){
  const cfg=window.__bpPaperContent||{mode:'native-content',opacity:1,safeInset:0.08};
  const mode=cfg.mode||'native-content';
  const opacity=__bpClampContent(cfg.opacity,0,1,1);
  const inset=__bpClampContent(cfg.safeInset,0,0.24,0.08);
  const c=sink.canvas, x=sink.ctx;
  x.save();
  x.globalCompositeOperation='source-over';
  x.globalAlpha=1;
  x.clearRect(0,0,c.width,c.height);
  if(mode!=='full-bleed') x.drawImage(sink.nativeBase,0,0,c.width,c.height);
  x.globalAlpha=opacity;
  if(mode==='full-bleed'){
    __bpDrawCover(x,c,image);
  }else if(mode==='native-layout'){
    const ix=c.width*inset, iy=c.height*inset;
    x.drawImage(image,0,0,image.width||c.width,image.height||c.height,
      ix,iy,c.width-ix*2,c.height-iy*2);
  }else{
    x.drawImage(image,0,0,image.width||c.width,image.height||c.height,0,0,c.width,c.height);
  }
  x.restore();
  sink.tex.needsUpdate=true;
}
function __bpApplyTexturePayload(d){
  const sinks=window.__bpPaperTextureSinks||[];
  const done=()=>{try{parent.postMessage({type:'banderolas:paper-texture-applied',seq:d.seq||0},'*')}catch(_){}};
  if(d.bitmap){
    sinks.forEach(s=>__bpCompositePaperSink(s,d.bitmap));
    try{d.bitmap.close&&d.bitmap.close()}catch(_){}
    done();
  }else if(d.dataURL){
    const im=new Image();
    im.onload=()=>{sinks.forEach(s=>__bpCompositePaperSink(s,im));done();};
    im.src=d.dataURL;
  }
}
window.addEventListener('message',ev=>{
  const d=ev.data||{};
  if(d.type==='banderolas:paper-texture') __bpApplyTexturePayload(d);
});

const __bpNativeMakeCertTexture = makeCertTexture;
makeCertTexture = function(){
  const proto=CanvasRenderingContext2D.prototype;
  const fillText=proto.fillText;
  const strokeText=proto.strokeText;
  // Exact native artwork is still drawn; only the demo copy is suppressed.
  proto.fillText=function(){};
  proto.strokeText=function(){};
  let texture;
  try{
    texture=__bpNativeMakeCertTexture.apply(this,arguments);
  }finally{
    proto.fillText=fillText;
    proto.strokeText=strokeText;
  }
  const c=texture&&texture.image;
  if(c&&c.getContext){
    const base=document.createElement('canvas');
    base.width=c.width; base.height=c.height;
    base.getContext('2d',{alpha:true}).drawImage(c,0,0);
    const sink={canvas:c,ctx:c.getContext('2d',{alpha:true}),tex:texture,nativeBase:base};
    window.__bpPaperTextureSinks.push(sink);
  }
  if(!window.__bpPaperReadySent){
    window.__bpPaperReadySent=true;
    try{parent.postMessage({type:'banderolas:paper-ready',nativeFidelity:true,variant:${JSON.stringify(options.variant||'unknown')}},'*')}catch(_){}
  }
  return texture;
};
`;
    out = out.slice(0,end) + nativeTextureBridge + out.slice(end);

    // Keep authored motion as the baseline; expose optional overrides only when requested.
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
/* BANDEROLAS 4.4R controls. Native means exact authored values: zero material overrides. */
const __bpPaperBase = {
  color:mat.color.clone(), roughness:mat.roughness, clearcoat:mat.clearcoat,
  clearcoatRoughness:Number(mat.clearcoatRoughness||0), reflection:mat.envMapIntensity,
  specular:mat.specularIntensity, iridescence:Number(mat.iridescence||0),
  ior:Number(mat.ior||1.5), alphaTest:Number(mat.alphaTest||0),
  transparent:!!mat.transparent, depthWrite:mat.depthWrite,
  transmission:Number(mat.transmission||0), thickness:Number(mat.thickness||0),
  sheen:Number(mat.sheen||0), sheenRoughness:Number(mat.sheenRoughness||0),
  amp:uni.uAmp.value, flutter:uni.uFlutter.value, rim:uni.uRim.value,
  rimA:uni.uRimA.value, specA:uni.uSpecA.value, fov:camera.fov,
  keyIntensity:key.intensity, fillIntensity:fill.intensity, rimIntensity:rim.intensity,
  keyPos:key.position.clone(), fillPos:fill.position.clone(),
  haloOpacity:halo&&halo.material?halo.material.opacity:0.3
};
window.__bpPaperMotion={intensity:1,idle:1,tilt:1,float:1};
window.__bpPaperPointerSensitivity=1;
window.__bpPaperInertiaBase=0.018;
window.__bpPaperEffectiveOpacity=1;

function __bpClamp(v,a,b,f){const n=Number(v);return Math.max(a,Math.min(b,Number.isFinite(n)?n:f));}
function __bpRestoreNativeMaterial(){
  mat.color.copy(__bpPaperBase.color);
  mat.roughness=__bpPaperBase.roughness;
  mat.clearcoat=__bpPaperBase.clearcoat;
  mat.clearcoatRoughness=__bpPaperBase.clearcoatRoughness;
  mat.envMapIntensity=__bpPaperBase.reflection;
  mat.specularIntensity=__bpPaperBase.specular;
  if('iridescence' in mat) mat.iridescence=__bpPaperBase.iridescence;
  if('ior' in mat) mat.ior=__bpPaperBase.ior;
  if('transmission' in mat) mat.transmission=__bpPaperBase.transmission;
  if('thickness' in mat) mat.thickness=__bpPaperBase.thickness;
  if('sheen' in mat) mat.sheen=__bpPaperBase.sheen;
  if('sheenRoughness' in mat) mat.sheenRoughness=__bpPaperBase.sheenRoughness;
  mat.alphaTest=__bpPaperBase.alphaTest;
  mat.transparent=__bpPaperBase.transparent;
  mat.depthWrite=__bpPaperBase.depthWrite;
  mat.needsUpdate=true;
  window.__bpPaperEffectiveOpacity=1;
  uni.uAmp.value=__bpPaperBase.amp;
  uni.uFlutter.value=__bpPaperBase.flutter;
  uni.uRim.value=__bpPaperBase.rim;
  uni.uRimA.value=__bpPaperBase.rimA;
  uni.uSpecA.value=__bpPaperBase.specA;
  camera.fov=__bpPaperBase.fov;
  key.intensity=__bpPaperBase.keyIntensity;
  fill.intensity=__bpPaperBase.fillIntensity;
  rim.intensity=__bpPaperBase.rimIntensity;
  key.position.copy(__bpPaperBase.keyPos);
  fill.position.copy(__bpPaperBase.fillPos);
  if(halo&&halo.material) halo.material.opacity=__bpPaperBase.haloOpacity;
}
function __bpApplyPaperControls(surface,seq){
  const s=surface||{},m=s.material||{},mo=s.motion||{},inter=s.interaction||{},content=s.content||{};
  window.__bpPaperContent={
    mode:['native-content','native-layout','full-bleed'].includes(content.mode)?content.mode:'native-content',
    opacity:__bpClamp(content.opacity,0,1,1),
    safeInset:__bpClamp(content.safeInset,0,0.24,0.08)
  };

  if(m.preset==='native'){
    __bpRestoreNativeMaterial();
  }else{
    const opacity=__bpClamp(m.opacity,0.05,1,1);
    const transparency=__bpClamp(m.transparency,0,1,0);
    const translucency=__bpClamp(m.translucency,0,1,0);
    const backlight=__bpClamp(m.backlight,0,1,0);
    const reflection=__bpClamp(m.reflection,0,1,__bpPaperBase.reflection/2);
    const depth=__bpClamp(m.depth,0,1,0.55);
    const perspective=__bpClamp(m.perspective,0,1,0.5);
    const lightIntensity=__bpClamp(m.lightIntensity,0.2,2,1);
    const lightX=__bpClamp(m.lightX,-1,1,0), lightY=__bpClamp(m.lightY,-1,1,0);
    window.__bpPaperEffectiveOpacity=__bpClamp(opacity*(1-transparency*0.82),0.05,1,1);
    mat.transparent=true;
    mat.roughness=__bpClamp(m.roughness,0.02,1,__bpPaperBase.roughness);
    mat.clearcoat=__bpClamp(m.clearcoat,0,1,__bpPaperBase.clearcoat);
    mat.envMapIntensity=reflection*2;
    mat.specularIntensity=__bpClamp(m.specular,0,1,__bpPaperBase.specular);
    if('iridescence' in mat) mat.iridescence=__bpClamp(m.iridescence,0,1,__bpPaperBase.iridescence);
    if('ior' in mat) mat.ior=__bpClamp(m.ior,1,2.33,__bpPaperBase.ior);
    if('transmission' in mat) mat.transmission=__bpClamp(Math.max(translucency,backlight*0.72),0,0.92,0);
    if('thickness' in mat) mat.thickness=0.02+backlight*0.28;
    mat.depthWrite=window.__bpPaperEffectiveOpacity>0.92&&translucency<0.08;
    mat.needsUpdate=true;
    uni.uAmp.value=__bpPaperBase.amp*(0.55+depth*0.82);
    uni.uFlutter.value=__bpClamp(Math.max(0,(Number(mo.intensity||1)-1))*0.36+Math.max(0,(Number(mo.float||1)-1))*0.12,0,0.7,0);
    uni.uRim.value=__bpPaperBase.rim*(0.55+reflection*1.15)+backlight*0.06;
    uni.uRimA.value=backlight*0.32; uni.uSpecA.value=backlight*0.10;
    camera.fov=__bpPaperBase.fov*(0.75+perspective*0.50);
    key.intensity=__bpPaperBase.keyIntensity*lightIntensity;
    fill.intensity=__bpPaperBase.fillIntensity*(0.65+lightIntensity*0.35);
    rim.intensity=__bpPaperBase.rimIntensity*(0.65+lightIntensity*0.35);
    key.position.copy(__bpPaperBase.keyPos); key.position.x+=lightX*3.0; key.position.y+=lightY*2.2;
    fill.position.copy(__bpPaperBase.fillPos); fill.position.x-=lightX*1.4; fill.position.y-=lightY*1.1;
    if(halo&&halo.material) halo.material.opacity=__bpPaperBase.haloOpacity*(0.55+(1-transparency)*0.45);
  }

  if(mo.profile==='native'){
    window.__bpPaperMotion={intensity:1,idle:1,tilt:1,float:1};
    window.__bpPaperInertiaBase=0.018;
  }else{
    window.__bpPaperMotion={
      intensity:__bpClamp(mo.intensity,0,2,1), idle:__bpClamp(mo.idle,0,2,1),
      tilt:__bpClamp(mo.tilt,0,2,1), float:__bpClamp(mo.float,0,2,1)
    };
    const inertia=__bpClamp(mo.inertia,0,1,0);
    window.__bpPaperInertiaBase=0.018+inertia*0.80;
  }
  window.__bpPaperPointerSensitivity=__bpClamp(inter.sensitivity,0.25,2,1);
  resize();
  try{parent.postMessage({type:'banderolas:paper-controls-applied',seq:seq||0,variant:${JSON.stringify(options.variant||'unknown')},nativeMaterial:m.preset==='native',contentMode:window.__bpPaperContent.mode},'*')}catch(_){}
}
window.addEventListener('message',ev=>{
  const d=ev.data||{};
  if(d.type==='banderolas:paper-controls') __bpApplyPaperControls(d.surface||{},d.seq||0);
});
try{parent.postMessage({type:'banderolas:paper-controls-ready',variant:${JSON.stringify(options.variant||'unknown')},nativeFidelity:true},'*')}catch(_){}

`;
    out = replaceRequired(out, SHEET_MARKER, controlsRuntime + SHEET_MARKER, 'sheet diagnostics export');
    return out;
  }

  function diagnostics(source, patched){
    const s=String(source||''), p=String(patched||'');
    return {
      sourceHasDemoBackground:/<div id="bg"[\s\S]*?<h1>/.test(s),
      runtimeHasVisibleDemoBackground:/<div id="bg"[\s\S]*?<h1>/.test(p),
      runtimeHasBridge:p.includes('banderolas:paper-texture'),
      runtimeHasControls:p.includes('banderolas:paper-controls-applied'),
      runtimePreservesNativeTexture:p.includes('const __bpNativeMakeCertTexture = makeCertTexture') && p.includes('__bpNativeMakeCertTexture.apply'),
      runtimeSuppressesOnlyText:p.includes('proto.fillText=function(){}') && p.includes('proto.strokeText=function(){}'),
      runtimeHasNativeBase:p.includes('nativeBase:base') && p.includes('sink.nativeBase'),
      runtimeHasContentModes:p.includes("'native-content','native-layout','full-bleed'"),
      runtimeHasExactNativeRestore:p.includes('__bpRestoreNativeMaterial') && p.includes("if(m.preset==='native')"),
      pointerSensitivityPatched:p.includes('__bpPaperPointerSensitivity'),
      inertiaPatched:p.includes('__bpPaperInertiaBase')
    };
  }

  window.BanderolasPaper3DBridge = Object.freeze({buildRuntimeSource, diagnostics});
})();
