'use strict';
(() => {
  const VERSION='5.4A', PANEL='restaurant-menu-pages-section', BOX='restaurant-extended-page-controls', PROJECTS='banderolas-pro-projects-v2';
  const $=s=>document.querySelector(s), deep=v=>JSON.parse(JSON.stringify(v));
  const HEIGHTS=Object.freeze({
    standard:{label:'Standard · 9:16',key:'9:16',w:1080,h:1920},
    tall:{label:'Tall · 9:24',key:'9:24',w:1080,h:2880},
    long:{label:'Long · 9:32',key:'9:32',w:1080,h:3840},
    extra:{label:'Extra Long · 9:40',key:'9:40',w:1080,h:4800}
  });
  const EXTENDED=new Set(['9:24','9:32','9:40','9:custom']), MIN=1920, MAX=4800;
  let backdropBusy=false, injectTimer=0;

  const api=()=>window.BanderolasRestaurantPages||null;
  const doc=()=>api()?.getDocument?.()||state.restaurantDocument||null;
  const page=(d=doc())=>d?.pages?.find(p=>p.id===d.activePageId)||d?.pages?.[0]||null;
  const clampH=v=>Math.max(MIN,Math.min(MAX,Math.round(Number(v)||MIN)));
  function registerKnown(){
    if(typeof fmtMap==='undefined')return;
    fmtMap['9:24']={w:1080,h:2880};fmtMap['9:32']={w:1080,h:3840};fmtMap['9:40']={w:1080,h:4800};
    if(!fmtMap['9:custom'])fmtMap['9:custom']={w:1080,h:2400};
  }
  function registerPage(p){
    registerKnown();if(typeof fmtMap==='undefined'||!p)return;
    if(p.format==='9:custom')fmtMap['9:custom']={w:1080,h:clampH(p.documentSize?.height||2400)};
  }
  function registerDoc(d){registerKnown();for(const p of d?.pages||[])registerPage(p);}
  function dims(pf){
    registerKnown();const p=typeof pf==='object'?pf:null,k=p?.format||pf||state.format||'9:16';
    if(k==='9:custom')return {key:k,w:1080,h:clampH(p?.documentSize?.height||page()?.documentSize?.height||2400),preset:'custom'};
    const f=typeof fmtMap!=='undefined'?fmtMap[k]:null;
    const preset=Object.entries(HEIGHTS).find(([,v])=>v.key===k)?.[0]||null;
    return {key:k,w:f?.w||1080,h:f?.h||1920,preset};
  }
  function meta(p){
    if(!p)return null;const d=dims(p);
    p.documentSize={...(p.documentSize||{}),version:VERSION,preset:d.preset||p.documentSize?.preset||'standard',width:d.w,height:d.h,formatKey:d.key};
    return p.documentSize;
  }
  const portrait=k=>k==='9:16'||EXTENDED.has(k);
  const role=(els,r)=>(els||[]).find(e=>e.role===r);

  function reprojectElements(elements,from,to){
    const sx=from.w/to.w,sy=from.h/to.h;
    return deep(elements||[]).map(el=>{
      if(el.role==='menu-backdrop')return {...el,x:0,y:0,w:1,h:1,fit:'fill'};
      const out={...el,x:Number(el.x||0)*sx,w:Number(el.w||0)*sx}, nh=Number(el.h||0)*sy;
      out.h=nh;
      if(el.role==='cta'){
        const bottom=Math.max(0,1-(Number(el.y||0)+Number(el.h||0)))*from.h;
        out.y=Math.max(0,1-bottom/to.h-nh);
      }else out.y=Number(el.y||0)*sy;
      return out;
    });
  }

  const baseComp=typeof rebuildCompositor==='function'?rebuildCompositor:null;
  if(baseComp&&!baseComp.__extended54a){
    const wrapped=function(){registerPage(page());return baseComp();};wrapped.__extended54a=true;rebuildCompositor=wrapped;
  }
  const baseCloth=typeof rebuildCloth==='function'?rebuildCloth:null;
  if(baseCloth&&!baseCloth.__extended54a){
    const wrapped=function(){registerPage(page());return baseCloth();};wrapped.__extended54a=true;rebuildCloth=wrapped;
  }

  function tokens(){
    const key=state.restaurantMenu?.style||'dark',styles=window.BanderolasRestaurantMenuControls?.styles||{};
    return {key,s:styles[key]||styles.dark||{bg0:'#18130f',bg1:'#0c0907',bg2:'#050403',accent:'#c7a767',text:'#f0e7d6'}};
  }
  function rgba(hex,a){
    const h=String(hex||'#000').replace('#',''),v=h.length===3?h.split('').map(x=>x+x).join(''):h.padEnd(6,'0').slice(0,6),n=parseInt(v,16)||0;
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  const blob=c=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Backdrop export failed')),'image/webp',.93));
  async function makeBackdrop(w,h){
    const {s}=tokens(),c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
    const grad=g.createLinearGradient(0,0,w,h);grad.addColorStop(0,s.bg0);grad.addColorStop(.48,s.bg1);grad.addColorStop(1,s.bg2);g.fillStyle=grad;g.fillRect(0,0,w,h);
    const glow=g.createRadialGradient(w*.78,320,20,w*.72,340,Math.min(w*.72,760));glow.addColorStop(0,rgba(s.accent,.16));glow.addColorStop(1,rgba(s.accent,0));g.fillStyle=glow;g.fillRect(0,0,w,Math.min(h,1100));
    const a=Math.round(w*.052),b=Math.round(w*.067);g.strokeStyle=rgba(s.accent,.55);g.lineWidth=2;g.strokeRect(a,54,w-a*2,h-108);g.strokeStyle=rgba(s.accent,.20);g.lineWidth=1;g.strokeRect(b,70,w-b*2,h-140);
    g.fillStyle=rgba(s.text,.018);g.fillRect(w*.072,255,w*.856,420);g.strokeStyle=rgba(s.accent,.34);g.strokeRect(w*.072,255,w*.856,420);
    [738,1018,1300,1560,1740].filter(y=>y<h-120).forEach(y=>{g.beginPath();g.moveTo(w*.076,y);g.lineTo(w*.924,y);g.stroke();});
    const dots=Math.min(18000,Math.floor(w*h/260));for(let i=0;i<dots;i++){g.fillStyle=rgba(s.text,Math.random()*.018);const z=.3+Math.random();g.fillRect(Math.random()*w,Math.random()*h,z,z);}
    return blob(c);
  }
  async function loadAsset(id){
    if(typeof runtimeAssets!=='undefined'&&runtimeAssets.has(id))return true;
    if(typeof getAsset!=='function'||typeof loadRuntimeAsset!=='function')return false;
    const b=await getAsset(id);if(!b)return false;await loadRuntimeAsset(id,b,'image');return true;
  }
  async function ensureBackdrop(force=false){
    if(backdropBusy)return;const p=page();if(!p||!portrait(p.format)||!role(state.elements,'menu-backdrop'))return;
    backdropBusy=true;
    try{
      const m=meta(p),{key:style}=tokens();let id=m.backdropAssetId;
      if(!force&&id&&m.backdropStyle===style&&m.backdropHeight===m.height)await loadAsset(id);
      else{
        const b=await makeBackdrop(m.width,m.height);id=`restaurant-extended-backdrop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
        if(typeof putAsset==='function')await putAsset(id,b);if(typeof loadRuntimeAsset==='function')await loadRuntimeAsset(id,b,'image');
        Object.assign(m,{backdropAssetId:id,backdropStyle:style,backdropHeight:m.height});
      }
      for(const bg of [role(state.elements,'menu-backdrop'),role(p.elements,'menu-backdrop')])if(bg)Object.assign(bg,{assetId:id,x:0,y:0,w:1,h:1,fit:'fill'});
      state.needsTextureUpdate=true;api()?.saveActive?.({captureGlobal:false});
    }catch(err){console.warn('[Extended Page 5.4A]',err);}finally{backdropBusy=false;}
  }

  function target(preset,custom){
    if(preset==='custom')return {preset,key:'9:custom',w:1080,h:clampH(custom)};
    const v=HEIGHTS[preset]||HEIGHTS.standard;return {preset,key:v.key,w:v.w,h:v.h};
  }
  async function applyHeight(preset='standard',custom){
    const a=api(),p=page();if(!a||!p)return;if(!portrait(p.format)){toast?.('Page Height requires Portrait / 9:16');return;}
    a.saveActive?.();const from=dims(p),to=target(preset,custom);if(from.key===to.key&&from.h===to.h){renderControls();return;}
    if(typeof pushHistory==='function')pushHistory();
    const transformed=reprojectElements(state.elements,from,to);
    if(to.key==='9:custom')fmtMap['9:custom']={w:to.w,h:to.h};
    p.format=to.key;p.documentSize={...(p.documentSize||{}),version:VERSION,preset:to.preset,width:to.w,height:to.h,formatKey:to.key,backdropAssetId:null};
    state.format=to.key;state.elements=transformed;p.elements=deep(transformed);
    const surface=typeof state.surface!=='undefined'?deep(state.surface):undefined,mode=state.mode;
    rebuildCompositor?.();await hydrateAssets?.();rebuildCloth?.();
    if(surface!==undefined)state.surface=surface;state.mode=mode;
    await ensureBackdrop(true);syncUI?.();renderLayers?.();renderProperties?.();state.needsTextureUpdate=true;a.saveActive?.({captureGlobal:false});
    renderControls();toast?.(`${p.name} · ${to.w}×${to.h} · page extended`);
  }
  async function extendNext(){
    const p=page();if(!p)return;const h=dims(p).h,order=['standard','tall','long','extra'];let i=order.findIndex(k=>HEIGHTS[k].h>=h);if(i<0)i=0;
    const next=order[Math.min(order.length-1,i+1)];if(HEIGHTS[next].h===h){toast?.('Maximum preset height reached');return;}await applyHeight(next);
  }
  function presetFor(p){const d=dims(p);if(d.key==='9:custom')return 'custom';return Object.entries(HEIGHTS).find(([,v])=>v.key===d.key)?.[0]||'standard';}
  function patchFormatSelect(p){
    const s=$('#restaurant-page-format');if(!s||!p||!EXTENDED.has(p.format))return;
    if(![...s.options].some(o=>o.value===p.format)){const o=document.createElement('option');o.value=p.format;o.textContent=`${p.format==='9:custom'?'Custom':p.format} · Extended`;s.appendChild(o);}s.value=p.format;
  }
  function renderControls(){
    const body=$(`#${PANEL} .section-body`),p=page();if(!body||!p)return;meta(p);registerPage(p);patchFormatSelect(p);
    $('#'+BOX)?.remove();const d=dims(p),pre=presetFor(p),ok=portrait(p.format);
    body.insertAdjacentHTML('beforeend',`<div id="${BOX}" style="border-top:1px solid #332a25;margin-top:10px;padding-top:10px">
      <div class="micro-label">EXTENDED PAGE · 5.4A</div>
      <div class="status ${ok?'ok':'warn'}" style="margin:6px 0 9px">${ok?`DOCUMENT ${d.w} × ${d.h} · ${pre.toUpperCase()} · existing layers keep their pixel size; new space is added below.`:'Switch Page format to 9:16 Portrait before extending.'}</div>
      <div class="form-group"><label>Page Height</label><select id="restaurant-page-height-preset" class="form-control" ${ok?'':'disabled'}>${Object.entries(HEIGHTS).map(([k,v])=>`<option value="${k}" ${pre===k?'selected':''}>${v.label}</option>`).join('')}<option value="custom" ${pre==='custom'?'selected':''}>Custom · 1920–4800 px</option></select></div>
      <div id="restaurant-custom-height-row" class="form-group" style="${pre==='custom'?'':'display:none'}"><label>Custom height · px</label><input id="restaurant-custom-height" class="form-control" type="number" min="${MIN}" max="${MAX}" step="40" value="${d.h}"></div>
      <div class="grid2"><button id="restaurant-apply-height" class="mini-btn" ${ok?'':'disabled'}>Apply Height</button><button id="restaurant-extend-page" class="mini-btn" ${ok?'':'disabled'}>Extend Page</button></div>
      <div class="status" style="margin-top:8px">5.4A does not auto-paginate or split sections. It reuses the current compositor and the existing ratio-aware Classic geometry; ThreeUI/Paper source, Variant, materials and motion are not modified.</div>
    </div>`);
    const sel=$('#restaurant-page-height-preset'),row=$('#restaurant-custom-height-row'),input=$('#restaurant-custom-height');
    sel?.addEventListener('change',()=>{row.style.display=sel.value==='custom'?'':'none';if(sel.value!=='custom')input.value=HEIGHTS[sel.value]?.h||1920;});
    $('#restaurant-apply-height')?.addEventListener('click',()=>applyHeight(sel?.value||'standard',input?.value));
    $('#restaurant-extend-page')?.addEventListener('click',extendNext);
  }
  function schedule(ms=0){clearTimeout(injectTimer);injectTimer=setTimeout(()=>{renderControls();ensureBackdrop(false);},ms);}

  function wrapPersistence(){
    if(typeof restoreSnapshot==='function'&&!restoreSnapshot.__extended54a){
      const prev=restoreSnapshot,wrapped=async s=>{registerDoc(s?.restaurantDocument);await prev(s);registerDoc(state.restaurantDocument);schedule(0);};wrapped.__extended54a=true;restoreSnapshot=wrapped;
    }
    if(typeof openProject==='function'&&!openProject.__extended54a){
      const prev=openProject,wrapped=async function(){
        const id=$('#project-select')?.value;let saved=null;try{saved=JSON.parse(localStorage.getItem(PROJECTS)||'[]').find(p=>p.id===id)||null;}catch{}
        registerDoc(saved?.restaurantDocument);await prev();
        if(saved?.restaurantDocument){state.restaurantDocument=deep(saved.restaurantDocument);registerDoc(state.restaurantDocument);const p=page(state.restaurantDocument);if(p)await api()?.activatePage?.(p.id,{saveCurrent:false});}
        schedule(0);await ensureBackdrop(false);
      };wrapped.__extended54a=true;openProject=wrapped;const b=$('#open-project');if(b)b.onclick=openProject;
    }
  }

  document.addEventListener('change',e=>{
    if(e.target?.id==='restaurant-page-format'){
      const p=page();if(p&&EXTENDED.has(p.format)&&e.target.value==='9:16'){e.stopImmediatePropagation();applyHeight('standard');return;}schedule(30);
    }
    if(e.target?.id==='restaurant-page-select'||e.target?.id==='restaurant-page-name')schedule(80);
    if(e.target?.id==='rm-style')setTimeout(()=>ensureBackdrop(true),80);
  },true);
  document.addEventListener('click',e=>{
    const id=e.target?.id||'';
    if(['restaurant-page-prev','restaurant-page-next','restaurant-page-add','restaurant-page-duplicate','restaurant-page-layout','restaurant-page-delete','restaurant-page-up','restaurant-page-down'].includes(id))schedule(120);
    if(id==='apply-restaurant-menu-premium')schedule(1500);
    if(id==='rm-refresh-brand')setTimeout(()=>ensureBackdrop(true),600);
  },true);

  function boot(){registerKnown();registerDoc(state.restaurantDocument);wrapPersistence();schedule(100);}
  window.BanderolasExtendedRestaurantPage=Object.freeze({version:VERSION,HEIGHTS,MIN_CUSTOM:MIN,MAX_CUSTOM:MAX,applyHeight,extendNext,reprojectElements,dimsFor:dims,ensureActiveBackdrop:ensureBackdrop});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
