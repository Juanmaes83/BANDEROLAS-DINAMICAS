'use strict';
(() => {
  const FN_START = 'function makeCertTexture(){';
  const FN_END_MARKER = '\n\n/* ======================================================================';

  function stripAuthoredChrome(source){
    return String(source)
      .replace(/<div id="bg"[\s\S]*?<\/div>/, '<div id="bg" aria-hidden="true" style="display:none!important"></div>')
      .replace(/<div id="hint"[\s\S]*?<\/div>/, '');
  }

  function buildRuntimeSource(source){
    if(typeof source !== 'string' || !source.includes(FN_START)){
      throw new Error('ThreeDPaper makeCertTexture marker not found');
    }

    let out = stripAuthoredChrome(source);
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
    return out;
  }

  function diagnostics(source, patched){
    const demoBg = /<div id="bg"[^>]*>\s*<h1[\s\S]*?<\/h1>\s*<\/div>/;
    return {
      sourceHasDemoBackground: demoBg.test(String(source||'')),
      runtimeHasDemoBackground: demoBg.test(String(patched||'')),
      runtimeHasBridge: String(patched||'').includes('banderolas:paper-texture'),
      runtimeUsesCanvasTexture: String(patched||'').includes('new T.CanvasTexture(c)'),
      runtimeHasHint: /<div id="hint"/.test(String(patched||''))
    };
  }

  window.BanderolasPaper3DBridge = Object.freeze({buildRuntimeSource, diagnostics});
})();
