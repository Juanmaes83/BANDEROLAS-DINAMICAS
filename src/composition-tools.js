'use strict';
(() => {
  const VERSION='4.0';
  const LEGACY_AUTOSAVE='banderolas-pro-autosave-v3';

  const mark=()=>{state.needsTextureUpdate=true};
  const summaryDetails=(name)=>[...document.querySelectorAll('#ui-panel details')].find(d=>d.querySelector('summary')?.textContent.trim().toLowerCase()===name.toLowerCase());

  function syncBlankUI(){
    if(typeof rebuildCompositor==='function') rebuildCompositor();
    if(typeof rebuildCloth==='function') rebuildCloth();
    if(typeof syncUI==='function') syncUI();
    if(typeof renderLayers==='function') renderLayers();
    if(typeof renderProperties==='function') renderProperties();
    mark();
  }

  async function blankProject({history=true,resetFormat=true}={}){
    if(history && typeof pushHistory==='function') pushHistory();
    state.projectId=uid('project');
    state.projectName='Untitled Project';
    if(resetFormat) state.format='9:16';
    state.layout='free';
    state.selectedId=null;
    state.elements=[];
    state.background=state.background||{type:'solid',color:state.brand?.background||'#d1c099'};
    state.background.type='solid';
    state.background.color=state.brand?.background||state.background.color||'#d1c099';
    syncBlankUI();
    const pn=document.querySelector('#project-name'); if(pn) pn.value=state.projectName;
    const ls=document.querySelector('#layout-select'); if(ls) ls.value='free';
    toast('Blank project · no default text');
  }

  async function clearDesign(){
    if(typeof pushHistory==='function') pushHistory();
    const old=[...state.elements];
    state.elements=[];
    state.selectedId=null;
    state.layout='free';
    const ls=document.querySelector('#layout-select'); if(ls) ls.value='free';
    renderLayers(); renderProperties(); mark();
    toast('Design cleared');
    for(const el of old){ try{ if(el.assetId && typeof releaseIfOrphan==='function') await releaseIfOrphan(el.assetId); }catch{} }
  }

  async function clearAllText(){
    const texts=state.elements.filter(e=>e.type==='text');
    if(!texts.length){toast('No text layers');return}
    if(typeof pushHistory==='function') pushHistory();
    state.elements=state.elements.filter(e=>e.type!=='text');
    if(state.selectedId && !state.elements.some(e=>e.id===state.selectedId)) state.selectedId=null;
    if(typeof normalizeZ==='function') normalizeZ();
    renderLayers(); renderProperties(); mark();
    toast(texts.length+' text layer'+(texts.length===1?'':'s')+' deleted');
  }

  async function recoverLegacyAutosave(){
    try{
      const p=JSON.parse(localStorage.getItem(LEGACY_AUTOSAVE)||'null');
      if(!p||!Array.isArray(p.elements)){toast('No autosave available');return}
      if(typeof applyProjectObject==='function') await applyProjectObject(p,{history:true});
      else {
        if(typeof pushHistory==='function') pushHistory();
        state.projectId=p.id||uid('project'); state.projectName=p.name||'Recovered Project';
        state.format=p.format||state.format; state.layout=p.layout||'free';
        state.brand={...state.brand,...(p.brand||{})}; state.fabric={...state.fabric,...(p.fabric||{})};
        state.background={...(state.background||{}),...(p.background||{})};
        state.elements=deepClone(p.elements||[]); state.selectedId=null; syncBlankUI();
      }
      toast('Autosave recovered');
    }catch{toast('Autosave could not be recovered')}
  }

  const projectDetails=summaryDetails('Project');
  if(projectDetails){
    const body=projectDetails.querySelector('.section-body');
    const newBtn=document.querySelector('#new-project');
    if(newBtn) newBtn.textContent='NEW BLANK';
    if(body && !document.querySelector('#fix4-project-actions')){
      const row=document.createElement('div');
      row.id='fix4-project-actions'; row.className='grid2'; row.style.marginTop='6px';
      row.innerHTML='<button id="fix4-recover" class="mini-btn">Recover Autosave</button><button id="fix4-clear" class="mini-btn danger">Clear Design</button>';
      body.appendChild(row);
      row.querySelector('#fix4-recover').onclick=recoverLegacyAutosave;
      row.querySelector('#fix4-clear').onclick=clearDesign;
    }
  }

  newProject=async()=>blankProject({history:true,resetFormat:true});
  if(document.querySelector('#new-project')) document.querySelector('#new-project').onclick=newProject;

  const baseRenderLayers=renderLayers;
  function enhanceLayers(){
    document.querySelectorAll('#layer-list .layer').forEach(row=>{
      row.style.gridTemplateColumns='18px 28px 1fr 26px 26px 26px';
      if(row.querySelector('.fix4-del')) return;
      const b=document.createElement('button');
      b.className='icon-btn fix4-del'; b.title='Delete layer'; b.textContent='×';
      b.onclick=async e=>{
        e.stopPropagation();
        const id=row.dataset.id,el=state.elements.find(x=>x.id===id);
        if(!el)return;
        if(el.locked){toast('Unlock layer before deleting');return}
        setSelected(id);
        await deleteSelected();
      };
      row.appendChild(b);
    });
  }
  renderLayers=function(){baseRenderLayers();enhanceLayers()};
  renderLayers();

  const layersDetails=summaryDetails('Layers');
  if(layersDetails && !document.querySelector('#fix4-clear-text')){
    const b=document.createElement('button');
    b.id='fix4-clear-text';b.className='btn-outline';b.style.marginTop='7px';b.textContent='DELETE ALL TEXT';
    b.onclick=clearAllText;
    layersDetails.querySelector('.section-body')?.appendChild(b);
  }

  const baseSetSelected=setSelected;
  setSelected=function(id){
    baseSetSelected(id);
    const pd=document.querySelector('#properties-details'); if(pd && id) pd.open=true;
  };

  function downloadBlob(blob,name){
    const a=document.createElement('a'),url=URL.createObjectURL(blob);
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function interactiveViewerHTML(textureData,format,fabric,title){
    const ratio=(format==='16:9')?16/9:(format==='1:1'?1:9/16);
    const cfg={ratio,wind:Number(fabric?.wind??.18),gravity:Number(fabric?.gravity??.45),stiffness:Number(fabric?.stiffness??.92),elasticity:Number(fabric?.elasticity??.52),damping:Number(fabric?.damping??.92),weight:Number(fabric?.weight??.55)};
    const safeTitle=String(title||'BANDEROLAS PRO').replace(/[<>&"]/g,'');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${safeTitle} · Interactive Fabric</title>
<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#050201}body{font-family:ui-monospace,monospace}#wrap{width:100%;height:100%;position:relative;touch-action:none;cursor:grab;background:radial-gradient(circle at 50% 45%,#21130d,#070302 70%,#000)}#wrap:active{cursor:grabbing}canvas{display:block;width:100%;height:100%}#hint{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);padding:9px 12px;color:#e7d8af;background:rgba(0,0,0,.62);border:1px solid rgba(212,175,55,.38);font:10px ui-monospace,monospace;letter-spacing:1.1px;pointer-events:none;white-space:nowrap}#dot{position:absolute;width:34px;height:34px;border:2px solid #d4af37;border-radius:50%;transform:translate(-50%,-50%);display:none;pointer-events:none;box-shadow:0 0 16px rgba(212,175,55,.35)}</style>
</head><body><div id="wrap"><canvas id="c"></canvas><div id="dot"></div><div id="hint">DRAG · GRAB AND STRETCH THE FABRIC · DOUBLE CLICK TO RESET</div></div>
<script>
'use strict';
const CFG=${JSON.stringify(cfg)},TEXTURE=${JSON.stringify(textureData)};
const wrap=document.getElementById('wrap'),canvas=document.getElementById('c'),dot=document.getElementById('dot');
const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true});
if(!gl){document.getElementById('hint').textContent='WebGL required';throw new Error('WebGL required')}
const m4={translation:(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]),perspective:(f,a,n,f2)=>{const q=1/Math.tan(f/2),nf=1/(n-f2);return new Float32Array([q/a,0,0,0,0,q,0,0,0,0,(f2+n)*nf,-1,0,0,2*f2*n*nf,0])},multiply:(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}};
function shader(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x}
const vs='attribute vec4 a_position;attribute vec3 a_normal;attribute vec2 a_texcoord;uniform mat4 u_matrix;varying vec3 v_normal;varying vec2 v_uv;varying vec3 v_view;void main(){gl_Position=u_matrix*a_position;v_normal=a_normal;v_uv=a_texcoord;v_view=vec3(0.,0.,4.8)-a_position.xyz;}';
const fs='precision mediump float;varying vec3 v_normal;varying vec2 v_uv;varying vec3 v_view;uniform sampler2D u_texture;uniform vec3 u_light;void main(){vec3 n=normalize(v_normal),v=normalize(v_view),h=normalize(u_light+v);float d=max(dot(n,u_light),0.);float s=d>0.?pow(max(dot(n,h),0.),18.)*.14:0.;vec4 t=texture2D(u_texture,v_uv);vec3 amb=vec3(.25,.20,.16),lc=vec3(1.,.94,.82);gl_FragColor=vec4(t.rgb*(amb+d*1.22*lc)+s,t.a);}';
const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
const loc={p:gl.getAttribLocation(prog,'a_position'),n:gl.getAttribLocation(prog,'a_normal'),uv:gl.getAttribLocation(prog,'a_texcoord'),m:gl.getUniformLocation(prog,'u_matrix'),tex:gl.getUniformLocation(prog,'u_texture'),light:gl.getUniformLocation(prog,'u_light')};
const B={p:gl.createBuffer(),n:gl.createBuffer(),uv:gl.createBuffer(),i:gl.createBuffer()},texture=gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img)};img.src=TEXTURE;
let cloth,viewProj=new Float32Array(16),grab=null,mx=0,my=0,time=0,fov=45*Math.PI/180,cam=4.9;
function addC(a,b,k){cloth.cs.push({a,b,rest:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),k})}
function build(){
  const r=CFG.ratio;let W,H;if(r>=1){W=3.45;H=W/r}else{H=3.45;W=H*r}
  const short=30,long=Math.round(short*Math.max(r,1/r)),cols=r>=1?Math.min(54,long):short,rows=r>=1?short:Math.min(54,long);
  cloth={W,H,cols,rows,ps:[],cs:[],idx:[],startX:-W/2,startY:H/2,sx:W/(cols-1),sy:H/(rows-1)};
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const X=cloth.startX+x*cloth.sx,Y=cloth.startY-y*cloth.sy;cloth.ps.push({x:X,y:Y,z:0,ox:X,oy:Y,oz:0,p:y===0,u:x/(cols-1),v:y/(rows-1)})}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*cols+x;if(x<cols-1)addC(cloth.ps[i],cloth.ps[i+1],1);if(y<rows-1)addC(cloth.ps[i],cloth.ps[i+cols],1);if(x<cols-1&&y<rows-1){addC(cloth.ps[i],cloth.ps[i+cols+1],.9);addC(cloth.ps[i+1],cloth.ps[i+cols],.9)}if(x<cols-2)addC(cloth.ps[i],cloth.ps[i+2],.45);if(y<rows-2)addC(cloth.ps[i],cloth.ps[i+cols*2],.45)}
  for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const i=y*cols+x;cloth.idx.push(i,i+cols,i+1,i+1,i+cols,i+cols+1)}
  const N=cloth.ps.length;cloth.pos=new Float32Array(N*3);cloth.norm=new Float32Array(N*3);cloth.uv=new Float32Array(N*2);cloth.vn=Array.from({length:N},()=>({x:0,y:0,z:0}));cloth.ps.forEach((p,i)=>{cloth.uv[i*2]=p.u;cloth.uv[i*2+1]=p.v});
  gl.bindBuffer(gl.ARRAY_BUFFER,B.uv);gl.bufferData(gl.ARRAY_BUFFER,cloth.uv,gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,B.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(cloth.idx),gl.STATIC_DRAW);grab=null;dot.style.display='none'
}
function resize(){canvas.width=wrap.clientWidth;canvas.height=wrap.clientHeight;gl.viewport(0,0,canvas.width,canvas.height)}addEventListener('resize',resize);resize();build();
function proj(p,m){const q=p.x*m[3]+p.y*m[7]+p.z*m[11]+m[15];if(!q)return null;const nx=(p.x*m[0]+p.y*m[4]+p.z*m[8]+m[12])/q,ny=(p.x*m[1]+p.y*m[5]+p.z*m[9]+m[13])/q;return{x:(nx+1)*.5*canvas.width,y:(1-ny)*.5*canvas.height}}
function eventPos(e){const r=wrap.getBoundingClientRect(),t=e.touches?.[0]||e.changedTouches?.[0]||e;return{x:t.clientX-r.left,y:t.clientY-r.top}}
function closest(x,y){let best=null,d=2400;for(const p of cloth.ps){if(p.p)continue;const q=proj(p,viewProj);if(!q)continue;const dd=(q.x-x)**2+(q.y-y)**2;if(dd<d){d=dd;best=p}}return best}
function down(e){const p=eventPos(e);mx=p.x;my=p.y;grab=closest(mx,my);if(grab){dot.style.display='block';dot.style.left=mx+'px';dot.style.top=my+'px'}}
function move(e){if(!grab)return;if(e.cancelable)e.preventDefault();const p=eventPos(e);mx=p.x;my=p.y}
function up(){grab=null;dot.style.display='none'}
wrap.addEventListener('mousedown',down);addEventListener('mousemove',move,{passive:false});addEventListener('mouseup',up);wrap.addEventListener('touchstart',down,{passive:false});addEventListener('touchmove',move,{passive:false});addEventListener('touchend',up);wrap.addEventListener('dblclick',build);
function frame(){
  requestAnimationFrame(frame);time+=.016;const aspect=canvas.width/canvas.height,pr=m4.perspective(fov,aspect,.1,100),vw=m4.translation(0,0,-cam);viewProj=m4.multiply(pr,vw);
  const damp=CFG.damping,gravity=-.010*CFG.gravity*CFG.weight,windAmp=.00105*CFG.wind;
  for(const p of cloth.ps){if(p.p)continue;p.z+=Math.sin(time*2.1+p.x*3.1+p.y*1.7)*windAmp;let vx=(p.x-p.ox)*damp,vy=(p.y-p.oy)*damp,vz=(p.z-p.oz)*damp;p.ox=p.x;p.oy=p.y;p.oz=p.z;p.x+=vx;p.y+=vy+gravity;p.z+=vz;if(p.z>2.5)p.z=2.5;if(p.z<-1.5)p.z=-1.5}
  if(grab){const ndcX=mx/canvas.width*2-1,dx=ndcX*aspect*(cam*Math.tan(fov/2)),dy=-(my/canvas.height*2-1)*2.5;grab.x+=(dx-grab.x)*.22;grab.y+=(dy-grab.y)*.22;grab.z+=(1.25-grab.z)*.22}
  const iters=Math.round(18+CFG.stiffness*20);for(let it=0;it<iters;it++){for(const c of cloth.cs){let dx=c.a.x-c.b.x,dy=c.a.y-c.b.y,dz=c.a.z-c.b.z,dist=Math.hypot(dx,dy,dz);if(!dist)continue;const stiff=Math.max(.1,Math.min(1,c.k*CFG.stiffness*(.55+.45*CFG.elasticity))),df=((dist-c.rest)/dist)*.5*stiff,ox=dx*df,oy=dy*df,oz=dz*df;if(!c.a.p&&c.a!==grab){c.a.x-=ox;c.a.y-=oy;c.a.z-=oz}if(!c.b.p&&c.b!==grab){c.b.x+=ox;c.b.y+=oy;c.b.z+=oz}}for(let x=0;x<cloth.cols;x++){const p=cloth.ps[x];p.x=cloth.startX+x*cloth.sx;p.y=cloth.startY;p.z=0}}
  cloth.vn.forEach(n=>{n.x=n.y=n.z=0});for(let i=0;i<cloth.idx.length;i+=3){const i0=cloth.idx[i],i1=cloth.idx[i+1],i2=cloth.idx[i+2],p0=cloth.ps[i0],p1=cloth.ps[i1],p2=cloth.ps[i2],ux=p1.x-p0.x,uy=p1.y-p0.y,uz=p1.z-p0.z,vx=p2.x-p0.x,vy=p2.y-p0.y,vz=p2.z-p0.z,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const j of [i0,i1,i2]){cloth.vn[j].x+=nx;cloth.vn[j].y+=ny;cloth.vn[j].z+=nz}}
  cloth.ps.forEach((p,i)=>{cloth.pos[i*3]=p.x;cloth.pos[i*3+1]=p.y;cloth.pos[i*3+2]=p.z;const n=cloth.vn[i],l=Math.hypot(n.x,n.y,n.z)||1;cloth.norm[i*3]=n.x/l;cloth.norm[i*3+1]=n.y/l;cloth.norm[i*3+2]=n.z/l});
  gl.bindBuffer(gl.ARRAY_BUFFER,B.p);gl.bufferData(gl.ARRAY_BUFFER,cloth.pos,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,B.n);gl.bufferData(gl.ARRAY_BUFFER,cloth.norm,gl.DYNAMIC_DRAW);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(prog);gl.uniformMatrix4fv(loc.m,false,viewProj);let lx=.45,ly=.82,lz=1,ll=Math.hypot(lx,ly,lz);gl.uniform3f(loc.light,lx/ll,ly/ll,lz/ll);gl.bindBuffer(gl.ARRAY_BUFFER,B.p);gl.enableVertexAttribArray(loc.p);gl.vertexAttribPointer(loc.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,B.n);gl.enableVertexAttribArray(loc.n);gl.vertexAttribPointer(loc.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,B.uv);gl.enableVertexAttribArray(loc.uv);gl.vertexAttribPointer(loc.uv,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(loc.tex,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,B.i);gl.drawElements(gl.TRIANGLES,cloth.idx.length,gl.UNSIGNED_SHORT,0);if(grab){const q=proj(grab,viewProj);if(q){dot.style.left=q.x+'px';dot.style.top=q.y+'px'}}
}frame();
</script></body></html>`;
  }

  async function exportInteractive(){
    const oldSuppress=state.suppressGuides;
    state.suppressGuides=true; mark();
    try{ if(typeof updateTexture==='function') updateTexture(); }catch{}
    const texture=texCanvas.toDataURL('image/png');
    state.suppressGuides=oldSuppress; mark();
    const html=interactiveViewerHTML(texture,state.format,state.fabric,state.projectName);
    downloadBlob(new Blob([html],{type:'text/html;charset=utf-8'}),'BANDEROLAS_INTERACTIVE_'+state.format.replace(':','x')+'_'+Date.now()+'.html');
    const hasVideo=state.elements.some(e=>e.type==='video');
    toast(hasVideo?'Interactive HTML exported · video captured at current frame':'Interactive HTML exported · motion + drag preserved');
  }

  const exportDetails=summaryDetails('Export')||summaryDetails('Export / Import');
  if(exportDetails && !document.querySelector('#fix4-export-interactive')){
    const body=exportDetails.querySelector('.section-body');
    const b=document.createElement('button');b.id='fix4-export-interactive';b.className='btn-solid';b.style.cssText='width:100%;margin-top:8px';b.textContent='DOWNLOAD INTERACTIVE HTML · MOTION + DRAG';
    b.onclick=exportInteractive;body?.prepend(b);
  }

  try{localStorage.removeItem(LEGACY_AUTOSAVE)}catch{}
  const version=document.querySelector('.panel-header .version');if(version)version.textContent='FIX 4.0';
  blankProject({history:false,resetFormat:true});
})();
