'use strict';
(() => {
  const VERSION='5.4A';
  const PANEL_SECTION_ID='restaurant-menu-pages-section';
  const CONTROLS_ID='restaurant-extended-page-controls';
  const PROJECTS_KEY='banderolas-pro-projects-v2';
  const $=s=>document.querySelector(s);
  const deep=v=>JSON.parse(JSON.stringify(v));
  const HEIGHTS=Object.freeze({
    standard:Object.freeze({label:'Standard · 9:16',key:'9:16',width:1080,height:1920}),
    tall:Object.freeze({label:'Tall · 9:24',key:'9:24',width:1080,height:2880}),
    long:Object.freeze({label:'Long · 9:32',key:'9:32',width:1080,height:3840}),
    extra:Object.freeze({label:'Extra Long · 9:40',key:'9:40',width:1080,height:4800})
  });
  const EXTENDED_KEYS=new Set(['9:24','9:32','9:40','9:custom']);
  const MIN_CUSTOM=1920,MAX_CUSTOM=4800;
  let backdropBusy=false,observer=null,injectQueued=false;

  function pagesApi(){return window.BanderolasRestaurantPages||null;}
  function documentState(){return pagesApi()?.getDocument?.()||state.restaurantDocument||null;}
  function activePage(doc=documentState()){
    if(!doc?.pages?.length)return null;
    return doc.pages.find(p=>p.id===doc.activePageId)||doc.pages[0]||null;
  }
  function clampHeight(v){return Math.max(MIN_CUSTOM,Math.min(MAX_CUSTOM,Math.round(Number(v)||MIN_CUSTOM)));}
  function registerKnownFormats(){
    if(typeof fmtMap==='undefined')return;
    fmtMap['9:24']={w:1080,h:2880};
    fmtMap['9:32']={w:1080,h:3840};
    fmtMap['9:40']={w:1080,h:4800};
    if(!fmtMap['9:custom'])fmtMap['9:custom']={w:1080,h:2400};
  }
  function registerPageFormat(page){
    registerKnownFormats();
    if(typeof fmtMap==='undefined'||!page)return;
    if(page.format==='9:custom'){
      const h=clampHeight(page.documentSize?.height||2400);
      fmtMap['9:custom']={w:1080,h};
    }
  }
  function registerDocumentFormats(doc){
    registerKnownFormats();
    for(const page of doc?.pages||[])registerPageFormat(page);
  }
  function dimsFor(pageOrFormat){
    registerKnownFormats();
    const page=typeof pageOrFormat==='object'?pageOrFormat:null;
    const key=page?.format||pageOrFormat||state.format||'9:16';
    if(key==='9:custom'){
      const h=clampHeight(page?.documentSize?.height||activePage()?.documentSize?.height||2400);
      return {key,width:1080,height:h,preset:'custom'};
    }
    const f=typeof fmtMap!=='undefined'?fmtMap[key]:null;
    const preset=Object.entries(HEIGHTS).find(([,v])=>v.key===key)?.[0]||null;
    return {key,width:f?.w||1080,height:f?.h||1920,preset};
  }
  function metadataFor(page){
    if(!page)return null;
    const d=dimsFor(page);
    page.documentSize={
      ...(page.documentSize||{}),
      version:VERSION,
      preset:d.preset||page.documentSize?.preset||'standard',
      width:d.width,
      height:d.height,
      formatKey:d.key
    };
    return page.documentSize;
  }
  function isPortraitHeightFormat(key){return key==='9:16'||EXTENDED_KEYS.has(key);}
  function roleFrom(elements,role){return (elements||[]).find(el=>el.role===role);}
  function reprojectElements(elements,oldDims,newDims){
    const sx=oldDims.width/newDims.width;
    const sy=oldDims.height/newDims.height;
    return deep(elements||[]).map(el=>{
      if(el.role==='menu-backdrop')return {...el,x:0,y:0,w:1,h:1};
      const out={...el,x:Number(el.x||0)*sx,w:Number(el.w||0)*sx};
      const h=Number(el.h||0)*sy;
      if(el.role==='cta'){
        const oldBottom=Math.max(0,1-(Number(el.y||0)+Number(el.h||0)))*oldDims.height;
        out.h=h;
        out.y=Math.max(0,1-(oldBottom/newDims.height)-h);
      }else{
        out.y=Number(el.y||0)*sy;
        out.h=h;
      }
      return out;
    });
  }

  const baseRebuildCompositor=typeof rebuildCompositor==='function'?rebuildCompositor:null;
  if(baseRebuildCompositor&&!baseRebuildCompositor.__extendedPage54a){
    const wrapped=function(){
      const page=activePage();
      registerPageFormat(page);
      return baseRebuildCompositor();
    };
    wrapped.__extendedPage54a=true;
    rebuildCompositor=wrapped;
  }
  const baseRebuildCloth=typeof rebuildCloth==='function'?rebuildCloth:null;
  if(baseRebuildCloth&&!baseRebuildCloth.__extendedPage54a){
    const wrapped=function(){
      const page=activePage();
      registerPageFormat(page);
      return baseRebuildCloth();
    };
    wrapped.__extendedPage54a=true;
    rebuildCloth=wrapped;
  }

  function styleTokens(){
    const style=state.restaurantMenu?.style||'dark';
    const available=window.BanderolasRestaurantMenuControls?.styles||{};
    return {key:style,s:available[style]||available.dark||{
      bg0:'#18130f',bg1:'#0c0907',bg2:'#050403',accent:'#c7a767',text:'#f0e7d6'
    }};
  }
  function hexA(hex,a){
    const h=String(hex||'#000000').replace('#','');
    const v=h.length===3?h.split('').map(x=>x+x).join(''):h.padEnd(6,'0').slice(0,6);
    const n=parseInt(v,16)||0;
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  const toBlob=(c,type='image/webp',q=.93)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Extended backdrop export failed')),type,q));
  async function makeBackdrop(width,height){
    const {s}=styleTokens();
    const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,width,height);bg.addColorStop(0,s.bg0);bg.addColorStop(.48,s.bg1);bg.addColorStop(1,s.bg2);g.fillStyle=bg;g.fillRect(0,0,width,height);
    const glow=g.createRadialGradient(width*.78,320,20,width*.72,340,Math.min(width*.72,760));glow.addColorStop(0,hexA(s.accent,.16));glow.addColorStop(1,hexA(s.accent,0));g.fillStyle=glow;g.fillRect(0,0,width,Math.min(height,1100));
    const x1=Math.round(width*.052),x2=Math.round(width*.067),bottom=Math.max(54,height-54),bottom2=Math.max(70,height-70);
    g.strokeStyle=hexA(s.accent,.55);g.lineWidth=2;g.strokeRect(x1,54,width-x1*2,bottom-54);
    g.strokeStyle=hexA(s.accent,.20);g.lineWidth=1;g.strokeRect(x2,70,width-x2*2,bottom2-70);
    g.fillStyle=hexA(s.text,.018);g.fillRect(Math.round(width*.072),255,Math.round(width*.856),420);
    g.strokeStyle=hexA(s.accent,.34);g.strokeRect(Math.round(width*.072),255,Math.round(width*.856),420);
    [738,1018,1300,1560,1740].filter(y=>y<height-120).forEach(y=>{g.beginPath();g.moveTo(width*.076,y);g.lineTo(width*.924,y);g.stroke();});
    const dots=Math.min(18000,Math.floor(width*height/260));
    for(let i=0;i<dots;i++){g.fillStyle=hexA(s.text,Math.random()*.018);const z=.3+Math.random();g.fillRect(Math.random()*width,Math.random()*height,z,z);}
    return toBlob(c);
  }
  async function loadBackdropAsset(assetId){
    if(typeof runtimeAssets!=='undefined'&&runtimeAssets.has(assetId))return true;
    if(typeof getAsset!=='function'||typeof loadRuntimeAsset!=='function')return false;
    const blob=await getAsset(assetId);if(!blob)return false;
    await loadRuntimeAsset(assetId,blob,'image');return true;
  }
  async function generateBackdrop(page){
    const meta=metadataFor(page),{key:style}=styleTokens();
    const blob=await makeBackdrop(meta.width,meta.height);
    const assetId=`restaurant-extended-backdrop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
    if(typeof putAsset==='function')await putAsset(assetId,blob);
    if(typeof loadRuntimeAsset==='function')await loadRuntimeAsset(assetId,blob,'image');
    meta.backdropAssetId=assetId;meta.backdropStyle=style;meta.backdropHeight=meta.height;
    return assetId;
  }
  async function ensureActiveBackdrop(force=false){
    if(backdropBusy)return;
    const doc=documentState(),page=activePage(doc);if(!page||!roleFrom(state.elements,'menu-backdrop'))return;
    if(!isPortraitHeightFormat(page.format))return;
    backdropBusy=true;
    try{
      const meta=metadataFor(page),{key:style}=styleTokens();
      let id=meta.backdropAssetId;
      const valid=!force&&id&&meta.backdropStyle===style&&meta.backdropHeight===meta.height;
      if(valid)await loadBackdropAsset(id);else id=await generateBackdrop(page);
      const live=roleFrom(state.elements,'menu-backdrop'),stored=roleFrom(page.elements,'menu-backdrop');
      if(live){live.assetId=id;live.x=0;live.y=0;live.w=1;live.h=1;live.fit='fill';}
      if(stored){stored.assetId=id;stored.x=0;stored.y=0;stored.w=1;stored.h=1;stored.fit='fill';}
      state.needsTextureUpdate=true;
      pagesApi()?.saveActive?.({captureGlobal:false});
    }catch(err){console.warn('[Extended Page 5.4A] backdrop',err);}
    finally{backdropBusy=false;}
  }

  function targetFor(preset,customHeight){
    if(preset==='custom'){
      const h=clampHeight(customHeight);
      return {preset:'custom',key:'9:custom',width:1080,height:h};
    }
    const v=HEIGHTS[preset]||HEIGHTS.standard;
    return {preset,key:v.key,width:v.width,height:v.height};
  }
  async function applyHeight(preset='standard',customHeight){
    const api=pagesApi(),doc=documentState(),page=activePage(doc);
    if(!api||!page)return;
    if(!isPortraitHeightFormat(page.format)){
      if(typeof toast==='function')toast('Page Height requires Portrait / 9:16');
      return;
    }
    api.saveActive?.();
    const oldDims=dimsFor(page),next=targetFor(preset,customHeight);
    if(oldDims.key===next.key&&oldDims.height===next.height){injectControls();return;}
    if(typeof pushHistory==='function')pushHistory();
    const transformed=reprojectElements(state.elements,oldDims,next);
    if(next.key==='9:custom')fmtMap['9:custom']={w:next.width,h:next.height};
    page.format=next.key;
    page.documentSize={...(page.documentSize||{}),version:VERSION,preset:next.preset,width:next.width,height:next.height,formatKey:next.key,backdropAssetId:null};
    state.format=next.key;
    state.elements=transformed;
    page.elements=deep(transformed);
    const guardedSurface=typeof state.surface!=='undefined'?deep(state.surface):undefined;
    const guardedMode=state.mode;
    if(typeof rebuildCompositor==='function')rebuildCompositor();
    if(typeof hydrateAssets==='function')await hydrateAssets();
    if(typeof rebuildCloth==='function')rebuildCloth();
    if(guardedSurface!==undefined)state.surface=guardedSurface;
    state.mode=guardedMode;
    await ensureActiveBackdrop(true);
    if(typeof syncUI==='function')syncUI();
    if(typeof renderLayers==='function')renderLayers();
    if(typeof renderProperties==='function')renderProperties();
    state.needsTextureUpdate=true;
    api.saveActive?.({captureGlobal:false});
    injectControls();
    if(typeof toast==='function')toast(`${page.name} · ${next.width}×${next.height} · existing content preserved`);
  }
  async function extendNext(){
    const page=activePage();if(!page)return;
    const d=dimsFor(page);
    const order=['standard','tall','long','extra'];
    let i=order.findIndex(k=>HEIGHTS[k].height>=d.height);
    if(i<0)i=0;
    const next=order[Math.min(order.length-1,i+1)];
    if(HEIGHTS[next].height===d.height){if(typeof toast==='function')toast('Maximum preset height reached');return;}
    await applyHeight(next);
  }

  function currentPreset(page){
    const d=dimsFor(page);
    if(d.key==='9:custom')return 'custom';
    return Object.entries(HEIGHTS).find(([,v])=>v.key===d.key)?.[0]||'standard';
  }
  function patchPageFormatSelect(page){
    const select=$('#restaurant-page-format');if(!select||!page)return;
    if(EXTENDED_KEYS.has(page.format)){
      if(![...select.options].some(o=>o.value===page.format)){
        const o=document.createElement('option');o.value=page.format;o.textContent=`${dimsFor(page).key==='9:custom'?'Custom':page.format} · Extended`;select.appendChild(o);
      }
      select.value=page.format;
    }
  }
  function controlsHtml(page){
    const d=dimsFor(page),preset=currentPreset(page),eligible=isPortraitHeightFormat(page.format);
    return `<div id="${CONTROLS_ID}" style="border-top:1px solid #332a25;margin-top:10px;padding-top:10px">
      <div class="micro-label">EXTENDED PAGE · 5.4A</div>
      <div class="status ${eligible?'ok':'warn'}" style="margin:6px 0 9px">${eligible?`DOCUMENT ${d.width} × ${d.height} · ${preset.toUpperCase()} · content keeps pixel size; extra space is appended below.`:'Switch Page format to 9:16 Portrait before extending its height.'}</div>
      <div class="form-group"><label>Page Height</label><select id="restaurant-page-height-preset" class="form-control" ${eligible?'':'disabled'}>
        ${Object.entries(HEIGHTS).map(([k,v])=>`<option value="${k}" ${preset===k?'selected':''}>${v.label}</option>`).join('')}
        <option value="custom" ${preset==='custom'?'selected':''}>Custom · 1920–4800 px</option>
      </select></div>
      <div class="form-group" id="restaurant-custom-height-row" style="${preset==='custom'?'':'display:none'}"><label>Custom height · px</label><input id="restaurant-custom-height" class="form-control" type="number" min="${MIN_CUSTOM}" max="${MAX_CUSTOM}" step="40" value="${d.height}"></div>
      <div class="grid2"><button id="restaurant-apply-height" class="mini-btn" ${eligible?'':'disabled'}>Apply Height</button><button id="restaurant-extend-page" class="mini-btn" ${eligible?'':'disabled'}>Extend Page</button></div>
      <div class="status" style="margin-top:8px">No auto-pagination or section splitting in 5.4A. Classic reuses the existing ratio-aware Verlet geometry; Paper receives the same extended document texture. Surface algorithms and Paper variants are untouched.</div>
    </div>`;
  }
  function injectControls(){
    const body=$(`#${PANEL_SECTION_ID} .section-body`),page=activePage();if(!body||!page)return;
    metadataFor(page);registerPageFormat(page);patchPageFormatSelect(page);
    const old=$('#'+CONTROLS_ID);if(old)old.remove();
    body.insertAdjacentHTML('beforeend',controlsHtml(page));
    const preset=$('#restaurant-page-height-preset'),customRow=$('#restaurant-custom-height-row'),custom=$('#restaurant-custom-height');
    preset?.addEventListener('change',()=>{if(customRow)customRow.style.display=preset.value==='custom'?'':'none';if(preset.value!=='custom'&&custom)custom.value=HEIGHTS[preset.value]?.height||1920;});
    $('#restaurant-apply-height')?.addEventListener('click',()=>applyHeight(preset?.value||'standard',custom?.value));
    $('#restaurant-extend-page')?.addEventListener('click',extendNext);
  }
  function scheduleInject(){
    if(injectQueued)return;injectQueued=true;
    queueMicrotask(()=>{injectQueued=false;injectControls();setTimeout(()=>ensureActiveBackdrop(false),0);});
  }

  function wrapPersistence(){
    if(typeof restoreSnapshot==='function'&&!restoreSnapshot.__extendedPage54a){
      const prev=restoreSnapshot;
      const wrapped=async function(s){registerDocumentFormats(s?.restaurantDocument);await prev(s);registerDocumentFormats(state.restaurantDocument);scheduleInject();};
      wrapped.__extendedPage54a=true;restoreSnapshot=wrapped;
    }
    if(typeof openProject==='function'&&!openProject.__extendedPage54a){
      const prev=openProject;
      const wrapped=async function(){
        const id=$('#project-select')?.value;
        let saved=null;
        try{saved=JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]').find(p=>p.id===id)||null;}catch{}
        registerDocumentFormats(saved?.restaurantDocument);
        await prev();
        if(saved?.restaurantDocument){
          state.restaurantDocument=deep(saved.restaurantDocument);
          registerDocumentFormats(state.restaurantDocument);
          const page=activePage(state.restaurantDocument);
          if(page)await pagesApi()?.activatePage?.(page.id,{saveCurrent:false});
        }
        scheduleInject();
        await ensureActiveBackdrop(false);
      };
      wrapped.__extendedPage54a=true;openProject=wrapped;
      const btn=$('#open-project');if(btn)btn.onclick=openProject;
    }
  }

  document.addEventListener('change',e=>{
    if(e.target?.id==='restaurant-page-format'){
      const page=activePage();
      if(page&&EXTENDED_KEYS.has(page.format)&&e.target.value==='9:16'){
        e.stopImmediatePropagation();
        applyHeight('standard');
        return;
      }
      setTimeout(()=>{const p=activePage();if(p&&!EXTENDED_KEYS.has(p.format))metadataFor(p);scheduleInject();},0);
    }
    if(e.target?.id==='rm-style')setTimeout(()=>ensureActiveBackdrop(true),40);
  },true);
  document.addEventListener('click',e=>{
    if(e.target?.id==='rm-refresh-brand')setTimeout(()=>ensureActiveBackdrop(true),520);
  },true);

  function boot(){
    registerKnownFormats();registerDocumentFormats(state.restaurantDocument);wrapPersistence();scheduleInject();
    const section=$('#'+PANEL_SECTION_ID);
    if(section&&!observer){observer=new MutationObserver(scheduleInject);observer.observe(section,{childList:true,subtree:true});}
    setTimeout(()=>ensureActiveBackdrop(false),250);
  }

  window.BanderolasExtendedRestaurantPage=Object.freeze({
    version:VERSION,HEIGHTS,MIN_CUSTOM,MAX_CUSTOM,applyHeight,extendNext,reprojectElements,dimsFor,ensureActiveBackdrop
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
