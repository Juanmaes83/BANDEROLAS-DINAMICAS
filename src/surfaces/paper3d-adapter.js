'use strict';
(() => {
  const schema = window.BanderolasSurfaceSchema;
  const manager = window.surfaceManager;
  const foundation = window.BanderolasSurfaceFoundation;
  if(!schema || !manager || !foundation) throw new Error('Paper 3D adapter load order invalid');

  const SOURCE = './vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper.html';
  const LOCK = './vendor/threeui/3d-paper/SOURCE_LOCK.json';
  const EXPECTED = '8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353';
  const EXPECTED_BYTES = 630847;

  let sourceText = null;
  let sourceVerified = false;
  let sourcePromise = null;

  const ctx = () => foundation.context();
  const status = text => {
    const node = document.querySelector('#surface-foundation-status');
    if(node){ node.textContent = text; node.classList.toggle('ok', /READY|VERIFIED|ACTIVE/.test(text)); }
  };

  async function digest(text){
    if(!crypto?.subtle) return null;
    const bytes = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function loadVerifiedSource(){
    if(sourceVerified && sourceText) return sourceText;
    if(sourcePromise) return sourcePromise;
    sourcePromise = (async()=>{
      status('3D PAPER · verifying exact ThreeUI source…');
      const [srcRes, lockRes] = await Promise.all([
        fetch(new URL(SOURCE, location.href), {cache:'no-store'}),
        fetch(new URL(LOCK, location.href), {cache:'no-store'})
      ]);
      if(!srcRes.ok) throw new Error('3D Paper source unavailable: '+srcRes.status);
      if(!lockRes.ok) throw new Error('3D Paper source lock unavailable: '+lockRes.status);
      const [text, lock] = await Promise.all([srcRes.text(), lockRes.json()]);
      const locked = lock.files?.find(f=>f.path==='src/shaders/3d-paper/sources/3d-paper.html');
      if(!locked || locked.sha256 !== EXPECTED || locked.bytes !== EXPECTED_BYTES) throw new Error('3D Paper SOURCE_LOCK mismatch');
      const bytes = new TextEncoder().encode(text).byteLength;
      if(bytes !== EXPECTED_BYTES) throw new Error(`3D Paper byte mismatch: ${bytes}`);
      const actual = await digest(text);
      if(actual && actual !== EXPECTED) throw new Error(`3D Paper SHA-256 mismatch: ${actual}`);
      sourceText = text;
      sourceVerified = true;
      status('3D PAPER · SOURCE VERIFIED · ORIGINAL READY');
      return text;
    })().catch(err=>{ sourcePromise=null; sourceVerified=false; status('3D PAPER · SOURCE CHECK FAILED'); throw err; });
    return sourcePromise;
  }

  const paper3dAdapter = {
    id: 'paper3d',
    label: '3D Paper / Original',
    mounted: false,
    host: null,
    iframe: null,
    mountToken: 0,
    async mount(context){
      if(this.mounted && this.host?.isConnected) return;
      this.mounted = true;
      const token = ++this.mountToken;
      const container = document.querySelector('#canvas-container');
      if(!container) throw new Error('Canvas container not found');

      const host = document.createElement('div');
      host.id = 'paper3d-surface-host';
      host.setAttribute('data-engine','paper3d');
      Object.assign(host.style,{
        position:'absolute', inset:'0', zIndex:'12', overflow:'hidden', background:'#08080a',
        pointerEvents:'auto', touchAction:'none'
      });
      const loading = document.createElement('div');
      loading.textContent = '3D PAPER · VERIFYING EXACT SOURCE…';
      Object.assign(loading.style,{
        position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',
        color:'#d4af37',font:'10px ui-monospace,monospace',letterSpacing:'1.2px',zIndex:'2'
      });
      host.appendChild(loading);
      container.appendChild(host);
      this.host = host;

      if(canvas) canvas.style.visibility='hidden';
      const cursor=document.querySelector('#cursor'); if(cursor) cursor.style.display='none';
      const hint=document.querySelector('#mode-hint'); if(hint) hint.textContent='3D PAPER ORIGINAL · drag to rotate · release for inertia · Classic remains preserved';

      try{
        const html = await loadVerifiedSource();
        if(!this.mounted || token !== this.mountToken || !host.isConnected) return;
        const iframe = document.createElement('iframe');
        iframe.title = 'ThreeUI 3D Paper — Original';
        iframe.setAttribute('sandbox','allow-scripts');
        iframe.setAttribute('aria-label','Interactive ThreeUI 3D Paper Original surface');
        Object.assign(iframe.style,{
          position:'absolute',inset:'0',width:'100%',height:'100%',border:'0',display:'block',
          background:'#08080a',opacity:'0',transition:'opacity 220ms ease-out',pointerEvents:'auto'
        });
        iframe.onload=()=>{
          if(!this.mounted || token !== this.mountToken) return;
          iframe.style.opacity='1'; loading.remove();
          status('3D PAPER ORIGINAL · ACTIVE · SHA-256 VERIFIED');
        };
        iframe.srcdoc = html;
        host.appendChild(iframe);
        this.iframe = iframe;
      }catch(err){
        console.error('[BANDEROLAS] ThreeDPaper exact source failed',err);
        loading.textContent='3D PAPER SOURCE FAILED · SWITCH BACK TO CLASSIC';
        loading.style.color='#ef8b8b';
      }
    },
    unmount(){
      this.mounted=false;
      this.mountToken++;
      try{this.iframe?.remove()}catch{}
      try{this.host?.remove()}catch{}
      this.iframe=null; this.host=null;
      if(canvas) canvas.style.visibility='visible';
      const cursor=document.querySelector('#cursor'); if(cursor) cursor.style.display='';
      const hint=document.querySelector('#mode-hint'); if(hint) hint.textContent=state.mode==='interact'?'INTERACT · grab, drag and stretch the physical fabric':'EDIT · select and position content on the fabric';
      status('CLASSIC FABRIC · ACTIVE · 3D PAPER CLEANLY UNMOUNTED');
    },
    setTexture(){ /* 4.3: dynamic BANDEROLAS texCanvas bridge. */ },
    setFormat(){ /* Exact source owns its original responsive behavior in 4.2. */ },
    setMaterial(){ /* 4.4. */ },
    setMotion(){ /* Exact source motion remains authoritative in 4.2. */ },
    setInteraction(){ /* Exact source direct inertial interaction remains authoritative. */ },
    diagnostics(){
      return {
        mounted:this.mounted,
        hostConnected:!!this.host?.isConnected,
        iframeConnected:!!this.iframe?.isConnected,
        sourceVerified,
        sha256:EXPECTED,
        variant:'original',
        sourceMode:'exact-vendored-srcdoc'
      };
    }
  };

  manager.register('paper3d', paper3dAdapter);

  const engineSelect = document.querySelector('#surface-engine');
  if(engineSelect){
    const option = [...engineSelect.options].find(o=>o.value==='paper3d');
    if(option){ option.disabled=false; option.textContent='3D Paper / Original'; }
  }

  const variant = document.querySelector('#surface-variant');
  if(variant) variant.disabled = true;

  const wanted = window.__bpRequestedSurfaceAtBoot;
  if(wanted?.engine === 'paper3d'){
    state.surface = schema.normalize({...wanted,engine:'paper3d',variant:'original'});
    state.surface = manager.sync(state.surface, ctx());
    window.__bpRequestedSurfaceAtBoot = null;
  }

  // Preflight exact source without executing it. A failure leaves Classic active.
  loadVerifiedSource().then(()=>{
    const option = engineSelect ? [...engineSelect.options].find(o=>o.value==='paper3d') : null;
    if(option){ option.disabled=false; option.textContent='3D Paper / Original · verified'; }
    if(manager.activeId==='classic') status('4.2 READY · Classic active · 3D Paper exact source verified');
  }).catch(err=>{
    console.error(err);
    const option = engineSelect ? [...engineSelect.options].find(o=>o.value==='paper3d') : null;
    if(option){ option.disabled=true; option.textContent='3D Paper · source verification failed'; }
  });

  const version=document.querySelector('.panel-header .version');
  if(version) version.textContent='PHASE 4.2 · 3D PAPER ORIGINAL';
  window.BanderolasPaper3D = Object.freeze({adapter:paper3dAdapter,loadVerifiedSource,EXPECTED});
})();
