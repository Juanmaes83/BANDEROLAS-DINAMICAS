'use strict';
(() => {
  const VERSION='5.4R2';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const deep=v=>JSON.parse(JSON.stringify(v));
  const VARIANTS=['original','japanese','certificate','site-of-the-year'];
  const VARIANT_LABELS={original:'Original',japanese:'Japanese',certificate:'Certificate','site-of-the-year':'Site of the Year'};
  const CATALOG_KEY='banderolas-pro-asset-catalog-v1';
  const PORTABLE_KIND='banderolas-pro-multipage-project';
  let baselineFingerprint=null;
  let lastPaperVariant='original';
  let assetHealth={ready:false,missingUsed:0,total:0,missingIds:[]};
  let scanToken=0;
  let legacyPreviewButton=null;

  const pagesApi=()=>window.BanderolasRestaurantPages||null;
  const extApi=()=>window.BanderolasExtendedRestaurantPage||null;
  const doc=()=>pagesApi()?.getDocument?.()||state.restaurantDocument||null;
  const page=(d=doc())=>d?.pages?.find(p=>p.id===d.activePageId)||d?.pages?.[0]||null;
  const toastH=m=>{try{toast(m)}catch{console.log('[BANDEROLAS]',m)}};
  const safeName=s=>String(s||'banderolas-project').trim().replace(/[^a-z0-9áéíóúüñ_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,90)||'banderolas-project';
  const download=(blob,name)=>{const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const role=(els,r)=>(els||[]).find(e=>e.role===r);

  function injectStyle(){
    if($('#workspace-hardening-style'))return;
    const s=document.createElement('style');s.id='workspace-hardening-style';s.textContent=`
      #ws-media-core{border:1px solid #302925;background:#070403;padding:9px;margin:0 0 10px}
      .ws-media-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:7px 0}.ws-media-library{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto}
      .ws-media-item{border:1px solid #2c2622;background:#050303;padding:7px}.ws-media-head{display:flex;align-items:center;justify-content:space-between;gap:6px}.ws-media-name{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ddd}.ws-media-meta{font-size:8px;color:#837a73;margin-top:3px;line-height:1.35}.ws-media-buttons{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.ws-media-badge{font-size:7px;padding:2px 4px;border:1px solid #3a312c}.ws-media-badge.ok{color:#70c98a;border-color:#315339}.ws-media-badge.bad{color:#e35a5a;border-color:#6b3131}.ws-media-badge.idle{color:#d8ab48;border-color:#5a4d26}
      .ws-dish-media{display:grid;grid-template-columns:1fr 34px;gap:5px;margin-top:5px}.ws-dish-media .mini-btn{width:100%}.ws-dish-thumb{width:34px;height:26px;object-fit:cover;border:1px solid #332a25;background:#090604}.ws-dish-empty{display:grid;place-items:center;width:34px;height:26px;border:1px solid #332a25;color:#665a50;font-size:8px}
      #ws-storage-status strong{color:#ddd}.ws-output-extra{border-top:1px solid #302925;margin-top:10px;padding-top:10px}.ws-output-extra .grid2{margin-bottom:6px}
      .ws-hard-red{color:#e35a5a!important}.ws-hard-amber{color:#d8ab48!important}.ws-hard-green{color:#70c98a!important}
    `;document.head.appendChild(s);
  }

  function loadCatalog(){try{return JSON.parse(localStorage.getItem(CATALOG_KEY)||'{}')}catch{return {}}}
  function saveCatalog(c){try{localStorage.setItem(CATALOG_KEY,JSON.stringify(c||{}))}catch{}}
  function rememberAsset(id,{name='',type='',mime=''}={}){
    if(!id)return;const c=loadCatalog(),old=c[id]||{};c[id]={...old,id,name:name||old.name||id,type:type||old.type||'',mime:mime||old.mime||'',lastSeen:new Date().toISOString()};saveCatalog(c);
  }

  function addRef(map,id,meta={}){
    if(!id||typeof id!=='string')return;let r=map.get(id);if(!r){r={id,pages:new Set(),roles:new Set(),types:new Set(),names:new Set()};map.set(id,r)}
    if(meta.page)r.pages.add(meta.page);if(meta.role)r.roles.add(meta.role);if(meta.type)r.types.add(meta.type);if(meta.name)r.names.add(meta.name);
  }
  function scanObjectForAssetIds(value,map,meta,seen=new WeakSet()){
    if(!value||typeof value!=='object')return;if(seen.has(value))return;seen.add(value);
    if(Array.isArray(value)){value.forEach(v=>scanObjectForAssetIds(v,map,meta,seen));return;}
    for(const [k,v] of Object.entries(value)){
      if(typeof v==='string'&&(k==='assetId'||/AssetId$/.test(k)))addRef(map,v,meta);
      else if(v&&typeof v==='object')scanObjectForAssetIds(v,map,meta,seen);
    }
  }
  function collectAssetRefs(){
    pagesApi()?.saveActive?.({captureGlobal:false});
    const map=new Map(),d=doc();
    if(d?.pages?.length){
      for(const [i,p] of d.pages.entries()){
        const label=p.name||`Page ${i+1}`;
        for(const el of p.elements||[])if(el.assetId)addRef(map,el.assetId,{page:label,role:el.role||el.name||el.type,type:el.type,name:el.name});
        scanObjectForAssetIds(p.restaurantMenu,map,{page:label,role:'restaurant-data'});
        scanObjectForAssetIds(p.dishMedia,map,{page:label,role:'dish-media'});
      }
      const brand=d.global?.brandAssetIds||{};for(const [k,v] of Object.entries(brand))if(typeof v==='string')addRef(map,v,{page:'GLOBAL',role:`brand-${k}`});
    }else{
      for(const el of state.elements||[])if(el.assetId)addRef(map,el.assetId,{page:'Active',role:el.role||el.name||el.type,type:el.type,name:el.name});
      scanObjectForAssetIds(state.restaurantMenu,map,{page:'Active',role:'restaurant-data'});
    }
    return map;
  }

  function inferType(blob,ref,catalog){
    if(blob?.type?.startsWith('video/'))return 'video';if(blob?.type?.startsWith('image/'))return ref?.types?.has('logo')?'logo':'image';
    const t=[...(ref?.types||[])][0]||catalog?.type||'';return t==='video'?'video':t==='logo'?'logo':'image';
  }

  async function deleteStoredAsset(id){
    try{
      if(typeof openDB==='function'&&typeof STORE!=='undefined'){
        const db=await openDB();await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close();
      }
    }catch(e){console.warn('[Hardening] delete asset',e)}
    try{const r=runtimeAssets.get(id);if(r?.url)URL.revokeObjectURL(r.url);runtimeAssets.delete(id)}catch{}
    const c=loadCatalog();delete c[id];saveCatalog(c);
  }

  async function scanAssets(){
    const token=++scanToken,refs=collectAssetRefs(),catalog=loadCatalog();
    for(const [id,r] of refs){rememberAsset(id,{name:[...r.names][0]||catalog[id]?.name||id,type:[...r.types][0]||catalog[id]?.type||''})}
    const merged=loadCatalog(),ids=[...new Set([...Object.keys(merged),...refs.keys()])],items=[],missing=[];
    for(const id of ids){
      const r=refs.get(id),cat=merged[id]||{},blob=typeof getAsset==='function'?await getAsset(id):null;if(token!==scanToken)return;
      const type=inferType(blob,r,cat),used=!!r,persisted=!!blob;
      if(used&&!persisted)missing.push(id);
      items.push({id,name:[...(r?.names||[])][0]||cat.name||id,type,mime:blob?.type||cat.mime||'',size:blob?.size||0,used,persisted,pages:[...(r?.pages||[])],roles:[...(r?.roles||[])]});
    }
    assetHealth={ready:true,total:items.length,missingUsed:missing.length,missingIds:missing};
    renderMediaLibrary(items);applyHardHealth();
  }

  function mediaPreviewURL(id){try{return runtimeAssets.get(id)?.url||''}catch{return ''}}
  function renderMediaLibrary(items){
    const box=$('#ws-media-library');if(!box)return;
    if(!items?.length){box.innerHTML='<div class="status warn">No media yet. Upload an image, video or logo above.</div>';return;}
    box.innerHTML=items.map(it=>{
      const uses=it.used?(it.pages.join(', ')||'used'):'UNUSED';
      const size=it.size?`${(it.size/1024/1024).toFixed(1)} MB`:'';
      const status=it.persisted?'ok':'bad',label=it.persisted?'SAVED':'MISSING';
      return `<div class="ws-media-item" data-media-id="${it.id}"><div class="ws-media-head"><div class="ws-media-name">${escapeHtml(it.name)}</div><span class="ws-media-badge ${status}">${label}</span></div><div class="ws-media-meta">${it.type.toUpperCase()} ${size?`· ${size}`:''}<br>${escapeHtml(uses)}</div><div class="ws-media-buttons"><button class="mini-btn" data-media-use="${it.id}" data-media-type="${it.type}">Use on page</button><button class="mini-btn" data-media-replace="${it.id}" data-media-type="${it.type}">Replace selected</button></div>${!it.used?`<button class="mini-btn danger" style="width:100%;margin-top:5px" data-media-delete="${it.id}">Delete unused</button>`:''}</div>`;
    }).join('');
  }
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function registerAssetOnly(file,type){
    const id=typeof uid==='function'?uid('asset'):`asset-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    await putAsset(id,file);await loadRuntimeAsset(id,file,type==='video'?'video':'image');rememberAsset(id,{name:file.name||id,type,mime:file.type||''});return id;
  }
  function defaultMediaElement(id,type,name){
    return {id:typeof uid==='function'?uid(type):`${type}-${Date.now()}`,type,name:name||type,assetId:id,x:.12,y:.18,w:.76,h:type==='logo'?.16:.46,rotation:0,opacity:1,zIndex:(state.elements||[]).length,visible:true,locked:false,fit:type==='logo'?'contain':'cover',cropX:0,cropY:0,zoom:1,loop:true,muted:true};
  }
  async function addMediaFile(file,type){
    if(!file)return;if(typeof pushHistory==='function')pushHistory();const id=await registerAssetOnly(file,type);const el=defaultMediaElement(id,type,file.name);state.elements.push(el);if(typeof normalizeZ==='function')normalizeZ();if(typeof setSelected==='function')setSelected(el.id);state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});renderLayers?.();renderProperties?.();await scanAssets();window.BanderolasWorkspace?.captureThumbnail?.();toastH(`${type==='video'?'Video':'Image'} saved locally and added to page`);
  }
  async function replaceRoleFile(roleName,file,{global=false}={}){
    if(!file)return;const active=role(state.elements,roleName);if(!active){toastH(`${roleName} layer not found`);return;}if(typeof pushHistory==='function')pushHistory();const type=file.type.startsWith('video/')?'video':roleName==='logo'?'logo':'image',id=await registerAssetOnly(file,type);
    const apply=el=>{if(!el)return;el.assetId=id;el.type=type;el.name=file.name||el.name;el.loop=true;el.muted=true;};apply(active);
    const d=doc();if(global&&d?.pages){for(const p of d.pages)apply(role(p.elements,roleName));d.global=d.global||{};d.global.brandAssetIds=d.global.brandAssetIds||{};if(roleName==='logo')d.global.brandAssetIds.logo=id;}
    pagesApi()?.saveActive?.({captureGlobal:global});state.needsTextureUpdate=true;renderLayers?.();renderProperties?.();await scanAssets();toastH(`${roleName==='logo'?'Logo':'Hero'} saved and replaced`);
  }
  function addLibraryAssetToPage(id,type){
    if(!id)return;if(typeof pushHistory==='function')pushHistory();const c=loadCatalog()[id]||{};const el=defaultMediaElement(id,type||c.type||'image',c.name||id);state.elements.push(el);normalizeZ?.();setSelected?.(el.id);state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});hydrateAssets?.();renderLayers?.();renderProperties?.();window.BanderolasWorkspace?.captureThumbnail?.();scheduleScan();
  }
  function replaceSelectedWithAsset(id,type){
    const el=state.elements?.find(e=>e.id===state.selectedId);if(!el){toastH('Select an image/video/logo layer first');return;}if(!['image','video','logo'].includes(el.type)){toastH('Selected layer is not media');return;}if(typeof pushHistory==='function')pushHistory();el.assetId=id;el.type=type==='video'?'video':el.type==='logo'?'logo':'image';state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});hydrateAssets?.();renderProperties?.();scheduleScan();
  }

  function injectMediaUI(){
    const content=$('#ws-content-body');if(!content||$('#ws-media-core'))return;
    const start=$('#ws-content-start');const wrap=document.createElement('div');wrap.id='ws-media-core';wrap.innerHTML=`<div class="micro-label">MEDIA · PRIMARY</div><div class="ws-media-actions"><button id="ws-upload-image" class="btn-outline">+ IMAGE</button><button id="ws-upload-video" class="btn-outline">+ VIDEO</button><button id="ws-upload-logo" class="mini-btn">UPLOAD LOGO</button><button id="ws-replace-hero" class="mini-btn">REPLACE HERO</button></div><input id="ws-file-image" class="file-hidden" type="file" accept="image/*"><input id="ws-file-video" class="file-hidden" type="file" accept="video/*"><input id="ws-file-logo" class="file-hidden" type="file" accept="image/*"><input id="ws-file-hero" class="file-hidden" type="file" accept="image/*,video/*"><input id="ws-dish-file" class="file-hidden" type="file" accept="image/*"><div id="ws-storage-status" class="status">LOCAL STORAGE · media is persisted in IndexedDB in this browser. Use Portable Project / All Pages ZIP for transfer or backup. Cloud sync is not configured.</div><details open style="margin-top:8px"><summary>Media Library</summary><div class="section-body"><div id="ws-media-library" class="ws-media-library"></div><button id="ws-media-rescan" class="mini-btn" style="width:100%;margin-top:7px">Rescan media</button></div></details>`;
    if(start)start.insertAdjacentElement('afterend',wrap);else content.prepend(wrap);
    $('#ws-upload-image').onclick=()=>$('#ws-file-image').click();$('#ws-upload-video').onclick=()=>$('#ws-file-video').click();$('#ws-upload-logo').onclick=()=>$('#ws-file-logo').click();$('#ws-replace-hero').onclick=()=>$('#ws-file-hero').click();
    $('#ws-file-image').onchange=async e=>{const f=e.target.files?.[0];if(f)await addMediaFile(f,'image');e.target.value=''};
    $('#ws-file-video').onchange=async e=>{const f=e.target.files?.[0];if(f)await addMediaFile(f,'video');e.target.value=''};
    $('#ws-file-logo').onchange=async e=>{const f=e.target.files?.[0];if(f)await replaceRoleFile('logo',f,{global:true});e.target.value=''};
    $('#ws-file-hero').onchange=async e=>{const f=e.target.files?.[0];if(f)await replaceRoleFile('hero',f,{global:false});e.target.value=''};
    $('#ws-media-rescan').onclick=()=>scanAssets();
    $('#ws-dish-file').onchange=async e=>{const f=e.target.files?.[0],target=e.target.dataset.target;if(f&&target){const [si,di]=target.split(':').map(Number);await assignDishMedia(si,di,f)}e.target.value='';e.target.dataset.target=''};
  }

  function dishKey(si,di){const sec=state.restaurantMenu?.sections?.[si];return `${sec?.key||si}:${di}`}
  function dishRole(si,di){return `menu-dish-image:${dishKey(si,di)}`}
  async function assignDishMedia(si,di,file){
    const p=page();if(!p||!state.restaurantMenu?.sections?.[si]?.dishes?.[di])return;if(typeof pushHistory==='function')pushHistory();const id=await registerAssetOnly(file,'image');p.dishMedia=p.dishMedia||{};p.dishMedia[dishKey(si,di)]=id;placeDishMediaLayer(si,di,id,file.name);pagesApi()?.saveActive?.({captureGlobal:false});decorateDishRows();await scanAssets();toastH('Dish image saved and placed on the page');
  }
  function placeDishMediaLayer(si,di,id,name){
    const sec=state.restaurantMenu?.sections?.[si],base=sec?role(state.elements,sec.role):null;if(!sec||!base)return;const fmt=fmtMap[state.format]||{w:1080,h:1920},count=Math.max(1,sec.dishes?.length||1);const pxH=Math.max(34,Math.min(72,(base.h*fmt.h)/(count+1)*.72)),h=pxH/fmt.h,w=pxH/fmt.w;const x=Math.max(.006,base.x-w-.008),cy=base.y+base.h*(.20+(di+.5)*(.72/count)),y=Math.max(0,cy-h/2);let el=role(state.elements,dishRole(si,di));if(el){Object.assign(el,{assetId:id,name:name||el.name,x,y,w,h,fit:'cover',visible:true});}
    else{el={id:uid('image'),type:'image',name:name||`${sec.dishes[di].name} image`,role:dishRole(si,di),assetId:id,x,y,w,h,rotation:0,opacity:1,zIndex:Math.max(1,(base.zIndex||1)-1),visible:true,locked:false,fit:'cover',cropX:0,cropY:0,zoom:1};state.elements.push(el);state.elements.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0));normalizeZ?.();}state.needsTextureUpdate=true;renderLayers?.();
  }
  function clearDishMedia(si,di){const p=page();if(!p)return;if(typeof pushHistory==='function')pushHistory();if(p.dishMedia)delete p.dishMedia[dishKey(si,di)];const r=dishRole(si,di);state.elements=(state.elements||[]).filter(e=>e.role!==r);normalizeZ?.();pagesApi()?.saveActive?.({captureGlobal:false});state.needsTextureUpdate=true;renderLayers?.();decorateDishRows();scheduleScan();}
  function decorateDishRows(){
    const p=page();$$('input[id^="rm-dish-name-"]').forEach(inp=>{const m=inp.id.match(/^rm-dish-name-(\d+)-(\d+)$/);if(!m)return;const si=Number(m[1]),di=Number(m[2]),row=inp.closest('.restaurant-dish');if(!row||row.querySelector('.ws-dish-media'))return;const id=p?.dishMedia?.[dishKey(si,di)]||'',url=id?mediaPreviewURL(id):'';const box=document.createElement('div');box.className='ws-dish-media';box.innerHTML=`<button class="mini-btn" data-ws-dish-upload="${si}:${di}">${id?'Replace':'Add'} dish image</button>${url?`<img class="ws-dish-thumb" src="${url}" alt="">`:'<span class="ws-dish-empty">IMG</span>'}${id?`<button class="mini-btn danger" style="grid-column:1 / -1" data-ws-dish-clear="${si}:${di}">Remove dish image</button>`:''}`;row.appendChild(box);});
  }

  function neutralizeLegacySurfaceControls(){
    for(const id of ['surface-engine','surface-variant']){const old=$('#'+id);if(!old||old.dataset.hardMirror==='1')continue;const clone=old.cloneNode(true);clone.dataset.hardMirror='1';clone.onchange=null;old.replaceWith(clone);}
  }
  function surfaceCtx(){return window.BanderolasSurfaceFoundation?.context?.()||{state,canvas,cloth,texture:typeof texCanvas!=='undefined'?texCanvas:null,format:state.format}}
  function syncSurfaceDirect(next){
    const schema=window.BanderolasSurfaceSchema,manager=window.surfaceManager;if(!schema||!manager)return false;state.surface=schema.normalize(next);state.surface=manager.sync(state.surface,surfaceCtx());window.BanderolasPaperNativeFidelity?.syncUI?.();window.BanderolasWorkspace?.sync?.();setTimeout(()=>applyHardHealth(),100);return true;
  }
  function setEngineDirect(engine){
    if(state.surface?.engine==='paper3d'&&VARIANTS.includes(state.surface?.variant))lastPaperVariant=state.surface.variant;if(typeof pushHistory==='function')pushHistory();const next=engine==='paper3d'?{...state.surface,engine:'paper3d',variant:lastPaperVariant}:{...state.surface,engine:'classic',variant:'default'};syncSurfaceDirect(next);const v=$('#ws-paper-variant');if(v&&engine==='paper3d')v.value=lastPaperVariant;
  }
  function setVariantDirect(variant){
    if(!VARIANTS.includes(variant)||state.surface?.engine!=='paper3d')return;lastPaperVariant=variant;if(typeof pushHistory==='function')pushHistory();const schema=window.BanderolasSurfaceSchema;let next={...state.surface,engine:'paper3d',variant};const native=state.surface?.material?.preset==='native';if(native&&schema?.defaultForEngine){const d=schema.defaultForEngine('paper3d',variant);next.material={...d.material,preset:'native'};}syncSurfaceDirect(next);const paper=window.BanderolasPaper3D?.adapter;setTimeout(()=>{paper?.pushTextureFrame?.(true);paper?.pushControls?.();window.BanderolasPaperNativeFidelity?.syncUI?.();verifyVariant(variant);},120);
  }
  function verifyVariant(expected=state.surface?.variant){
    const engine=state.surface?.engine,active=window.surfaceManager?.activeId,paper=window.BanderolasPaper3D?.adapter;let ok=engine==='classic'?active==='classic':engine==='paper3d'&&VARIANTS.includes(expected)&&active==='paper3d'&&paper?.currentVariant===expected;const box=$('#ws-surface-alert');if(box){box.className=`status ws-surface-alert ${ok?'ok':'warn'}`;box.textContent=ok?(engine==='paper3d'?`Paper ready · ${VARIANT_LABELS[expected]} · single Variant controller verified`:'Classic ready · grab / stretch / release available'):`Surface check failed · state=${engine}/${expected||'-'} · active=${active||'-'} · runtime=${paper?.currentVariant||'-'}`;}applyHardHealth();return ok;
  }
  function rebindPrimarySurfaceControls(){
    neutralizeLegacySurfaceControls();
    for(const [id,handler] of [['ws-engine',e=>setEngineDirect(e.target.value)],['ws-paper-variant',e=>setVariantDirect(e.target.value)]]){const old=$('#'+id);if(!old||old.dataset.hardOwner==='1')continue;const clone=old.cloneNode(true);clone.dataset.hardOwner='1';old.replaceWith(clone);clone.addEventListener('change',handler);}
    const e=$('#ws-engine');if(e)e.value=state.surface?.engine||'classic';const v=$('#ws-paper-variant');if(v)v.value=VARIANTS.includes(state.surface?.variant)?state.surface.variant:lastPaperVariant;
  }

  function cleanse(v){
    if(Array.isArray(v))return v.map(cleanse);if(!v||typeof v!=='object')return v;const o={};for(const k of Object.keys(v).sort()){if(['updatedAt','selectedId'].includes(k))continue;o[k]=cleanse(v[k]);}return o;
  }
  function currentFingerprint(){
    try{pagesApi()?.saveActive?.({captureGlobal:false});const p=typeof serializableProject==='function'?serializableProject():{};p.restaurantDocument=state.restaurantDocument?deep(state.restaurantDocument):null;return JSON.stringify(cleanse(p));}catch{return ''}
  }
  function hasSavedProject(){try{return JSON.parse(localStorage.getItem('banderolas-pro-projects-v2')||'[]').some(p=>p.id===state.projectId)}catch{return false}}
  function isDirty(){if(!hasSavedProject())return true;if(baselineFingerprint==null)return true;return currentFingerprint()!==baselineFingerprint}
  function establishBaseline(){if(hasSavedProject())baselineFingerprint=currentFingerprint();else baselineFingerprint=null;applyHardHealth()}

  function setStep(step,status){
    const dot=$(`[data-ws-open="${step}"] .ws-dot`),label=$(`#ws-${step}-state`);if(dot)dot.className=`ws-dot ws-${status}`;if(label){label.className=`ws-step-state ws-${status}`;label.textContent=status==='green'?'READY':status==='amber'?'CHECK':'FIX';}
  }
  function applyHardHealth(){
    if(!$('#workspace-health'))return;
    const d=doc(),p=page(d),menu=state.restaurantMenu,usedMissing=assetHealth.ready?assetHealth.missingUsed:0;
    const docState=d?.pages?.length&&p?'green':'red';let contentState=!menu?'red':'green';if(usedMissing>0)contentState='red';else if(!role(state.elements,'hero')?.assetId)contentState='amber';
    const logo=role(state.elements,'logo'),bg=role(state.elements,'menu-backdrop');let designState=logo?.assetId&&bg?.assetId?'green':'amber';if(usedMissing>0&&(assetHealth.missingIds.includes(logo?.assetId)||assetHealth.missingIds.includes(bg?.assetId)))designState='red';
    const engine=state.surface?.engine,paper=window.BanderolasPaper3D?.adapter;let surfaceState='red';if(engine==='classic')surfaceState=window.surfaceManager?.activeId==='classic'?'green':'red';else if(engine==='paper3d'){surfaceState=VARIANTS.includes(state.surface?.variant)&&window.surfaceManager?.activeId==='paper3d'?(paper?.currentVariant===state.surface.variant?'green':'amber'):'red';}
    const dirty=isDirty();let outputState=usedMissing>0?'red':dirty?'amber':'green';
    const states={document:docState,content:contentState,design:designState,surface:surfaceState,output:outputState};Object.entries(states).forEach(([k,v])=>setStep(k,v));const ready=Object.values(states).filter(v=>v==='green').length,first=Object.entries(states).find(([,v])=>v!=='green');const msg=$('#workspace-health-message');if(msg)msg.textContent=ready===5?'GUIDE · 5/5 GREEN · all pages, media, surface and saved state are ready.':`GUIDE · ${ready}/5 GREEN · next: ${first?.[0]?.toUpperCase()||'REVIEW'} · ${first?.[1]==='red'?'FIX required':'CHECK required'}.`;
    const storage=$('#ws-storage-status');if(storage){storage.className=`status ${usedMissing?'warn':'ok'}`;storage.innerHTML=usedMissing?`<strong>MEDIA ERROR</strong> · ${usedMissing} referenced asset${usedMissing===1?'':'s'} missing from IndexedDB. Rescan/re-import before delivery.`:`<strong>LOCAL MEDIA READY</strong> · ${assetHealth.total} asset${assetHealth.total===1?'':'s'} tracked · IndexedDB persistence active · portable backup available.`;}
    const out=$('#ws-output-status');if(out){out.className=`status ${outputState==='green'?'ok':'warn'}`;out.textContent=usedMissing?`BLOCKED · ${usedMissing} missing media asset(s)`:(dirty?'Unsaved changes · save the project before final delivery.':'Project saved · no unsaved changes detected.');}
  }

  const blobToDataURL=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)});
  function dataURLToBlob(dataURL){const [h,d]=String(dataURL).split(','),mime=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream',bin=atob(d),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:mime})}
  async function buildPortablePayload(){
    pagesApi()?.saveActive?.();const refs=collectAssetRefs(),catalog=loadCatalog(),assets=[],missing=[];
    for(const [id,r] of refs){let blob=null;try{blob=await getAsset(id)}catch{}if(!blob)blob=runtimeAssets.get(id)?.blob||null;if(!blob){missing.push(id);continue;}assets.push({id,type:inferType(blob,r,catalog[id]),name:[...r.names][0]||catalog[id]?.name||id,mime:blob.type||catalog[id]?.mime||'',size:blob.size||0,dataURL:await blobToDataURL(blob)});}
    const project=typeof serializableProject==='function'?deep(serializableProject()):{};project.restaurantDocument=state.restaurantDocument?deep(state.restaurantDocument):null;project.restaurantMenu=state.restaurantMenu?deep(state.restaurantMenu):null;project.assetCatalog=deep(catalog);
    return {kind:PORTABLE_KIND,schemaVersion:4,exportedAt:new Date().toISOString(),project,assets,missingAssets:missing};
  }
  async function exportPortable(){const payload=await buildPortablePayload();download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),`${safeName(state.projectName)}-MULTIPAGE-PROJECT.json`);toastH(payload.missingAssets.length?`Portable project exported with ${payload.missingAssets.length} missing asset warning(s)`:`Portable multipage project exported · ${payload.assets.length} assets embedded`)}
  async function importPortableFile(file){
    let payload;try{payload=JSON.parse(await file.text())}catch{toastH('Invalid project JSON');return;}const p=payload.project||payload;if(!p||(!p.restaurantDocument&&!Array.isArray(p.elements))){toastH('Not a BANDEROLAS project');return;}if(typeof pushHistory==='function')pushHistory();
    for(const a of payload.assets||[]){if(!a?.id||!a?.dataURL)continue;const blob=dataURLToBlob(a.dataURL);await putAsset(a.id,blob);rememberAsset(a.id,{name:a.name,type:a.type,mime:a.mime||blob.type});}
    state.projectId=p.id||p.projectId||uid('project');state.projectName=p.name||p.projectName||'Imported Project';state.brand={...state.brand,...(p.brand||{})};state.fabric={...state.fabric,...(p.fabric||{})};state.background={...(state.background||{}),...(p.background||{})};if(p.surface)state.surface=deep(p.surface);
    state.restaurantDocument=p.restaurantDocument?deep(p.restaurantDocument):null;state.restaurantMenu=p.restaurantMenu?deep(p.restaurantMenu):null;
    if(state.restaurantDocument?.pages?.length){const d=state.restaurantDocument,active=d.pages.find(x=>x.id===d.activePageId)||d.pages[0];d.activePageId=active.id;state.format=active.format||'9:16';state.layout=active.layout||'free';state.elements=deep(active.elements||[]);state.restaurantMenu=deep(active.restaurantMenu||state.restaurantMenu||{});if(state.format==='9:custom')fmtMap['9:custom']={w:active.documentSize?.width||1080,h:active.documentSize?.height||2400};}
    else{state.format=p.format||'9:16';state.layout=p.layout||'free';state.elements=deep(p.elements||[]);}
    state.selectedId=null;normalizeZ?.();rebuildCompositor?.();await hydrateAssets?.();rebuildCloth?.();if(state.surface&&window.surfaceManager&&window.BanderolasSurfaceFoundation){state.surface=window.surfaceManager.sync(state.surface,window.BanderolasSurfaceFoundation.context());}syncUI?.();renderLayers?.();renderProperties?.();state.needsTextureUpdate=true;
    if(state.restaurantDocument?.activePageId)await pagesApi()?.activatePage?.(state.restaurantDocument.activePageId,{saveCurrent:false});baselineFingerprint=null;window.BanderolasWorkspace?.sync?.();await scanAssets();decorateDishRows();toastH(`Multipage project imported · ${state.restaurantDocument?.pages?.length||1} page(s) · ${(payload.assets||[]).length} assets restored`);
  }

  const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
  function crc32(u8){let c=0xffffffff;for(const b of u8)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
  const enc=new TextEncoder();const u16=n=>new Uint8Array([n&255,(n>>>8)&255]);const u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
  function concat(parts){const n=parts.reduce((s,p)=>s+p.length,0),o=new Uint8Array(n);let at=0;for(const p of parts){o.set(p,at);at+=p.length}return o}
  async function zipStore(entries){const locals=[],centrals=[];let offset=0;for(const e of entries){const name=enc.encode(e.name),data=e.data instanceof Uint8Array?e.data:new Uint8Array(e.data),crc=crc32(data),local=concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]);locals.push(local);const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]);centrals.push(central);offset+=local.length;}const centralSize=centrals.reduce((s,p)=>s+p.length,0),end=concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralSize),u32(offset),u16(0)]);return new Blob([...locals,...centrals,end],{type:'application/zip'})}

  async function captureLegacyInteractive(){
    const btn=legacyPreviewButton;if(!btn)return null;return await new Promise(resolve=>{const oc=URL.createObjectURL,or=URL.revokeObjectURL,oo=window.open,ac=HTMLAnchorElement.prototype.click;let done=false,timer;const restore=()=>{URL.createObjectURL=oc;URL.revokeObjectURL=or;window.open=oo;HTMLAnchorElement.prototype.click=ac;clearTimeout(timer)};const finish=b=>{if(done)return;done=true;restore();resolve(b||null)};URL.createObjectURL=function(blob){if(blob instanceof Blob&&String(blob.type||'').includes('text/html')){queueMicrotask(()=>finish(blob));return 'blob:banderolas-captured'}return oc.call(URL,blob)};URL.revokeObjectURL=u=>u==='blob:banderolas-captured'?undefined:or.call(URL,u);window.open=()=>null;HTMLAnchorElement.prototype.click=function(){};timer=setTimeout(()=>finish(null),18000);try{btn.click()}catch{finish(null)}});
  }
  function patchInteractiveFormats(html,p=page()){
    const custom=p?.format==='9:custom'?(p.documentSize?.height||2400):2400;const fm=`FM={'9:16':[1080,1920],'9:24':[1080,2880],'9:32':[1080,3840],'9:40':[1080,4800],'9:custom':[1080,${custom}],'1:1':[1080,1080],'16:9':[1920,1080]},wh=FM[P.format]||FM['9:16']`;
    return String(html).replace(/FM=\{[^}]+\},wh=FM\[P\.format\]\|\|FM\['9:16'\]/,fm);
  }
  async function activeInteractiveHTML(){const b=await captureLegacyInteractive();if(!b)return null;return patchInteractiveFormats(await b.text(),page())}
  async function exportActiveInteractive(){const html=await activeInteractiveHTML();if(!html){toastH('Interactive export unavailable');return;}download(new Blob([html],{type:'text/html'}),`${safeName(state.projectName)}-${state.format.replace(':','x')}-INTERACTIVE.html`);toastH('Interactive HTML exported with extended-format support')}
  async function previewActiveInteractive(){const html=await activeInteractiveHTML();if(!html){toastH('Interactive preview unavailable');return;}const u=URL.createObjectURL(new Blob([html],{type:'text/html'}));window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),60000)}
  async function pagePNGBlob(){const old=state.suppressGuides;state.suppressGuides=true;state.needsTextureUpdate=true;try{updateTexture?.()}catch{}const b=await new Promise(res=>texCanvas.toBlob(res,'image/png'));state.suppressGuides=old;state.needsTextureUpdate=true;return b}

  function packageIndex(pageFiles){const rows=pageFiles.map((p,i)=>`<button data-src="${p.path}">${String(i+1).padStart(2,'0')} · ${escapeHtml(p.name)}</button>`).join('');return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(state.projectName)} · BANDEROLAS</title><style>html,body{margin:0;height:100%;background:#080604;color:#eee;font-family:Arial,sans-serif}body{display:grid;grid-template-columns:220px 1fr}nav{padding:16px;background:#120c08;overflow:auto}button{display:block;width:100%;margin:0 0 8px;padding:10px;background:#080604;color:#ddd;border:1px solid #3b3129;text-align:left;cursor:pointer}button:hover{border-color:#d4af37}iframe{width:100%;height:100%;border:0;background:#000}@media(max-width:760px){body{grid-template-columns:1fr;grid-template-rows:auto 1fr}nav{display:flex;gap:6px;overflow:auto}button{min-width:150px}}</style></head><body><nav><h3>${escapeHtml(state.projectName)}</h3>${rows}</nav><iframe id="v" src="${pageFiles[0]?.path||''}"></iframe><script>document.querySelectorAll('button[data-src]').forEach(b=>b.onclick=()=>document.querySelector('#v').src=b.dataset.src)</script></body></html>`}
  async function exportAllPagesZip(){
    const d=doc();if(!d?.pages?.length){toastH('No pages to export');return;}pagesApi()?.saveActive?.();const original=d.activePageId,entries=[],pageFiles=[];toastH(`Building ${d.pages.length}-page package…`);
    for(let i=0;i<d.pages.length;i++){const p=d.pages[i];await pagesApi()?.activatePage?.(p.id,{saveCurrent:i===0});await wait(120);const html=await activeInteractiveHTML(),png=await pagePNGBlob(),slug=`${String(i+1).padStart(2,'0')}-${safeName(p.name||`page-${i+1}`)}`;if(html){const path=`pages/${slug}.html`;entries.push({name:path,data:enc.encode(html)});pageFiles.push({path,name:p.name||`Page ${i+1}`});}if(png)entries.push({name:`renders/${slug}.png`,data:new Uint8Array(await png.arrayBuffer())});}
    if(original)await pagesApi()?.activatePage?.(original,{saveCurrent:false});const payload=await buildPortablePayload();entries.push({name:'project-portable.json',data:enc.encode(JSON.stringify(payload,null,2))});entries.push({name:'index.html',data:enc.encode(packageIndex(pageFiles))});
    for(const a of payload.assets||[]){const blob=dataURLToBlob(a.dataURL),ext=(blob.type.split('/')[1]||'bin').replace('jpeg','jpg').replace('svg+xml','svg');entries.push({name:`assets/${safeName(a.name||a.id)}-${a.id.slice(-6)}.${ext}`,data:new Uint8Array(await blob.arrayBuffer())});}
    entries.push({name:'README.txt',data:enc.encode('BANDEROLAS PRO multipage package\nOpen index.html to navigate every interactive page.\nrenders/ contains a PNG for every page.\nproject-portable.json restores the complete multipage project and embedded media.\nassets/ contains original media from all pages.\n')});const zip=await zipStore(entries);download(zip,`${safeName(state.projectName)}-ALL-PAGES.zip`);toastH(`All-pages ZIP ready · ${d.pages.length} pages · ${payload.assets.length} media assets`);scanAssets();}

  function injectOutputHardening(){
    const out=$('#ws-output-core');if(!out||$('#ws-output-hardening'))return;const box=document.createElement('div');box.id='ws-output-hardening';box.className='ws-output-extra';box.innerHTML=`<div class="micro-label">PORTABLE / ALL PAGES</div><div class="grid2"><button id="ws-portable-export" class="btn-outline">PORTABLE PROJECT</button><button id="ws-portable-import" class="btn-outline">IMPORT PROJECT</button></div><div class="grid2"><button id="ws-all-pages-zip" class="btn-solid">ALL PAGES ZIP</button><button id="ws-interactive-html" class="btn-outline">INTERACTIVE HTML</button></div><input id="ws-portable-file" class="file-hidden" type="file" accept=".json,application/json"><div class="status">Portable Project includes every page + every referenced image/video. All Pages ZIP includes interactive HTML + PNG for each page + original media. Extended sizes 9:24 / 9:32 / 9:40 / Custom are patched into the interactive runtime.</div>`;out.appendChild(box);$('#ws-portable-export').onclick=exportPortable;$('#ws-portable-import').onclick=()=>$('#ws-portable-file').click();$('#ws-portable-file').onchange=async e=>{const f=e.target.files?.[0];if(f)await importPortableFile(f);e.target.value=''};$('#ws-all-pages-zip').onclick=exportAllPagesZip;$('#ws-interactive-html').onclick=exportActiveInteractive;
  }
  function replaceButtonHandler(id,fn){const old=$('#'+id);if(!old||old.dataset.hardExport==='1')return old;const clone=old.cloneNode(true);clone.dataset.hardExport='1';old.replaceWith(clone);clone.onclick=fn;return old;}
  function patchLegacyExportButtons(){
    if(!legacyPreviewButton)legacyPreviewButton=$('#p3-preview');if(!legacyPreviewButton)return;replaceButtonHandler('p3-json',exportPortable);replaceButtonHandler('p3-import',()=>$('#ws-portable-file')?.click());replaceButtonHandler('p3-interactive',exportActiveInteractive);replaceButtonHandler('p3-preview',previewActiveInteractive);replaceButtonHandler('p8-zip',exportAllPagesZip);
    const wsJson=$('#ws-export-json');if(wsJson&&wsJson.dataset.hardExport!=='1'){const old=wsJson,clone=old.cloneNode(true);clone.dataset.hardExport='1';old.replaceWith(clone);clone.onclick=exportPortable;}
  }

  function scheduleScan(ms=120){clearTimeout(scheduleScan.t);scheduleScan.t=setTimeout(()=>{scanAssets();decorateDishRows();applyHardHealth();},ms)}
  function bindDelegates(){
    document.addEventListener('click',async e=>{
      const use=e.target?.closest?.('[data-media-use]');if(use){addLibraryAssetToPage(use.dataset.mediaUse,use.dataset.mediaType);return;}
      const rep=e.target?.closest?.('[data-media-replace]');if(rep){replaceSelectedWithAsset(rep.dataset.mediaReplace,rep.dataset.mediaType);return;}
      const del=e.target?.closest?.('[data-media-delete]');if(del){const refs=collectAssetRefs();if(refs.has(del.dataset.mediaDelete)){toastH('Asset is still used on a page');return;}await deleteStoredAsset(del.dataset.mediaDelete);await scanAssets();return;}
      const dish=e.target?.closest?.('[data-ws-dish-upload]');if(dish){const input=$('#ws-dish-file');input.dataset.target=dish.dataset.wsDishUpload;input.click();return;}
      const clear=e.target?.closest?.('[data-ws-dish-clear]');if(clear){const [si,di]=clear.dataset.wsDishClear.split(':').map(Number);clearDishMedia(si,di);return;}
      if(e.target?.id==='ws-save'||e.target?.id==='save-project')setTimeout(establishBaseline,180);
      if(e.target?.id==='ws-open'||e.target?.id==='open-project')setTimeout(()=>{establishBaseline();scheduleScan(50)},500);
      if(e.target?.id==='ws-new'||e.target?.id==='new-project'){baselineFingerprint=null;setTimeout(()=>{applyHardHealth();scheduleScan()},250)}
      setTimeout(()=>{decorateDishRows();applyHardHealth();},160);
    },true);
    document.addEventListener('change',()=>{setTimeout(()=>{decorateDishRows();applyHardHealth();scheduleScan(250)},130)},true);
    document.addEventListener('input',e=>{if(e.target?.closest?.('#ui-panel'))setTimeout(applyHardHealth,160)},true);
  }

  async function boot(){
    injectStyle();injectMediaUI();injectOutputHardening();legacyPreviewButton=$('#p3-preview');patchLegacyExportButtons();rebindPrimarySurfaceControls();bindDelegates();setTimeout(()=>{decorateDishRows();scanAssets();},300);setTimeout(()=>{rebindPrimarySurfaceControls();patchLegacyExportButtons();decorateDishRows();scanAssets();},1200);if(hasSavedProject())baselineFingerprint=currentFingerprint();applyHardHealth();
    const panel=$('#ui-panel');if(panel){const mo=new MutationObserver(()=>{clearTimeout(boot.mo);boot.mo=setTimeout(()=>{injectMediaUI();injectOutputHardening();rebindPrimarySurfaceControls();patchLegacyExportButtons();decorateDishRows();},120)});mo.observe(panel,{childList:true,subtree:true});}
  }

  window.BanderolasHardening=Object.freeze({version:VERSION,scanAssets,collectAssetRefs,exportPortable,importPortableFile,exportAllPagesZip,setEngine:setEngineDirect,setVariant:setVariantDirect,verifyVariant,health:applyHardHealth});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,650),{once:true});else setTimeout(boot,650);
})();
