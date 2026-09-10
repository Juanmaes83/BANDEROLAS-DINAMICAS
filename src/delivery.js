'use strict';
(() => {
  const VERSION='8.0';
  const $c=s=>document.querySelector(s);
  const toastC=m=>{try{toast(m)}catch{console.log('[BANDEROLAS]',m)}};
  const safeName=s=>String(s||'banderola').trim().replace(/[^a-z0-9áéíóúüñ_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80)||'banderola';
  const download=(blob,name)=>{const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)};
  const copy=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}};

  // Capture the already validated Phase 3 artifacts instead of rebuilding physics.
  async function captureBlobFromButton(selector,{expect='text/html',timeout=15000}={}){
    const btn=$c(selector);if(!btn||btn.disabled) return null;
    return new Promise(resolve=>{
      const originalCreate=URL.createObjectURL, originalRevoke=URL.revokeObjectURL, originalOpen=window.open;
      const originalClick=HTMLAnchorElement.prototype.click;
      let settled=false,timer=null;
      const restore=()=>{URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;window.open=originalOpen;HTMLAnchorElement.prototype.click=originalClick;if(timer)clearTimeout(timer)};
      const finish=b=>{if(settled)return;settled=true;restore();resolve(b||null)};
      URL.createObjectURL=function(blob){
        if(blob instanceof Blob && (!expect || String(blob.type||'').includes(expect.split('/')[0]))){queueMicrotask(()=>finish(blob));return 'blob:banderolas-captured'}
        return originalCreate.call(URL,blob);
      };
      URL.revokeObjectURL=function(u){if(u==='blob:banderolas-captured')return;return originalRevoke.call(URL,u)};
      window.open=()=>null;
      HTMLAnchorElement.prototype.click=function(){};
      timer=setTimeout(()=>finish(null),timeout);
      try{btn.click()}catch{finish(null)}
    });
  }
  async function captureInteractiveHTML(){const b=await captureBlobFromButton('#p3-preview',{expect:'text/html'});return b?await b.text():null}
  async function captureRecordingBlob(){return await captureBlobFromButton('#p3-rec-download',{expect:'video/'})}

  // Share / Embed: compressed self-contained interactive HTML in URL fragment.
  function bytesToB64url(bytes){let s='';const step=0x8000;for(let i=0;i<bytes.length;i+=step)s+=String.fromCharCode(...bytes.subarray(i,i+step));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  async function gzipText(text){
    if(!('CompressionStream' in window)) return null;
    const cs=new CompressionStream('gzip');
    const buf=await new Response(new Blob([text]).stream().pipeThrough(cs)).arrayBuffer();
    return bytesToB64url(new Uint8Array(buf));
  }
  function shareBase(){const u=new URL('./view/',location.href);u.hash='';u.search='';return u.href}
  async function makeShareURL(){
    toastC('Preparing share link…');
    const html=await captureInteractiveHTML();if(!html){toastC('Interactive artifact unavailable');return null}
    const packed=await gzipText(html);if(!packed){toastC('This browser cannot compress share links');return null}
    const url=shareBase()+'#p='+packed;
    if(url.length>1800000){toastC('Project too large for URL share · use ZIP/HTML for video-heavy pieces');return null}
    return url;
  }
  async function copyShare(){const u=await makeShareURL();if(!u)return;await copy(u);const out=$c('#p8-share-url');if(out)out.value=u;toastC('Share URL copied')}
  async function copyEmbed(){const u=await makeShareURL();if(!u)return;const code=`<iframe src="${u}" title="BANDEROLAS PRO" loading="lazy" allow="autoplay; fullscreen" style="width:100%;height:100%;border:0;display:block" referrerpolicy="no-referrer"></iframe>`;await copy(code);const out=$c('#p8-embed-code');if(out)out.value=code;toastC('Iframe embed copied')}
  async function openShare(){const u=await makeShareURL();if(u)window.open(u,'_blank','noopener')}

  // Structured ZIP, zero external dependencies. Store method keeps media binary intact.
  const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
  function crc32(u8){let c=0xffffffff;for(const b of u8)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
  const enc=new TextEncoder();
  function u16(n){return new Uint8Array([n&255,(n>>>8)&255])}
  function u32(n){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
  function concat(parts){const n=parts.reduce((s,p)=>s+p.length,0),o=new Uint8Array(n);let at=0;for(const p of parts){o.set(p,at);at+=p.length}return o}
  async function zipStore(entries){
    const locals=[],centrals=[];let offset=0;
    for(const e of entries){
      const name=enc.encode(e.name),data=e.data instanceof Uint8Array?e.data:new Uint8Array(e.data),crc=crc32(data);
      const local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);
      locals.push(local);
      const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);
      centrals.push(central);offset+=local.length;
    }
    const centralSize=centrals.reduce((s,p)=>s+p.length,0),end=concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralSize),u32(offset),u16(0)]);
    return new Blob([...locals,...centrals,end],{type:'application/zip'});
  }
  async function collectRawAssets(){
    const ids=[...new Set((state.elements||[]).map(e=>e.assetId).filter(Boolean))],out=[];
    for(const id of ids){let b=null;try{b=await getAsset(id)}catch{};if(!b)b=runtimeAssets.get(id)?.blob||null;if(!b)continue;const el=state.elements.find(e=>e.assetId===id)||{};let ext=(b.type.split('/')[1]||'bin').split(';')[0].replace('jpeg','jpg');if(ext==='svg+xml')ext='svg';out.push({id,blob:b,name:safeName(el.name||id)+'.'+ext})}
    return out;
  }
  async function downloadZip(){
    toastC('Building structured ZIP…');const html=await captureInteractiveHTML();if(!html){toastC('Interactive artifact unavailable');return}
    const project={kind:'banderolas-pro-project',schemaVersion:3,project:deepClone({id:state.projectId,name:state.projectName,format:state.format,layout:state.layout,brand:state.brand,fabric:state.fabric,background:state.background,elements:state.elements})};
    const entries=[{name:'index.html',data:enc.encode(html)},{name:'project.json',data:enc.encode(JSON.stringify(project,null,2))},{name:'README.txt',data:enc.encode('BANDEROLAS PRO interactive package\nOpen index.html in a modern browser.\nproject.json is a portable composition manifest.\nassets/ contains original uploaded media.\n')}];
    const assets=await collectRawAssets();for(const a of assets)entries.push({name:'assets/'+a.name,data:new Uint8Array(await a.blob.arrayBuffer())});
    const zip=await zipStore(entries);download(zip,safeName(state.projectName)+'-INTERACTIVE-PACKAGE.zip');toastC('ZIP ready · '+assets.length+' original assets')
  }

  // MP4: direct when browser records MP4; ffmpeg.wasm fallback when it records WebM.
  let ffmpegInstance=null;
  async function loadFFmpeg(){
    if(ffmpegInstance)return ffmpegInstance;
    toastC('Loading MP4 engine (~31 MB first use)…');
    const [{FFmpeg},{fetchFile,toBlobURL}]=await Promise.all([
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm/index.js'),
      import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js')
    ]);
    const ff=new FFmpeg();
    ff.on('log',({message})=>{const s=$c('#p8-mp4-status');if(s)s.textContent=message.slice(-120)});
    const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    await ff.load({coreURL:await toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL(base+'/ffmpeg-core.wasm','application/wasm')});
    ffmpegInstance={ff,fetchFile};return ffmpegInstance;
  }
  async function downloadMP4(){
    const blob=await captureRecordingBlob();if(!blob){toastC('Record and STOP first');return}
    if(blob.type.includes('mp4')){download(blob,safeName(state.projectName)+'-FABRIC-RECORDING.mp4');toastC('MP4 downloaded directly');return}
    const btn=$c('#p8-mp4');if(btn)btn.disabled=true;const st=$c('#p8-mp4-status');if(st)st.textContent='Transcoding WebM → MP4…';
    try{
      const {ff,fetchFile}=await loadFFmpeg();await ff.writeFile('input.webm',await fetchFile(blob));
      await ff.exec(['-i','input.webm','-c:v','libx264','-pix_fmt','yuv420p','-movflags','faststart','output.mp4']);
      const data=await ff.readFile('output.mp4'),out=new Blob([data.buffer],{type:'video/mp4'});download(out,safeName(state.projectName)+'-FABRIC-RECORDING.mp4');if(st)st.textContent='MP4 READY';toastC('MP4 ready')
    }catch(err){console.error(err);if(st)st.textContent='MP4 conversion failed · WebM remains available';toastC('MP4 conversion failed · use WebM')}
    finally{if(btn)btn.disabled=false}
  }

  // Stable-core premium interaction: only hit radius is changed in production.
  state.interaction=state.interaction||{gripRadius:80};
  findClosestParticle=function(sx,sy){
    let best=null,min=state.interaction.gripRadius*state.interaction.gripRadius;
    for(const p of cloth.particles){if(p.pinned)continue;const q=project3DTo2D(p,viewProj,canvas.width,canvas.height);if(!q)continue;const dx=q.x-sx,dy=q.y-sy,d=dx*dx+dy*dy;if(d<min){min=d;best=p}}
    return best;
  };

  // UI
  const panel=$c('#ui-panel');
  const exportDetails=[...document.querySelectorAll('#ui-panel details')].find(d=>d.querySelector('summary')?.textContent.trim().toLowerCase().startsWith('export'));
  if(exportDetails){
    const body=exportDetails.querySelector('.section-body');
    const extra=document.createElement('div');extra.id='p8-export-extra';extra.innerHTML=`<div style="height:12px"></div><div class="micro-label">Production delivery</div><div class="grid2"><button id="p8-mp4" class="btn-solid">DOWNLOAD MP4</button><button id="p8-zip" class="btn-outline">DOWNLOAD ZIP</button></div><div id="p8-mp4-status" class="status" style="margin-top:7px">MP4 uses direct browser H.264 when available; otherwise ffmpeg.wasm transcodes the recorded WebM.</div>`;body.appendChild(extra);
    $c('#p8-mp4').onclick=downloadMP4;$c('#p8-zip').onclick=downloadZip;
  }
  if(panel){
    const share=document.createElement('details');share.open=true;share.innerHTML=`<summary>Share / Embed</summary><div class="section-body"><div class="grid2"><button id="p8-share" class="btn-solid">COPY SHARE URL</button><button id="p8-share-open" class="btn-outline">OPEN SHARE</button></div><div class="form-group" style="margin-top:7px"><label>Share URL</label><textarea id="p8-share-url" class="form-control" readonly style="min-height:54px" placeholder="Generated locally; compressed project lives in the URL fragment"></textarea></div><button id="p8-embed" class="btn-outline">COPY IFRAME EMBED</button><div class="form-group" style="margin-top:7px"><label>Embed code</label><textarea id="p8-embed-code" class="form-control" readonly style="min-height:62px"></textarea></div><div class="status">No server database required for small/medium pieces. Video-heavy projects can exceed safe URL length: use DOWNLOAD ZIP / INTERACTIVE HTML for those.</div></div>`;
    const interaction=document.createElement('details');interaction.innerHTML=`<summary>Premium Interaction</summary><div class="section-body"><div class="range-line"><label>Grip radius</label><input id="p8-grip" type="range" min="40" max="140" step="5" value="${state.interaction.gripRadius}"><div id="p8-grip-v" class="range-val">${state.interaction.gripRadius}px</div></div><div class="status">Production keeps the validated Verlet renderer intact. Only grab hit-radius is adjustable. Advanced GPU/Breeze behavior stays isolated in the A/B lab.</div><button id="p8-ab" class="btn-outline" style="margin-top:7px">OPEN PHYSICS A/B LAB</button></div>`;
    const footer=panel.querySelector('.platform-footer');panel.insertBefore(share,footer);panel.insertBefore(interaction,footer);
    $c('#p8-share').onclick=copyShare;$c('#p8-share-open').onclick=openShare;$c('#p8-embed').onclick=copyEmbed;
    $c('#p8-grip').oninput=e=>{state.interaction.gripRadius=parseFloat(e.target.value)||80;$c('#p8-grip-v').textContent=state.interaction.gripRadius+'px'};
    $c('#p8-ab').onclick=()=>window.open(new URL('./labs/physics-ab.html',location.href),'_blank','noopener');
  }
  const version=$c('.panel-header .version');if(version)version.textContent='PHASE 3 · FINAL '+VERSION;
  toastC('FINAL 8.0 loaded · validated physics core preserved');
})();