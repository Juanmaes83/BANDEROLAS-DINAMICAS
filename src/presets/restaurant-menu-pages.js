'use strict';
(() => {
  const VERSION='5.3';
  const PANEL_ID='restaurant-menu-pages-section';
  const $=s=>document.querySelector(s);
  const deep=v=>JSON.parse(JSON.stringify(v));
  const uidSafe=p=>typeof uid==='function'?uid(p):`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const GLOBAL_INPUTS=new Set(['rm-name','rm-claim','rm-location','rm-style','rm-phone','rm-web','rm-instagram','rm-address']);

  function currentMenu(){ return typeof state!=='undefined' && state.restaurantMenu ? state.restaurantMenu : null; }
  function currentElements(){ return typeof state!=='undefined' ? state.elements || [] : []; }
  function roleFrom(elements,role){ return (elements||[]).find(e=>e.role===role); }
  function role(role){ return roleFrom(currentElements(),role); }
  function isRestaurantActive(){ return !!currentMenu() && !!role('menu-backdrop'); }

  function makeGlobal(){
    const m=currentMenu()||{};
    return {
      style:m.style||'dark',
      restaurant:{name:m.restaurant?.name||'LUME',claim:m.restaurant?.claim||'COCINA DE PRODUCTO · FUEGO · TEMPORADA',location:m.restaurant?.location||'COSTA MEDITERRÁNEA'},
      reservations:deep(m.reservations||{}),
      brandAssetIds:{logo:role('logo')?.assetId||null,backdrop:role('menu-backdrop')?.assetId||null}
    };
  }

  function capturePage(name,id){
    if(window.BanderolasRestaurantMenuControls?.syncFromLayers) window.BanderolasRestaurantMenuControls.syncFromLayers(false);
    return {id:id||uidSafe('page'),name:name||'Page',format:state.format||'9:16',layout:state.layout||'free',elements:deep(currentElements()),restaurantMenu:deep(currentMenu()),updatedAt:new Date().toISOString()};
  }

  function ensureDocument(force=false){
    if(typeof state==='undefined') return null;
    if(state.restaurantDocument?.version===VERSION) return state.restaurantDocument;
    if(!force&&!isRestaurantActive()) return null;
    const first=capturePage('Page 1 · Menu');
    state.restaurantDocument={version:VERSION,mode:'single-physical-sheet',activePageId:first.id,global:makeGlobal(),pages:[first]};
    return state.restaurantDocument;
  }

  function pageIndex(doc=ensureDocument()){
    if(!doc) return -1;
    const found=doc.pages.findIndex(p=>p.id===doc.activePageId);
    return found<0?0:found;
  }

  function syncGlobalFromActive(){
    const doc=ensureDocument(),m=currentMenu();
    if(!doc||!m) return;
    doc.global=doc.global||makeGlobal();
    doc.global.style=m.style||doc.global.style||'dark';
    doc.global.restaurant={name:m.restaurant?.name||doc.global.restaurant?.name||'LUME',claim:m.restaurant?.claim||doc.global.restaurant?.claim||'',location:m.restaurant?.location||doc.global.restaurant?.location||''};
    doc.global.reservations=deep(m.reservations||doc.global.reservations||{});
    const logo=role('logo'),backdrop=role('menu-backdrop');
    doc.global.brandAssetIds={logo:logo?.assetId||doc.global.brandAssetIds?.logo||null,backdrop:backdrop?.assetId||doc.global.brandAssetIds?.backdrop||null};
  }

  function applyGlobalToPage(page,doc=ensureDocument()){
    if(!page||!doc?.global) return page;
    const g=doc.global;
    page.restaurantMenu=page.restaurantMenu||{};
    page.restaurantMenu.style=g.style||page.restaurantMenu.style||'dark';
    page.restaurantMenu.restaurant={...(page.restaurantMenu.restaurant||{}),...(deep(g.restaurant||{}))};
    page.restaurantMenu.reservations=deep(g.reservations||page.restaurantMenu.reservations||{});
    const logo=roleFrom(page.elements,'logo'),backdrop=roleFrom(page.elements,'menu-backdrop');
    if(logo&&g.brandAssetIds?.logo)logo.assetId=g.brandAssetIds.logo;
    if(backdrop&&g.brandAssetIds?.backdrop)backdrop.assetId=g.brandAssetIds.backdrop;
    return page;
  }

  function saveActive({captureGlobal=true}={}){
    const doc=ensureDocument();if(!doc)return;
    const idx=pageIndex(doc),old=doc.pages[idx];if(!old)return;
    if(window.BanderolasRestaurantMenuControls?.syncFromLayers)window.BanderolasRestaurantMenuControls.syncFromLayers(false);
    old.format=state.format||old.format;old.layout=state.layout||old.layout;old.elements=deep(currentElements());old.restaurantMenu=deep(currentMenu());old.updatedAt=new Date().toISOString();
    if(captureGlobal)syncGlobalFromActive();
  }

  async function refreshEditorAfterPageSwap({rebuildPhysical=false}={}){
    if(typeof rebuildCompositor==='function')rebuildCompositor();
    if(typeof hydrateAssets==='function')await hydrateAssets();
    if(rebuildPhysical&&typeof rebuildCloth==='function')rebuildCloth();
    if(typeof syncUI==='function')syncUI();
    if(typeof renderLayers==='function')renderLayers();
    if(typeof renderProperties==='function')renderProperties();
    state.needsTextureUpdate=true;
  }

  async function activatePage(id,{saveCurrent=true}={}){
    const doc=ensureDocument();if(!doc)return;
    const target=doc.pages.find(p=>p.id===id);if(!target||(target.id===doc.activePageId&&saveCurrent))return;
    if(saveCurrent)saveActive();
    applyGlobalToPage(target,doc);
    const guardedSurface=typeof state.surface!=='undefined'?deep(state.surface):undefined;
    const guardedMode=state.mode;
    const previousFormat=state.format||'9:16';
    const nextFormat=target.format||'9:16';
    const formatChanged=previousFormat!==nextFormat;
    doc.activePageId=target.id;
    state.format=nextFormat;state.layout=target.layout||'free';state.elements=deep(target.elements||[]);state.restaurantMenu=deep(target.restaurantMenu||{});state.selectedId=null;
    await refreshEditorAfterPageSwap({rebuildPhysical:formatChanged});
    if(window.BanderolasRestaurantMenuControls?.applyAll)await window.BanderolasRestaurantMenuControls.applyAll(state.restaurantMenu,{assets:false});
    if(guardedSurface!==undefined)state.surface=guardedSurface;
    state.mode=guardedMode;
    if(typeof syncUI==='function')syncUI();
    state.needsTextureUpdate=true;saveActive({captureGlobal:false});renderPanel();
    if(typeof toast==='function')toast(`${target.name} · same physical surface${formatChanged?' · geometry resized':' · fabric deformation preserved'}`);
  }

  function cloneElements(elements){return deep(elements||[]).map((el,i)=>({...el,id:uidSafe(el.type||'layer'),zIndex:i}));}
  function layoutOnlyPage(source,name){
    const p=deep(source);p.id=uidSafe('page');p.name=name;p.elements=cloneElements(source.elements);p.updatedAt=new Date().toISOString();
    if(p.restaurantMenu){
      p.restaurantMenu=deep(p.restaurantMenu);
      if(p.restaurantMenu.chef)p.restaurantMenu.chef.body='Añade aquí la nota o introducción de esta página.';
      if(Array.isArray(p.restaurantMenu.signatures))p.restaurantMenu.signatures=p.restaurantMenu.signatures.map((d,i)=>({name:`PLATO DESTACADO ${i+1}`,desc:'descripción',price:''}));
      if(Array.isArray(p.restaurantMenu.sections))p.restaurantMenu.sections=p.restaurantMenu.sections.map(s=>({...s,dishes:[{name:'Nuevo plato',desc:'descripción',price:''}]}));
    }
    return p;
  }

  async function addPage(kind='layout'){
    const doc=ensureDocument();if(!doc)return;
    if(typeof pushHistory==='function')pushHistory();saveActive();
    const idx=pageIndex(doc),source=doc.pages[idx],name=`Page ${doc.pages.length+1}`;let next;
    if(kind==='full'){next=deep(source);next.id=uidSafe('page');next.name=name+' · Copy';next.elements=cloneElements(source.elements);next.updatedAt=new Date().toISOString();}
    else next=layoutOnlyPage(source,name+' · New');
    applyGlobalToPage(next,doc);doc.pages.splice(idx+1,0,next);await activatePage(next.id,{saveCurrent:false});
  }

  async function deletePage(){
    const doc=ensureDocument();if(!doc||doc.pages.length<=1){if(typeof toast==='function')toast('A document needs at least one page');return;}
    if(typeof pushHistory==='function')pushHistory();saveActive();
    const idx=pageIndex(doc);doc.pages.splice(idx,1);const next=doc.pages[Math.min(idx,doc.pages.length-1)];doc.activePageId=next.id;await activatePage(next.id,{saveCurrent:false});
  }

  function movePage(dir){
    const doc=ensureDocument();if(!doc)return;saveActive();const i=pageIndex(doc),n=i+dir;if(n<0||n>=doc.pages.length)return;
    if(typeof pushHistory==='function')pushHistory();[doc.pages[i],doc.pages[n]]=[doc.pages[n],doc.pages[i]];renderPanel();
  }

  async function setPageFormat(format){
    const doc=ensureDocument();if(!doc)return;const page=doc.pages[pageIndex(doc)];if(!page||page.format===format)return;
    if(typeof pushHistory==='function')pushHistory();page.format=format;state.format=format;await refreshEditorAfterPageSwap({rebuildPhysical:true});saveActive({captureGlobal:false});renderPanel();
  }

  function renamePage(value){const doc=ensureDocument();if(!doc)return;const page=doc.pages[pageIndex(doc)];if(!page)return;page.name=String(value||'Page').trim()||'Page';renderPageSelect(doc);}
  function escapeHtmlSafe(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function renderPageSelect(doc=ensureDocument()){
    const sel=$('#restaurant-page-select'),count=$('#restaurant-page-count');if(!sel||!doc)return;
    sel.innerHTML=doc.pages.map((p,i)=>`<option value="${p.id}" ${p.id===doc.activePageId?'selected':''}>${i+1}. ${escapeHtmlSafe(p.name)}</option>`).join('');if(count)count.textContent=`${pageIndex(doc)+1} / ${doc.pages.length}`;
  }

  function renderPanel(){
    const body=$(`#${PANEL_ID} .section-body`),doc=ensureDocument();if(!body)return;
    if(!doc){body.innerHTML='<div class="status">Apply Restaurant Menu Premium to enable multipage document controls.</div>';return;}
    const page=doc.pages[pageIndex(doc)];
    body.innerHTML=`<div class="status ok" style="margin-bottom:9px">SINGLE PHYSICAL SHEET · pages swap content on the same Classic / Paper surface. Same-format pages preserve the current fabric deformation.</div><div class="grid2" style="margin-bottom:7px"><button id="restaurant-page-prev" class="mini-btn">← Previous</button><button id="restaurant-page-next" class="mini-btn">Next →</button></div><div class="form-group"><label>Page <span id="restaurant-page-count">${pageIndex(doc)+1} / ${doc.pages.length}</span></label><select id="restaurant-page-select" class="form-control"></select></div><div class="form-group"><label>Page name</label><input id="restaurant-page-name" class="form-control" value="${escapeHtmlSafe(page.name)}"></div><div class="form-group"><label>Page format</label><select id="restaurant-page-format" class="form-control"><option value="9:16" ${page.format==='9:16'?'selected':''}>9:16 · Portrait</option><option value="1:1" ${page.format==='1:1'?'selected':''}>1:1 · Square</option><option value="16:9" ${page.format==='16:9'?'selected':''}>16:9 · Landscape</option></select></div><div class="grid2"><button id="restaurant-page-add" class="mini-btn">+ Add Page</button><button id="restaurant-page-duplicate" class="mini-btn">Duplicate Full</button></div><div class="grid2" style="margin-top:6px"><button id="restaurant-page-layout" class="mini-btn">Duplicate Layout</button><button id="restaurant-page-delete" class="mini-btn danger">Delete Page</button></div><div class="grid2" style="margin-top:6px"><button id="restaurant-page-up" class="mini-btn">Move Up</button><button id="restaurant-page-down" class="mini-btn">Move Down</button></div><div class="status" style="margin-top:8px">GLOBAL across pages: restaurant identity, visual style, reservations, logo and editorial plate. PAGE-SPECIFIC: hero, Chef Note, signature dishes, menu sections and prices.</div>`;
    renderPageSelect(doc);bindPanel();
  }

  function bindPanel(){
    const doc=ensureDocument();if(!doc)return;const idx=pageIndex(doc);const on=(id,event,fn)=>{const el=$('#'+id);if(el)el.addEventListener(event,fn);};
    on('restaurant-page-prev','click',()=>{const n=Math.max(0,pageIndex(doc)-1);activatePage(doc.pages[n].id);});
    on('restaurant-page-next','click',()=>{const n=Math.min(doc.pages.length-1,pageIndex(doc)+1);activatePage(doc.pages[n].id);});
    on('restaurant-page-select','change',e=>activatePage(e.target.value));on('restaurant-page-name','change',e=>renamePage(e.target.value));on('restaurant-page-format','change',e=>setPageFormat(e.target.value));
    on('restaurant-page-add','click',()=>addPage('layout'));on('restaurant-page-duplicate','click',()=>addPage('full'));on('restaurant-page-layout','click',()=>addPage('layout'));on('restaurant-page-delete','click',deletePage);on('restaurant-page-up','click',()=>movePage(-1));on('restaurant-page-down','click',()=>movePage(1));
    const prev=$('#restaurant-page-prev'),next=$('#restaurant-page-next');if(prev)prev.disabled=idx<=0;if(next)next.disabled=idx>=doc.pages.length-1;
  }

  function patchPersistence(){
    try{
      if(typeof snapshot==='function'&&!snapshot.__restaurantPages53){const prev=snapshot;const wrapped=function(){saveActive();const s=prev();if(state.restaurantDocument)s.restaurantDocument=deep(state.restaurantDocument);return s;};wrapped.__restaurantPages53=true;snapshot=wrapped;}
      if(typeof restoreSnapshot==='function'&&!restoreSnapshot.__restaurantPages53){const prev=restoreSnapshot;const wrapped=async function(s){await prev(s);state.restaurantDocument=s?.restaurantDocument?deep(s.restaurantDocument):null;setTimeout(renderPanel,0);};wrapped.__restaurantPages53=true;restoreSnapshot=wrapped;}
      if(typeof serializableProject==='function'&&!serializableProject.__restaurantPages53){const prev=serializableProject;const wrapped=function(){saveActive();const p=prev();if(state.restaurantDocument)p.restaurantDocument=deep(state.restaurantDocument);return p;};wrapped.__restaurantPages53=true;serializableProject=wrapped;}
    }catch(e){console.warn('[Restaurant Pages 5.3] persistence wrapper unavailable',e);}
  }

  function inject(){
    if($('#'+PANEL_ID))return;const controls=$('#restaurant-menu-controls-section'),premium=$('#restaurant-menu-premium-section'),panel=$('#ui-panel');if(!panel)return;
    const d=document.createElement('details');d.id=PANEL_ID;d.open=true;d.innerHTML='<summary>Document / Pages</summary><div class="section-body"></div>';
    if(controls)controls.insertAdjacentElement('beforebegin',d);else if(premium)premium.insertAdjacentElement('afterend',d);else panel.appendChild(d);
    patchPersistence();renderPanel();
    const tryInit=()=>{if(isRestaurantActive()){ensureDocument();renderPanel();return true;}return false;};if(!tryInit())setTimeout(tryInit,1000);
    if(new URLSearchParams(location.search).get('demo')==='restaurant')setTimeout(()=>{if(isRestaurantActive())ensureDocument();renderPanel();},2300);
    document.addEventListener('click',e=>{if(e.target?.id==='apply-restaurant-menu-premium')setTimeout(()=>{state.restaurantDocument=null;if(isRestaurantActive())ensureDocument();renderPanel();},1250);});
    document.addEventListener('input',e=>{if(GLOBAL_INPUTS.has(e.target?.id))setTimeout(()=>{syncGlobalFromActive();saveActive({captureGlobal:false});},0);});
    document.addEventListener('change',e=>{if(GLOBAL_INPUTS.has(e.target?.id))setTimeout(()=>{syncGlobalFromActive();saveActive({captureGlobal:false});renderPanel();},250);});
    document.addEventListener('click',e=>{if(e.target?.id==='rm-refresh-brand')setTimeout(()=>{syncGlobalFromActive();saveActive({captureGlobal:false});},450);});
  }

  window.BanderolasRestaurantPages={version:VERSION,ensureDocument,saveActive,activatePage,addPage,deletePage,movePage,syncGlobalFromActive,getDocument:()=>ensureDocument()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();