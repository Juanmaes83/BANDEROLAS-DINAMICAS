'use strict';
(() => {
  const PHASE3_VERSION = '7.0';
  const $p3 = s => document.querySelector(s);

  function p3Toast(msg){ try{ toast(msg); }catch{ console.log('[BANDEROLAS]', msg); } }
  function mark(){ state.needsTextureUpdate = true; }
  function safeName(s='banderola'){ return String(s).trim().replace(/[^a-z0-9áéíóúüñ_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'banderola'; }
  function downloadBlob(blob,name){ const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500); }
  function blobToDataURL(blob){ return new Promise((resolve,reject)=>{ const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob); }); }
  function dataURLToBlob(dataURL){ const [head,data]=String(dataURL).split(',');const mime=(head.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const bin=atob(data);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:mime}); }
  function humanMB(n){ return (n/1024/1024).toFixed(1)+' MB'; }

  async function collectAssets(){
    const ids=[...new Set(state.elements.map(e=>e.assetId).filter(Boolean))];
    const assets=[];
    for(const id of ids){
      let blob=null;
      try{ blob=await getAsset(id); }catch{}
      if(!blob) blob=runtimeAssets.get(id)?.blob||null;
      if(!blob) continue;
      const el=state.elements.find(e=>e.assetId===id);
      assets.push({ id, type:el?.type==='video'?'video':'image', name:el?.name||id, mime:blob.type||'', size:blob.size||0, dataURL:await blobToDataURL(blob) });
    }
    return assets;
  }

  function projectSnapshot(){
    const base=typeof serializableProject==='function'?serializableProject():{
      id:state.projectId,name:state.projectName,format:state.format,layout:state.layout,brand:state.brand,fabric:state.fabric,elements:state.elements
    };
    return deepClone({...base,background:state.background||{type:'solid',color:'#d1c099'},schemaVersion:3});
  }

  async function exportPortableJSON(){
    p3Toast('Preparing portable JSON…');
    const assets=await collectAssets();
    const payload={kind:'banderolas-pro-project',schemaVersion:3,exportedAt:new Date().toISOString(),project:projectSnapshot(),assets};
    downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),safeName(state.projectName)+'-'+state.format.replace(':','x')+'.json');
    p3Toast('Project JSON downloaded · '+assets.length+' assets embedded');
  }

  async function importPortableJSONFile(file){
    let payload;
    try{ payload=JSON.parse(await file.text()); }catch{ p3Toast('Invalid JSON'); return; }
    const project=payload.project||payload;
    if(!project||!Array.isArray(project.elements)){ p3Toast('JSON is not a BANDEROLAS project'); return; }
    if(typeof pushHistory==='function') pushHistory();
    for(const a of payload.assets||[]){
      if(!a?.id||!a?.dataURL) continue;
      try{
        const old=runtimeAssets.get(a.id); if(old?.url) URL.revokeObjectURL(old.url); runtimeAssets.delete(a.id);
        const blob=dataURLToBlob(a.dataURL); await putAsset(a.id,blob); await loadRuntimeAsset(a.id,blob,a.type==='video'?'video':'image');
      }catch(err){ console.warn('asset import',a?.id,err); }
    }
    state.projectId=project.id||uid('project'); state.projectName=project.name||'Imported Project';
    state.format=fmtMap[project.format]?project.format:'9:16'; state.layout=project.layout||'free';
    state.brand={...state.brand,...(project.brand||{})}; state.fabric={...state.fabric,...(project.fabric||{})};
    state.background={...(state.background||{}),...(project.background||{})}; state.elements=deepClone(project.elements||[]); state.selectedId=null;
    if(typeof normalizeZ==='function') normalizeZ();
    if(typeof rebuildCompositor==='function') rebuildCompositor();
    if(typeof hydrateAssets==='function') await hydrateAssets();
    if(typeof rebuildCloth==='function') rebuildCloth();
    if(typeof syncUI==='function') syncUI(); if(typeof renderLayers==='function') renderLayers(); if(typeof renderProperties==='function') renderProperties(); mark();
    p3Toast('Portable project imported · '+state.elements.length+' layers');
  }

  async function exportDesignPNG(){
    const old=state.suppressGuides; state.suppressGuides=true; mark();
    try{ updateTexture(); }catch{}
    const blob=await new Promise(res=>texCanvas.toBlob(res,'image/png'));
    state.suppressGuides=old; mark();
    if(blob) downloadBlob(blob,safeName(state.projectName)+'-DESIGN-'+state.format.replace(':','x')+'.png');
    p3Toast('Design PNG · '+texCanvas.width+'×'+texCanvas.height);
  }

  async function exportFabricPNG(){
    const blob=await new Promise(res=>canvas.toBlob(res,'image/png'));
    if(blob) downloadBlob(blob,safeName(state.projectName)+'-FABRIC-FRAME.png');
    p3Toast('Fabric frame PNG downloaded');
  }

  const priorRenderProperties = renderProperties;
  renderProperties = function(){
    priorRenderProperties();
    const box=$p3('#properties'),el=typeof selected==='function'?selected():null;
    if(!box||!el||!['image','video','logo'].includes(el.type)||$p3('#p3-frame-presets')) return;
    const wrap=document.createElement('div'); wrap.id='p3-frame-presets'; wrap.style.marginTop='10px';
    wrap.innerHTML='<div class="micro-label">Surface / frame preset</div><div class="grid4" style="grid-template-columns:repeat(4,1fr)">'+
      '<button class="mini-btn" data-p3frame="full">FULL BLEED</button><button class="mini-btn" data-p3frame=".75">3/4</button><button class="mini-btn" data-p3frame=".6666667">2/3</button><button class="mini-btn" data-p3frame=".5">1/2</button>'+ 
      '<button class="mini-btn" data-p3frame=".3333333">1/3</button><button class="mini-btn" data-p3frame=".25">1/4</button><button class="mini-btn" data-p3frame="center">CENTER</button><button class="mini-btn" data-p3frame="reset">FREE</button></div>'+
      '<div class="status" style="margin-top:7px">FULL BLEED = x0 · y0 · width100% · height100% · Cover. La imagen/vídeo ocupa toda la tela.</div>';
    box.appendChild(wrap);
    wrap.querySelectorAll('[data-p3frame]').forEach(b=>b.onclick=()=>{
      if(el.locked){p3Toast('Unlock layer first');return}
      if(typeof pushHistory==='function') pushHistory();
      const v=b.dataset.p3frame;
      if(v==='full'){Object.assign(el,{x:0,y:0,w:1,h:1,fit:'cover',cropX:0,cropY:0,zoom:1});}
      else if(v==='center'){el.x=(1-el.w)/2;el.y=(1-el.h)/2;}
      else if(v==='reset'){Object.assign(el,{x:.1,y:.1,w:.8,h:.55,fit:el.type==='logo'?'contain':'cover'});}
      else {const f=parseFloat(v),portrait=fmtMap[state.format].h>=fmtMap[state.format].w;if(portrait)Object.assign(el,{x:0,y:0,w:1,h:f,fit:el.type==='logo'?'contain':'cover'});else Object.assign(el,{x:0,y:0,w:f,h:1,fit:el.type==='logo'?'contain':'cover'});}
      mark(); renderProperties();
    });
  };
  renderProperties();

  let recorder=null,recordChunks=[],recordBlob=null,recordStartedAt=0,recordTimer=null;
  function bestMime(){
    const types=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    return types.find(t=>window.MediaRecorder&&MediaRecorder.isTypeSupported(t))||'';
  }
  function setRecUI(active){
    const start=$p3('#p3-rec-start'),stop=$p3('#p3-rec-stop'),down=$p3('#p3-rec-download'),time=$p3('#p3-rec-time');
    if(start)start.disabled=active;if(stop)stop.disabled=!active;if(down)down.disabled=active||!recordBlob;
    if(!active&&recordTimer){clearInterval(recordTimer);recordTimer=null}
    if(active&&!recordTimer){recordTimer=setInterval(()=>{if(time)time.textContent=((performance.now()-recordStartedAt)/1000).toFixed(1)+' s'},100)}
  }
  function startRecording(){
    if(!window.MediaRecorder||!canvas.captureStream){p3Toast('This browser cannot record canvas');return}
    try{
      recordChunks=[];recordBlob=null;const stream=canvas.captureStream(60),mime=bestMime();recorder=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:12000000}:undefined);
      recorder.ondataavailable=e=>{if(e.data?.size)recordChunks.push(e.data)};
      recorder.onstop=()=>{recordBlob=new Blob(recordChunks,{type:recorder.mimeType||'video/webm'});setRecUI(false);const s=$p3('#p3-rec-status');if(s)s.textContent='READY · '+humanMB(recordBlob.size)+' · '+(recorder.mimeType||'video/webm');p3Toast('Recording ready to download')};
      recorder.start(250);recordStartedAt=performance.now();setRecUI(true);const s=$p3('#p3-rec-status');if(s)s.textContent='● RECORDING · interact with the fabric now';p3Toast('Recording started · grab and stretch the fabric');
    }catch(err){console.error(err);p3Toast('Recording could not start')}
  }
  function stopRecording(){if(recorder&&recorder.state!=='inactive')recorder.stop()}
  function downloadRecording(){if(!recordBlob){p3Toast('Record something first');return}const ext=recordBlob.type.includes('mp4')?'mp4':'webm';downloadBlob(recordBlob,safeName(state.projectName)+'-FABRIC-RECORDING.'+ext)}

  function buildInteractiveHTML(payload){
    const packed=JSON.stringify(payload).replace(/</g,'\\u003c');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>BANDEROLAS PRO · Interactive</title><style>*{box-sizing:border-box}html,body,#w{margin:0;width:100%;height:100%;overflow:hidden;background:#050201}#w{position:relative;touch-action:none;cursor:grab;background:radial-gradient(circle at center,#21130d 0%,#070302 68%,#000 100%)}#w:active{cursor:grabbing}canvas{display:block;width:100%;height:100%}#h{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);background:rgba(0,0,0,.6);border:1px solid rgba(212,175,55,.4);color:#e7d8af;padding:8px 11px;font:10px monospace;pointer-events:none;white-space:nowrap}#d{position:absolute;width:34px;height:34px;border:2px solid #d4af37;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;display:none}</style></head><body><div id="w"><canvas id="c"></canvas><div id="d"></div><div id="h">GRAB · DRAG · STRETCH · RELEASE · DOUBLE CLICK RESET</div></div><script>'use strict';const PACK=${packed};const P=PACK.project,A=Object.fromEntries((PACK.assets||[]).map(a=>[a.id,a]));const F=P.fabric||{},FM={'9:16':[1080,1920],'1:1':[1080,1080],'16:9':[1920,1080]},wh=FM[P.format]||FM['9:16'];const comp=document.createElement('canvas');comp.width=wh[0];comp.height=wh[1];const x=comp.getContext('2d',{alpha:true});const nodes={};function loadAssets(){for(const e of P.elements||[]){if(!e.assetId||nodes[e.assetId]||!A[e.assetId])continue;const a=A[e.assetId];if(e.type==='video'){const v=document.createElement('video');v.src=a.dataURL;v.loop=e.loop!==false;v.muted=e.muted!==false;v.playsInline=true;v.preload='auto';v.addEventListener('loadeddata',()=>v.play().catch(()=>{}));v.load();nodes[e.assetId]=v}else{const im=new Image();im.src=a.dataURL;nodes[e.assetId]=im}}}loadAssets();function bg(){const b=P.background||{type:'solid',color:'#d1c099'};x.clearRect(0,0,comp.width,comp.height);if(b.type==='transparent')return;if(b.type==='paper'){const g=x.createLinearGradient(0,0,comp.width,comp.height);g.addColorStop(0,'#d8c69a');g.addColorStop(.55,'#d0bd8e');g.addColorStop(1,'#b9a57c');x.fillStyle=g}else x.fillStyle=b.color||'#d1c099';x.fillRect(0,0,comp.width,comp.height)}function media(e){const n=nodes[e.assetId];if(!n)return;const sw=e.type==='video'?n.videoWidth:(n.naturalWidth||n.width),sh=e.type==='video'?n.videoHeight:(n.naturalHeight||n.height);if(!sw||!sh)return;const W=comp.width,H=comp.height,X=e.x*W,Y=e.y*H,Wd=e.w*W,Hd=e.h*H,z=Math.max(1,e.zoom||1),cx=e.cropX||0,cy=e.cropY||0;x.save();x.globalAlpha=e.opacity??1;x.translate(X+Wd/2,Y+Hd/2);x.rotate((e.rotation||0)*Math.PI/180);x.beginPath();x.rect(-Wd/2,-Hd/2,Wd,Hd);x.clip();let dw=Wd,dh=Hd,sx=0,sy=0,sww=sw,shh=sh,dx=0,dy=0;if(e.fit==='cover'||!e.fit){const br=Wd/Hd,sr=sw/sh;if(sr>br){sww=sh*br;sx=(sw-sww)/2}else{shh=sw/br;sy=(sh-shh)/2}const nw=sww/z,nh=shh/z;sx+=(sww-nw)/2+cx*Math.max(0,(sw-nw)/2);sy+=(shh-nh)/2+cy*Math.max(0,(sh-nh)/2);sww=nw;shh=nh;sx=Math.max(0,Math.min(sw-sww,sx));sy=Math.max(0,Math.min(sh-shh,sy))}else if(e.fit==='contain'){const sr=sw/sh,br=Wd/Hd;if(sr>br)dh=Wd/sr;else dw=Hd*sr;dw*=z;dh*=z;dx=cx*Math.max(0,(Wd-dw)/2);dy=cy*Math.max(0,(Hd-dh)/2)}else{dw=Wd*z;dh=Hd*z;dx=cx*(Wd*(z-1)/2);dy=cy*(Hd*(z-1)/2)}x.drawImage(n,sx,sy,sww,shh,-dw/2+dx,-dh/2+dy,dw,dh);x.restore()}function trackedWidth(s,sp){if(!sp)return x.measureText(s).width;let w=0;for(const c of s)w+=x.measureText(c).width;return w+Math.max(0,s.length-1)*sp}function wrap(t,m,sp){const out=[];for(const para of String(t).split('\\n')){let line='';for(const word of para.split(/\\s+/)){const q=line?line+' '+word:word;if(line&&trackedWidth(q,sp)>m){out.push(line);line=word}else line=q}out.push(line)}return out}function text(e){const W=comp.width,H=comp.height,X=e.x*W,Y=e.y*H,Wd=e.w*W,Hd=e.h*H,sc=Math.min(W,H)/1080;x.save();x.globalAlpha=e.opacity??1;x.translate(X+Wd/2,Y+Hd/2);x.rotate((e.rotation||0)*Math.PI/180);let fs=(e.fontSize||42)*sc,sp=(e.letterSpacing||0)*sc,lh=fs*(e.lineHeight||1.2);x.font=(e.fontStyle||'normal')+' '+(e.fontWeight||400)+' '+fs+'px "'+(e.font||'Arial')+'"';let ls=wrap(e.text,Wd*.98,sp),need=ls.length*lh;if((e.textMode||'autoFit')==='autoFit')while(need>Hd*.96&&fs>10*sc){fs-=2*sc;sp=(e.letterSpacing||0)*sc*(fs/((e.fontSize||42)*sc));lh=fs*(e.lineHeight||1.2);x.font=(e.fontStyle||'normal')+' '+(e.fontWeight||400)+' '+fs+'px "'+(e.font||'Arial')+'"';ls=wrap(e.text,Wd*.98,sp);need=ls.length*lh}x.fillStyle=e.color||'#151515';x.textBaseline='top';let yy=-Math.min(need,Hd)/2;for(const line of ls){if(yy+lh>Hd/2+1)break;let tx=e.align==='center'?0:e.align==='right'?Wd/2:-Wd/2;if(!sp){x.textAlign=e.align||'left';x.fillText(line,tx,yy)}else{x.textAlign='left';let xx=e.align==='center'?-trackedWidth(line,sp)/2:e.align==='right'?Wd/2-trackedWidth(line,sp):-Wd/2;for(const c of line){x.fillText(c,xx,yy);xx+=x.measureText(c).width+sp}}yy+=lh}x.restore()}function compose(){bg();for(const e of [...(P.elements||[])].filter(e=>e.visible!==false).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0))){if(e.type==='text')text(e);else media(e)}}const w=document.getElementById('w'),c=document.getElementById('c'),dot=document.getElementById('d'),gl=c.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});const m4={translation:(a,b,d)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,a,b,d,1]),perspective:(f,a,n,z)=>{const q=1/Math.tan(f/2),nf=1/(n-z);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(z+n)*nf,-1,0,0,2*z*n*nf,0])},multiply:(a,b)=>{const o=new Float32Array(16);for(let C=0;C<4;C++)for(let R=0;R<4;R++)o[C*4+R]=a[R]*b[C*4]+a[4+R]*b[C*4+1]+a[8+R]*b[C*4+2]+a[12+R]*b[C*4+3];return o}};function sh(t,s){const q=gl.createShader(t);gl.shaderSource(q,s);gl.compileShader(q);return q}const vs='attribute vec4 p;attribute vec3 n;attribute vec2 uv;uniform mat4 m;varying vec3 N;varying vec2 U;varying vec3 V;void main(){gl_Position=m*p;N=n;U=uv;V=vec3(0.,0.,4.8)-p.xyz;}';const fs='precision mediump float;varying vec3 N;varying vec2 U;varying vec3 V;uniform sampler2D T;uniform vec3 L;void main(){vec3 n=normalize(N),v=normalize(V),h=normalize(L+v);float d=max(dot(n,L),0.),s=d>0.?pow(max(dot(n,h),0.),18.)*.15:0.;vec4 t=texture2D(T,U);gl_FragColor=vec4(t.rgb*(vec3(.25,.20,.16)+d*1.22*vec3(1.,.93,.80))+s,t.a);}';const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pg);const l={p:gl.getAttribLocation(pg,'p'),n:gl.getAttribLocation(pg,'n'),u:gl.getAttribLocation(pg,'uv'),m:gl.getUniformLocation(pg,'m'),t:gl.getUniformLocation(pg,'T'),L:gl.getUniformLocation(pg,'L')},B={p:gl.createBuffer(),n:gl.createBuffer(),u:gl.createBuffer(),i:gl.createBuffer()},T=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,T);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);let cloth,vp,grab,mx=0,my=0,time=0,cam=4.9,fov=45*Math.PI/180,lastTex=0;function con(a,b,k){cloth.cs.push({a,b,r:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),k})}function build(){const ratio=wh[0]/wh[1];let W,H;if(ratio>=1){W=3.45;H=W/ratio}else{H=3.45;W=H*ratio}const s=30,g=Math.round(s*Math.max(ratio,1/ratio)),cols=ratio>=1?Math.min(54,g):s,rows=ratio>=1?s:Math.min(54,g);cloth={W,H,cols,rows,ps:[],cs:[],ix:[],sx:W/(cols-1),sy:H/(rows-1),x:-W/2,y:H/2};for(let y=0;y<rows;y++)for(let z=0;z<cols;z++){const X=cloth.x+z*cloth.sx,Y=cloth.y-y*cloth.sy;cloth.ps.push({x:X,y:Y,z:0,ox:X,oy:Y,oz:0,p:y===0,u:z/(cols-1),v:y/(rows-1)})}for(let y=0;y<rows;y++)for(let z=0;z<cols;z++){const i=y*cols+z;if(z<cols-1)con(cloth.ps[i],cloth.ps[i+1],1);if(y<rows-1)con(cloth.ps[i],cloth.ps[i+cols],1);if(z<cols-1&&y<rows-1){con(cloth.ps[i],cloth.ps[i+cols+1],.9);con(cloth.ps[i+1],cloth.ps[i+cols],.9)}if(z<cols-2)con(cloth.ps[i],cloth.ps[i+2],.45);if(y<rows-2)con(cloth.ps[i],cloth.ps[i+cols*2],.45)}for(let y=0;y<rows-1;y++)for(let z=0;z<cols-1;z++){const i=y*cols+z;cloth.ix.push(i,i+cols,i+1,i+1,i+cols,i+cols+1)}const N=cloth.ps.length;cloth.pos=new Float32Array(N*3);cloth.norm=new Float32Array(N*3);cloth.uv=new Float32Array(N*2);cloth.vn=Array.from({length:N},()=>({x:0,y:0,z:0}));cloth.ps.forEach((p,i)=>{cloth.uv[i*2]=p.u;cloth.uv[i*2+1]=p.v});gl.bindBuffer(gl.ARRAY_BUFFER,B.u);gl.bufferData(gl.ARRAY_BUFFER,cloth.uv,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,B.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(cloth.ix),gl.STATIC_DRAW);grab=null;dot.style.display='none'}function resize(){c.width=w.clientWidth;c.height=w.clientHeight;gl.viewport(0,0,c.width,c.height)}addEventListener('resize',resize);resize();build();function proj(p){const m=vp,q=p.x*m[3]+p.y*m[7]+p.z*m[11]+m[15];if(!q)return null;const X=(p.x*m[0]+p.y*m[4]+p.z*m[8]+m[12])/q,Y=(p.x*m[1]+p.y*m[5]+p.z*m[9]+m[13])/q;return{x:(X+1)*.5*c.width,y:(1-Y)*.5*c.height}}function ep(e){const r=w.getBoundingClientRect(),q=e.touches?.[0]||e.changedTouches?.[0]||e;return{x:q.clientX-r.left,y:q.clientY-r.top}}function near(X,Y){let b=null,d=6400;for(const p of cloth.ps){if(p.p)continue;const q=proj(p);if(!q)continue;const D=(q.x-X)**2+(q.y-Y)**2;if(D<d){d=D;b=p}}return b}function down(e){const q=ep(e);mx=q.x;my=q.y;grab=near(mx,my);for(const n of Object.values(nodes))if(n.tagName==='VIDEO')n.play().catch(()=>{});if(grab){dot.style.display='block';dot.style.left=mx+'px';dot.style.top=my+'px'}}function move(e){if(!grab)return;if(e.cancelable)e.preventDefault();const q=ep(e);mx=q.x;my=q.y}function up(){grab=null;dot.style.display='none'}w.addEventListener('mousedown',down);addEventListener('mousemove',move,{passive:false});addEventListener('mouseup',up);w.addEventListener('touchstart',down,{passive:false});addEventListener('touchmove',move,{passive:false});addEventListener('touchend',up);w.addEventListener('dblclick',build);function frame(){requestAnimationFrame(frame);time+=.016;const aspect=c.width/c.height;vp=m4.multiply(m4.perspective(fov,aspect,.1,100),m4.translation(0,0,-cam));if(performance.now()-lastTex>33){compose();gl.bindTexture(gl.TEXTURE_2D,T);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,comp);lastTex=performance.now()}const damp=F.damping??.92,gravity=-.010*(F.gravity??.45)*(F.weight??.55),wind=.00105*(F.wind??.18);for(const p of cloth.ps){if(p.p)continue;p.z+=Math.sin(time*2.1+p.x*3.1+p.y*1.7)*wind;const vx=(p.x-p.ox)*damp,vy=(p.y-p.oy)*damp,vz=(p.z-p.oz)*damp;p.ox=p.x;p.oy=p.y;p.oz=p.z;p.x+=vx;p.y+=vy+gravity;p.z+=vz}if(grab){const nx=mx/c.width*2-1,dx=nx*aspect*(cam*Math.tan(fov/2)),dy=-(my/c.height*2-1)*2.5;grab.x+=(dx-grab.x)*.22;grab.y+=(dy-grab.y)*.22;grab.z+=(1.25-grab.z)*.22}const it=Math.round(18+(F.stiffness??.92)*20);for(let z=0;z<it;z++){for(const q of cloth.cs){const dx=q.a.x-q.b.x,dy=q.a.y-q.b.y,dz=q.a.z-q.b.z,dist=Math.hypot(dx,dy,dz);if(!dist)continue;const st=Math.max(.1,Math.min(1,q.k*(F.stiffness??.92)*(.55+.45*(F.elasticity??.52)))),df=((dist-q.r)/dist)*.5*st,ox=dx*df,oy=dy*df,oz=dz*df;if(!q.a.p&&q.a!==grab){q.a.x-=ox;q.a.y-=oy;q.a.z-=oz}if(!q.b.p&&q.b!==grab){q.b.x+=ox;q.b.y+=oy;q.b.z+=oz}}for(let X=0;X<cloth.cols;X++){const p=cloth.ps[X];p.x=cloth.x+X*cloth.sx;p.y=cloth.y;p.z=0}}cloth.vn.forEach(n=>{n.x=n.y=n.z=0});for(let i=0;i<cloth.ix.length;i+=3){const a=cloth.ix[i],b=cloth.ix[i+1],d=cloth.ix[i+2],p0=cloth.ps[a],p1=cloth.ps[b],p2=cloth.ps[d],ux=p1.x-p0.x,uy=p1.y-p0.y,uz=p1.z-p0.z,vx=p2.x-p0.x,vy=p2.y-p0.y,vz=p2.z-p0.z,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const j of [a,b,d]){cloth.vn[j].x+=nx;cloth.vn[j].y+=ny;cloth.vn[j].z+=nz}}cloth.ps.forEach((p,i)=>{cloth.pos[i*3]=p.x;cloth.pos[i*3+1]=p.y;cloth.pos[i*3+2]=p.z;const n=cloth.vn[i],q=Math.hypot(n.x,n.y,n.z)||1;cloth.norm[i*3]=n.x/q;cloth.norm[i*3+1]=n.y/q;cloth.norm[i*3+2]=n.z/q});gl.bindBuffer(gl.ARRAY_BUFFER,B.p);gl.bufferData(gl.ARRAY_BUFFER,cloth.pos,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,B.n);gl.bufferData(gl.ARRAY_BUFFER,cloth.norm,gl.DYNAMIC_DRAW);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(pg);gl.uniformMatrix4fv(l.m,false,vp);let ax=.45,ay=.82,az=1,ll=Math.hypot(ax,ay,az);gl.uniform3f(l.L,ax/ll,ay/ll,az/ll);gl.bindBuffer(gl.ARRAY_BUFFER,B.p);gl.enableVertexAttribArray(l.p);gl.vertexAttribPointer(l.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,B.n);gl.enableVertexAttribArray(l.n);gl.vertexAttribPointer(l.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,B.u);gl.enableVertexAttribArray(l.u);gl.vertexAttribPointer(l.u,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,T);gl.uniform1i(l.t,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,B.i);gl.drawElements(gl.TRIANGLES,cloth.ix.length,gl.UNSIGNED_SHORT,0);if(grab){const q=proj(grab);if(q){dot.style.left=q.x+'px';dot.style.top=q.y+'px'}}}frame();<\/script></body></html>`;
  }

  async function exportInteractive(){
    p3Toast('Packing interactive project…');
    const assets=await collectAssets(),total=assets.reduce((s,a)=>s+(a.size||0),0);
    const payload={kind:'banderolas-pro-interactive',schemaVersion:3,project:projectSnapshot(),assets};
    const html=buildInteractiveHTML(payload);
    downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),safeName(state.projectName)+'-INTERACTIVE.html');
    p3Toast('Interactive HTML · '+assets.length+' assets · '+humanMB(total));
  }
  async function previewInteractive(){
    const assets=await collectAssets(),payload={kind:'banderolas-pro-interactive',schemaVersion:3,project:projectSnapshot(),assets},html=buildInteractiveHTML(payload),url=URL.createObjectURL(new Blob([html],{type:'text/html'}));window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  const exportDetails=[...document.querySelectorAll('#ui-panel details')].find(d=>d.querySelector('summary')?.textContent.trim().toLowerCase().startsWith('export'));
  if(exportDetails){
    const body=exportDetails.querySelector('.section-body');
    body.classList.remove('export-grid');
    body.innerHTML=`<div class="micro-label">Static</div><div class="grid2"><button id="p3-design-png" class="btn-solid">DESIGN PNG</button><button id="p3-fabric-png" class="btn-outline">FABRIC FRAME PNG</button></div>
      <div style="height:12px"></div><div class="micro-label">Project</div><div class="grid2"><button id="p3-json" class="btn-outline">DOWNLOAD JSON</button><button id="p3-import" class="btn-outline">IMPORT JSON</button></div>
      <div style="height:12px"></div><div class="micro-label">Record fabric</div><div class="grid2"><button id="p3-rec-start" class="btn-solid">● START RECORD</button><button id="p3-rec-stop" class="btn-outline" disabled>■ STOP</button></div><div class="grid2" style="margin-top:7px"><button id="p3-rec-download" class="btn-outline" disabled>DOWNLOAD VIDEO</button><div id="p3-rec-time" class="status" style="display:grid;place-items:center">0.0 s</div></div><div id="p3-rec-status" class="status" style="margin-top:7px">Records the WebGL canvas: live fabric motion + grab/stretch + live video texture.</div>
      <div style="height:12px"></div><div class="micro-label">Interactive / Embed artifact</div><div class="grid2"><button id="p3-interactive" class="btn-solid">DOWNLOAD INTERACTIVE</button><button id="p3-preview" class="btn-outline">OPEN PREVIEW</button></div><div class="status" style="margin-top:7px">Self-contained HTML with embedded media. It keeps live video, cloth physics, mouse/touch grab and stretch. Host this HTML and embed it with an iframe.</div>`;
    const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';inp.className='file-hidden';inp.id='p3-json-input';document.body.appendChild(inp);
    $p3('#p3-design-png').onclick=exportDesignPNG;$p3('#p3-fabric-png').onclick=exportFabricPNG;$p3('#p3-json').onclick=exportPortableJSON;$p3('#p3-import').onclick=()=>inp.click();inp.onchange=async()=>{if(inp.files?.[0])await importPortableJSONFile(inp.files[0]);inp.value=''};
    $p3('#p3-rec-start').onclick=startRecording;$p3('#p3-rec-stop').onclick=stopRecording;$p3('#p3-rec-download').onclick=downloadRecording;$p3('#p3-interactive').onclick=exportInteractive;$p3('#p3-preview').onclick=previewInteractive;
  }

  const saveBtn=$p3('#save-project'); if(saveBtn) saveBtn.textContent='SAVE PROJECT';
  const version=$p3('.panel-header .version'); if(version) version.textContent='PHASE 3 · PRODUCTION '+PHASE3_VERSION;
  p3Toast('PHASE 3 loaded · physics core untouched');
})();
