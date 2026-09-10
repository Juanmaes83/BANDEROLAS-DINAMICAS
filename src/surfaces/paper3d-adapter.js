'use strict';
(() => {
  const schema = window.BanderolasSurfaceSchema;
  const manager = window.surfaceManager;
  const foundation = window.BanderolasSurfaceFoundation;
  const bridge = window.BanderolasPaper3DBridge;
  if(!schema || !manager || !foundation || !bridge) throw new Error('Paper 3D adapter load order invalid');

  const LOCK = './vendor/threeui/3d-paper/SOURCE_LOCK.json';
  const VIDEO_FPS = 24;
  const STATIC_FPS = 8;
  const VARIANTS = Object.freeze({
    original: Object.freeze({
      label:'Original',
      source:'./vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper.html',
      lockPath:'src/shaders/3d-paper/sources/3d-paper.html',
      sha256:'8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353',
      bytes:630847
    }),
    'site-of-the-year': Object.freeze({
      label:'Site of the Year',
      source:'./vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html',
      lockPath:'src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html',
      sha256:'fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d',
      bytes:633404
    }),
    japanese: Object.freeze({
      label:'Japanese',
      source:'./vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-japanese.html',
      lockPath:'src/shaders/3d-paper/sources/3d-paper-japanese.html',
      sha256:'4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738',
      bytes:633704
    }),
    certificate: Object.freeze({
      label:'Certificate',
      source:'./vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-certificate.html',
      lockPath:'src/shaders/3d-paper/sources/3d-paper-certificate.html',
      sha256:'0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32',
      bytes:634005
    })
  });

  const sourceCache = new Map();
  const sourcePromises = new Map();
  const verifiedVariants = new Set();

  const normalizeVariant = value => VARIANTS[value] ? value : 'original';
  const ctx = () => foundation.context();
  const status = text => {
    const node = document.querySelector('#surface-foundation-status');
    if(node){
      node.textContent = text;
      node.classList.toggle('ok', /READY|VERIFIED|ACTIVE|LIVE/.test(text));
      node.classList.toggle('warn', /FAILED|ERROR/.test(text));
    }
  };

  async function digest(text){
    if(!crypto?.subtle) return null;
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function loadVerifiedSource(variant='original'){
    const id = normalizeVariant(variant);
    const spec = VARIANTS[id];
    if(verifiedVariants.has(id) && sourceCache.has(id)) return sourceCache.get(id);
    if(sourcePromises.has(id)) return sourcePromises.get(id);

    const promise = (async()=>{
      status(`3D PAPER · ${spec.label.toUpperCase()} · verifying exact ThreeUI source…`);
      const [srcRes, lockRes] = await Promise.all([
        fetch(new URL(spec.source, location.href), {cache:'no-store'}),
        fetch(new URL(LOCK, location.href), {cache:'no-store'})
      ]);
      if(!srcRes.ok) throw new Error(`3D Paper ${spec.label} source unavailable: ${srcRes.status}`);
      if(!lockRes.ok) throw new Error('3D Paper source lock unavailable: '+lockRes.status);
      const [text, lock] = await Promise.all([srcRes.text(), lockRes.json()]);
      const locked = lock.files?.find(f=>f.path===spec.lockPath);
      if(!locked || locked.sha256 !== spec.sha256 || locked.bytes !== spec.bytes){
        throw new Error(`3D Paper ${spec.label} SOURCE_LOCK mismatch`);
      }
      const bytes = new TextEncoder().encode(text).byteLength;
      if(bytes !== spec.bytes) throw new Error(`3D Paper ${spec.label} byte mismatch: ${bytes}`);
      const actual = await digest(text);
      if(actual && actual !== spec.sha256) throw new Error(`3D Paper ${spec.label} SHA-256 mismatch: ${actual}`);
      sourceCache.set(id,text);
      verifiedVariants.add(id);
      status(`3D PAPER · ${spec.label.toUpperCase()} · SOURCE VERIFIED · LIVE COMPOSITOR READY`);
      return text;
    })().catch(err=>{
      sourcePromises.delete(id);
      verifiedVariants.delete(id);
      sourceCache.delete(id);
      status(`3D PAPER · ${spec.label.toUpperCase()} · SOURCE CHECK FAILED`);
      throw err;
    });

    sourcePromises.set(id,promise);
    return promise;
  }

  const paper3dAdapter = {
    id: 'paper3d',
    label: '3D Paper',
    mounted: false,
    host: null,
    iframe: null,
    mountToken: 0,
    textureCanvas: null,
    runtimeReady: false,
    frameBusy: false,
    frameSeq: 0,
    appliedSeq: 0,
    pumpRAF: 0,
    lastFrameAt: 0,
    messageHandler: null,
    derivedDiagnostics: null,
    activeVariant: null,
    requestedVariant: 'original',

    hasLiveVideo(){
      return !!state.elements?.some(el => el.type === 'video' && el.visible !== false);
    },

    async pushTextureFrame(force=false){
      if(!this.mounted || !this.runtimeReady || !this.iframe?.contentWindow || this.frameBusy) return;
      const source = this.textureCanvas || ctx().texture;
      if(!source || !source.width || !source.height) return;
      const now = performance.now();
      const fps = this.hasLiveVideo() ? VIDEO_FPS : STATIC_FPS;
      const interval = 1000 / fps;
      if(!force && now - this.lastFrameAt < interval) return;
      this.lastFrameAt = now;
      this.frameBusy = true;
      const seq = ++this.frameSeq;
      try{
        if(typeof createImageBitmap === 'function'){
          const bitmap = await createImageBitmap(source);
          if(!this.mounted || !this.iframe?.contentWindow){ try{bitmap.close?.()}catch{}; return; }
          this.iframe.contentWindow.postMessage({type:'banderolas:paper-texture',bitmap,seq}, '*', [bitmap]);
        } else {
          const dataURL = source.toDataURL('image/png');
          this.iframe.contentWindow.postMessage({type:'banderolas:paper-texture',dataURL,seq}, '*');
        }
      }catch(err){
        console.warn('[BANDEROLAS] Paper live texture frame failed', err);
        try{
          const dataURL = source.toDataURL('image/png');
          this.iframe?.contentWindow?.postMessage({type:'banderolas:paper-texture',dataURL,seq}, '*');
        }catch(fallbackErr){
          console.error('[BANDEROLAS] Paper texture fallback failed', fallbackErr);
          this.frameBusy = false;
        }
      }
    },

    startPump(){
      if(this.pumpRAF) return;
      const tick = () => {
        if(!this.mounted){ this.pumpRAF=0; return; }
        this.pushTextureFrame(false);
        this.pumpRAF = requestAnimationFrame(tick);
      };
      this.pumpRAF = requestAnimationFrame(tick);
    },

    stopPump(){
      if(this.pumpRAF) cancelAnimationFrame(this.pumpRAF);
      this.pumpRAF=0; this.frameBusy=false; this.runtimeReady=false;
    },

    async mount(context){
      this.textureCanvas = context?.texture || this.textureCanvas || ctx().texture;
      const variantId = normalizeVariant(this.requestedVariant || context?.state?.surface?.variant || 'original');
      const spec = VARIANTS[variantId];

      if(this.mounted && this.host?.isConnected){
        if(this.activeVariant === variantId){
          this.pushTextureFrame(true);
          return;
        }
        this.unmount();
      }

      this.mounted = true;
      this.activeVariant = variantId;
      this.requestedVariant = variantId;
      const token = ++this.mountToken;
      const container = document.querySelector('#canvas-container');
      if(!container) throw new Error('Canvas container not found');

      const host = document.createElement('div');
      host.id = 'paper3d-surface-host';
      host.setAttribute('data-engine','paper3d');
      host.setAttribute('data-variant',variantId);
      Object.assign(host.style,{
        position:'absolute', inset:'0', zIndex:'12', overflow:'hidden', background:'#08080a',
        pointerEvents:'auto', touchAction:'none'
      });
      const loading = document.createElement('div');
      loading.textContent = `3D PAPER · ${spec.label.toUpperCase()} · VERIFYING SOURCE + LIVE TEXTURE BRIDGE…`;
      Object.assign(loading.style,{
        position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
        color:'#d4af37',font:'10px ui-monospace,monospace',letterSpacing:'1.2px',zIndex:'2'
      });
      host.appendChild(loading);
      container.appendChild(host);
      this.host = host;

      if(canvas) canvas.style.visibility='hidden';
      const cursor=document.querySelector('#cursor'); if(cursor) cursor.style.display='none';
      const hint=document.querySelector('#mode-hint');
      if(hint) hint.textContent=`3D PAPER · ${spec.label.toUpperCase()} · BANDEROLAS LIVE CONTENT · drag to rotate · edit layers from the same panel`;

      this.messageHandler = ev => {
        if(!this.iframe?.contentWindow || ev.source !== this.iframe.contentWindow) return;
        const d = ev.data || {};
        if(d.type === 'banderolas:paper-ready'){
          this.runtimeReady = true;
          this.frameBusy = false;
          this.pushTextureFrame(true);
          status(`3D PAPER · ${spec.label.toUpperCase()} · LIVE BANDEROLAS TEXTURE · READY`);
        } else if(d.type === 'banderolas:paper-texture-applied'){
          this.appliedSeq = Math.max(this.appliedSeq, Number(d.seq||0));
          this.frameBusy = false;
          if(this.appliedSeq === 1 || this.appliedSeq % 60 === 0){
            status(`3D PAPER · ${spec.label.toUpperCase()} · LIVE BANDEROLAS CONTENT · ACTIVE`);
          }
        }
      };
      window.addEventListener('message', this.messageHandler);

      try{
        const exactHtml = await loadVerifiedSource(variantId);
        if(!this.mounted || token !== this.mountToken || !host.isConnected || this.activeVariant !== variantId) return;
        const runtimeHtml = bridge.buildRuntimeSource(exactHtml);
        this.derivedDiagnostics = bridge.diagnostics(exactHtml, runtimeHtml);
        if(!this.derivedDiagnostics.runtimeHasBridge || this.derivedDiagnostics.runtimeHasDemoBackground || this.derivedDiagnostics.runtimeHasHint){
          throw new Error(`3D Paper ${spec.label} derived runtime bridge validation failed`);
        }

        const iframe = document.createElement('iframe');
        iframe.title = `ThreeUI 3D Paper — ${spec.label} — BANDEROLAS live content`;
        iframe.setAttribute('sandbox','allow-scripts');
        iframe.setAttribute('aria-label',`Interactive ThreeUI 3D Paper ${spec.label} surface with BANDEROLAS live composition`);
        Object.assign(iframe.style,{
          position:'absolute',inset:'0',width:'100%',height:'100%',border:'0',display:'block',
          background:'#08080a',opacity:'0',transition:'opacity 220ms ease-out',pointerEvents:'auto'
        });
        iframe.onload=()=>{
          if(!this.mounted || token !== this.mountToken || this.activeVariant !== variantId) return;
          iframe.style.opacity='1'; loading.remove();
          this.startPump();
          this.pushTextureFrame(true);
          status(`3D PAPER · ${spec.label.toUpperCase()} · LIVE BANDEROLAS CONTENT · ACTIVE`);
        };
        iframe.srcdoc = runtimeHtml;
        host.appendChild(iframe);
        this.iframe = iframe;
      }catch(err){
        console.error(`[BANDEROLAS] ThreeDPaper ${spec.label} dynamic runtime failed`,err);
        loading.textContent=`3D PAPER ${spec.label.toUpperCase()} FAILED · SELECT ANOTHER VARIANT OR CLASSIC`;
        loading.style.color='#ef8b8b';
        status(`3D PAPER · ${spec.label.toUpperCase()} · ERROR`);
      }
    },

    unmount(){
      this.mounted=false;
      this.mountToken++;
      this.stopPump();
      if(this.messageHandler) window.removeEventListener('message',this.messageHandler);
      this.messageHandler=null;
      try{this.iframe?.remove()}catch{}
      try{this.host?.remove()}catch{}
      this.iframe=null; this.host=null; this.activeVariant=null;
      if(canvas) canvas.style.visibility='visible';
      const cursor=document.querySelector('#cursor'); if(cursor) cursor.style.display='';
      const hint=document.querySelector('#mode-hint');
      if(hint) hint.textContent=state.mode==='interact'?'INTERACT · grab, drag and stretch the physical fabric':'EDIT · select and position content on the fabric';
      status('CLASSIC FABRIC · ACTIVE · 3D PAPER CLEANLY UNMOUNTED');
    },

    setVariant(value, context){
      const next = normalizeVariant(value);
      this.requestedVariant = next;
      if(this.mounted && this.activeVariant !== next){
        this.unmount();
        this.requestedVariant = next;
        this.mount(context || ctx());
      }
    },
    setTexture(texture){
      this.textureCanvas = texture || this.textureCanvas;
      if(this.mounted) this.pushTextureFrame(true);
    },
    setFormat(){ if(this.mounted) this.pushTextureFrame(true); },
    setMaterial(){ /* 4.4 material controls. */ },
    setMotion(){ /* Exact ThreeUI motion remains authoritative. */ },
    setInteraction(){ /* Exact ThreeUI inertial pointer interaction remains authoritative. */ },
    diagnostics(){
      const variantId = normalizeVariant(this.activeVariant || this.requestedVariant);
      const spec = VARIANTS[variantId];
      return {
        mounted:this.mounted,
        hostConnected:!!this.host?.isConnected,
        iframeConnected:!!this.iframe?.isConnected,
        sourceVerified:verifiedVariants.has(variantId),
        verifiedVariants:[...verifiedVariants],
        sha256:spec.sha256,
        variant:variantId,
        variantLabel:spec.label,
        sourceMode:'exact-vendored + derived-runtime bridge',
        contentMode:'BANDEROLAS live compositor CanvasTexture',
        runtimeReady:this.runtimeReady,
        framesSent:this.frameSeq,
        framesApplied:this.appliedSeq,
        derived:this.derivedDiagnostics
      };
    }
  };

  manager.register('paper3d', paper3dAdapter);

  const engineSelect = document.querySelector('#surface-engine');
  if(engineSelect){
    const option = [...engineSelect.options].find(o=>o.value==='paper3d');
    if(option){ option.disabled=false; option.textContent='3D Paper · 4 verified variants · live content'; }
  }

  const surfaceControls = document.querySelector('#surface-foundation-controls');
  if(surfaceControls && !document.querySelector('#paper3d-content-source')){
    const note=document.createElement('div');
    note.id='paper3d-content-source';
    note.className='status ok';
    note.style.marginBottom='8px';
    note.textContent='CONTENT SOURCE · BANDEROLAS LAYERS → LIVE CANVAS TEXTURE';
    surfaceControls.appendChild(note);
  }

  const wanted = window.__bpRequestedSurfaceAtBoot;
  if(wanted?.engine === 'paper3d'){
    const requestedVariant = normalizeVariant(wanted.variant);
    paper3dAdapter.requestedVariant = requestedVariant;
    state.surface = schema.normalize({...wanted,engine:'paper3d',variant:requestedVariant});
    state.surface = manager.sync(state.surface, ctx());
    window.__bpRequestedSurfaceAtBoot = null;
  }
  foundation.syncUI?.();

  loadVerifiedSource('original').then(()=>{
    const option = engineSelect ? [...engineSelect.options].find(o=>o.value==='paper3d') : null;
    if(option){ option.disabled=false; option.textContent='3D Paper · Original + 3 variants · live content'; }
    foundation.syncUI?.();
    if(manager.activeId==='classic') status('PAPER VARIANTS READY · Classic active · Original source verified');
  }).catch(err=>{
    console.error(err);
    const option = engineSelect ? [...engineSelect.options].find(o=>o.value==='paper3d') : null;
    if(option){ option.disabled=true; option.textContent='3D Paper · source verification failed'; }
  });

  const version=document.querySelector('.panel-header .version');
  if(version) version.textContent='PHASE 4.3 · PAPER LIVE CONTENT + VARIANTS';
  window.BanderolasPaper3D = Object.freeze({adapter:paper3dAdapter,loadVerifiedSource,VARIANTS,normalizeVariant});
})();
