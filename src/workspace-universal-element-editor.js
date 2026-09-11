'use strict';
(() => {
  const VERSION='5.4R5';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const pagesApi=()=>window.BanderolasRestaurantPages||null;
  const doc=()=>pagesApi()?.getDocument?.()||state.restaurantDocument||null;
  const toastU=msg=>{try{toast(msg)}catch{console.log('[BANDEROLAS]',msg)}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)));
  const selected=()=>state?.elements?.find(e=>e.id===state.selectedId)||null;
  const role=r=>state?.elements?.find(e=>e.role===r)||null;
  let replaceTargetId=null;
  let lastSig='';
  let intervalId=null;

  const STRUCTURED_TEXT=new Set(['caption','menu-signature','menu-starters','menu-mains','menu-desserts','menu-drinks','cta']);
  const STATIC_STRUCTURAL=new Set(['menu-backdrop','hero-overlay']);
  const ROLE_LABELS={
    'menu-backdrop':'Editorial Backdrop','logo':'Brand Logo','menu-edition':'Menu Edition','subheadline':'Brand Statement','hero':'Hero Media','caption':'Hero Caption',
    'menu-chef-title':'Chef Note Title','body':'Chef Note','menu-signature-title':'Signature Title','signature-media-1':'Signature Dish Image 01','signature-media-2':'Signature Dish Image 02','signature-media-3':'Signature Dish Image 03',
    'menu-signature':'Signature Dishes','menu-starters':'Starters','menu-mains':'Mains','menu-desserts':'Desserts','menu-drinks':'Drinks','cta':'Reservations','hero-overlay':'Hero Overlay'
  };

  function caps(el){
    const structural=!!el?.role;
    const media=['image','video','logo'].includes(el?.type);
    const text=el?.type==='text';
    const staticStructural=STATIC_STRUCTURAL.has(el?.role);
    return {
      selectable:!!el,
      movable:!staticStructural,
      resizable:!staticStructural,
      replaceable:media && el?.role!=='hero-overlay',
      textEditable:text && !STRUCTURED_TEXT.has(el?.role),
      styleEditable:text,
      duplicable:!structural,
      deletable:!structural,
      hideable:true,
      lockable:true,
      resettable:el?.role==='menu-backdrop'||el?.role==='logo'
    };
  }

  function labelFor(el){return ROLE_LABELS[el?.role]||el?.name||el?.role||el?.type||'Element';}
  function typeLabel(el){const base=String(el?.type||'element').toUpperCase();return el?.role?`${base} · ${el.role}`:base;}

  function injectStyle(){
    if($('#ue-style'))return;
    const s=document.createElement('style');s.id='ue-style';s.textContent=`
      #ue-core{border:1px solid #4b3d2c;background:linear-gradient(180deg,#0b0705,#060403);padding:9px;margin:0 0 10px}
      #ue-core .ue-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.ue-title{font-size:10px;font-weight:800;letter-spacing:1.1px;color:#e7d7ae}.ue-badge{font-size:7px;border:1px solid #4a4038;padding:2px 5px;color:#a99c91}.ue-badge.ok{color:#70c98a;border-color:#315339}.ue-badge.warn{color:#d8ab48;border-color:#5a4d26}.ue-badge.bad{color:#e35a5a;border-color:#6b3131}
      .ue-add{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:8px 0}.ue-add button{padding:8px 3px}
      #ue-inspector{border-top:1px dashed #332d28;margin-top:8px;padding-top:8px}.ue-selected-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:7px}.ue-selected-name{font:700 12px Georgia;color:#f0e7d6}.ue-selected-type{font-size:8px;color:#8f8985;margin-top:2px}.ue-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ue-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.ue-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}.ue-actions.three{grid-template-columns:repeat(3,1fr)}
      .ue-section{border-top:1px dashed #2f2925;margin-top:8px;padding-top:8px}.ue-range{display:grid;grid-template-columns:58px 1fr 38px;gap:6px;align-items:center;margin:6px 0}.ue-range label{font-size:8px;color:#8f8985;text-transform:uppercase}.ue-range input{width:100%;accent-color:#d4af37}.ue-range span{font-size:8px;color:#c5baa9;text-align:right}
      .ue-structural{border:1px solid #51431f;background:#100d06;color:#d7bd72;padding:7px;font-size:8px;line-height:1.45;margin:7px 0}.ue-help{font-size:8px;line-height:1.45;color:#887c73;margin-top:5px}
      #ue-save-row{display:grid;grid-template-columns:1fr 92px;gap:6px;align-items:center;margin-bottom:8px}.ue-save-state{border:1px solid #2f2925;padding:7px 8px;font-size:8px;color:#a99c91}.ue-save-state.ok{color:#70c98a;border-color:#315339}.ue-save-state.warn{color:#d8ab48;border-color:#5a4d26}.ue-save-state.bad{color:#e35a5a;border-color:#6b3131}
      #ws-page-media-editor{display:none!important}#ws-media-core>.ws-media-actions{display:none!important}
      .ue-restaurant-select{width:100%;margin:5px 0 7px;border-style:dashed!important}.ue-lock-note{font-size:8px;color:#d8ab48;margin-top:5px}
    `;document.head.appendChild(s);
  }

  function ensureUI(){
    const content=$('#ws-content-body');if(!content)return null;
    let core=$('#ue-core');if(core)return core;
    core=document.createElement('div');core.id='ue-core';
    core.innerHTML=`<div id="ue-save-row"><div id="ue-save-state" class="ue-save-state warn">PROJECT · checking save status…</div><button id="ue-save" class="btn-solid">SAVE</button></div><div class="ue-title-row"><div><div class="ue-title">UNIVERSAL CONTENT EDITOR</div><div class="ue-help">EDIT CONTENT → click any visible element on the document, or select it from Restaurant Content / Layers.</div></div><span class="ue-badge ok">R5</span></div><div class="ue-add"><button id="ue-add-image" class="add-btn">+ IMAGE</button><button id="ue-add-video" class="add-btn">+ VIDEO</button><button id="ue-add-text" class="add-btn">+ TEXT</button><button id="ue-add-logo" class="add-btn">+ LOGO</button></div><input id="ue-replace-file" class="file-hidden" type="file" accept="image/*,video/*"><div id="ue-inspector"></div>`;
    const media=$('#ws-media-core'),start=$('#ws-content-start');
    if(media)content.insertBefore(core,media);else if(start)start.insertAdjacentElement('afterend',core);else content.prepend(core);
    $('#ue-add-image').onclick=()=>$('#ws-upload-image')?.click();
    $('#ue-add-video').onclick=()=>$('#ws-upload-video')?.click();
    $('#ue-add-text').onclick=()=>document.querySelector('.add-btn[data-add="text"]')?.click();
    $('#ue-add-logo').onclick=()=>document.querySelector('.add-btn[data-add="logo"]')?.click();
    $('#ue-save').onclick=()=>$('#ws-save')?.click();
    $('#ue-replace-file').onchange=async e=>{const file=e.target.files?.[0],id=replaceTargetId;e.target.value='';replaceTargetId=null;if(file&&id)await replaceMedia(id,file);};
    return core;
  }

  function modeToEdit(){
    if(state.mode==='edit')return;
    const b=document.querySelector('.mode-btn[data-mode="edit"]');if(b)b.click();else{state.mode='edit';try{syncUI?.()}catch{}state.needsTextureUpdate=true;}
  }

  function selectElement(id,{scroll=true}={}){
    const el=state.elements?.find(x=>x.id===id);if(!el)return;
    modeToEdit();
    try{setSelected(id)}catch{state.selectedId=id;try{renderLayers?.();renderProperties?.()}catch{}state.needsTextureUpdate=true;}
    lastSig='';render();
    if(scroll)$('#ue-core')?.scrollIntoView({block:'nearest'});
  }

  function persist({scan=false}={}){
    state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});
    try{renderLayers?.();renderProperties?.();window.BanderolasWorkspace?.captureThumbnail?.()}catch{}
    if(scan)try{$('#ws-media-rescan')?.click()}catch{}
    lastSig='';render();
  }

  function syncSimpleRestaurantText(el){
    const m=state.restaurantMenu;if(!m||!el?.role)return;
    if(el.role==='menu-edition'&&m.restaurant)m.restaurant.edition=el.text;
    else if(el.role==='subheadline'&&m.restaurant)m.restaurant.claim=el.text;
    else if(el.role==='menu-chef-title'&&m.chef)m.chef.title=el.text;
    else if(el.role==='body'&&m.chef)m.chef.body=el.text;
  }

  function registerAsset(file,type){
    const id=typeof uid==='function'?uid('asset'):`asset-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    return Promise.resolve().then(async()=>{await putAsset(id,file);await loadRuntimeAsset(id,file,type==='video'?'video':'image');return id;});
  }

  async function replaceMedia(id,file){
    const el=state.elements?.find(x=>x.id===id);if(!el||!['image','video','logo'].includes(el.type))return;
    const c=caps(el);if(!c.replaceable){toastU('This structural element cannot replace its asset here');return;}
    try{if(typeof pushHistory==='function')pushHistory()}catch{}
    const nextType=file.type?.startsWith('video/')?'video':(el.type==='logo'?'logo':'image');
    let assetId;try{assetId=await registerAsset(file,nextType);}catch(e){console.error(e);toastU('Could not load replacement media');return;}
    const apply=x=>{if(!x)return;x.assetId=assetId;x.type=nextType;x.name=file.name||x.name;x.loop=true;x.muted=true;};
    apply(el);
    if(el.role==='logo'){
      const d=doc();if(d?.pages){for(const p of d.pages){const other=p.elements?.find(x=>x.role==='logo');if(other)apply(other);}d.global=d.global||{};d.global.brandAssetIds=d.global.brandAssetIds||{};d.global.brandAssetIds.logo=assetId;}
    }
    state.selectedId=id;persist({scan:true});toastU(`${labelFor(el)} replaced · geometry preserved`);
  }

  function duplicateElement(el){
    if(!caps(el).duplicable)return;
    try{if(typeof pushHistory==='function')pushHistory()}catch{}
    const clone=JSON.parse(JSON.stringify(el));clone.id=typeof uid==='function'?uid(el.type):`${el.type}-${Date.now()}`;clone.name=(el.name||el.type)+' Copy';clone.x=clamp((clone.x||0)+.025,-.5,1.5-(clone.w||.1));clone.y=clamp((clone.y||0)+.025,-.5,1.5-(clone.h||.1));clone.role=null;state.elements.push(clone);try{normalizeZ?.()}catch{}state.selectedId=clone.id;persist({scan:true});
  }

  function deleteOrHide(el){
    const c=caps(el);if(c.deletable){try{if(typeof pushHistory==='function')pushHistory()}catch{}state.elements=state.elements.filter(x=>x.id!==el.id);state.selectedId=null;try{normalizeZ?.()}catch{}persist({scan:true});toastU('Element removed from page');return;}
    if(c.hideable){try{if(typeof pushHistory==='function')pushHistory()}catch{}el.visible=false;persist();toastU('Structural element hidden · it can be shown again from Layers');}
  }

  function resetStructural(el){
    if(el.role==='menu-backdrop'||el.role==='logo'){$('#ws-refresh-brand')?.click();toastU('Brand / editorial assets regenerated');}
  }

  function setProp(el,prop,value,{history=true}={}){
    if(!el)return;if(history)try{if(typeof pushHistory==='function')pushHistory()}catch{}
    const numeric={x:[-.5,1.5],y:[-.5,1.5],w:[.02,1.5],h:[.02,1.5],rotation:[-180,180],opacity:[0,1],zoom:[1,4],cropX:[-1,1],cropY:[-1,1],fontSize:[8,220]};
    if(numeric[prop]){const [a,b]=numeric[prop];el[prop]=clamp(value,a,b);}else if(prop==='fit'&&['cover','contain','fill'].includes(value))el.fit=value;else if(prop==='align'&&['left','center','right'].includes(value))el.align=value;else if(prop==='fontWeight')el.fontWeight=Number(value);else if(prop==='visible')el.visible=!!value;else if(prop==='locked')el.locked=!!value;else el[prop]=value;
    if(prop==='text')syncSimpleRestaurantText(el);persist();
  }

  function range(label,prop,value,min,max,step){return `<div class="ue-range"><label>${label}</label><input data-ue-live="${prop}" type="range" min="${min}" max="${max}" step="${step}" value="${Number(value)}"><span data-ue-value="${prop}">${Number(value).toFixed(2)}</span></div>`;}
  function numberField(label,prop,value,min,max,step=.01){return `<div class="form-group"><label>${label}</label><input class="form-control" data-ue-prop="${prop}" type="number" min="${min}" max="${max}" step="${step}" value="${Number(value).toFixed(3)}"></div>`;}

  function inspectorHTML(el){
    if(!el)return `<div class="status">Nothing selected. Click <b>EDIT CONTENT</b>, then click any visible object on the document. You can also select from Restaurant Content or Layers.</div>`;
    const c=caps(el),struct=!!el.role;
    let html=`<div class="ue-selected-head"><div><div class="ue-selected-name">${esc(labelFor(el))}</div><div class="ue-selected-type">${esc(typeLabel(el))}</div></div><div>${struct?'<span class="ue-badge warn">STRUCTURAL</span>':'<span class="ue-badge ok">FREE</span>'}${el.locked?' <span class="ue-badge warn">LOCKED</span>':''}${!el.visible?' <span class="ue-badge bad">HIDDEN</span>':''}</div></div>`;
    if(struct)html+=`<div class="ue-structural">Template element · safe editing is enabled. Structural elements are hidden/reset instead of permanently deleted.</div>`;
    if(c.movable||c.resizable)html+=`<div class="ue-section"><div class="micro-label">POSITION & SIZE</div><div class="ue-grid2">${numberField('X','x',el.x||0,-.5,1.5)}${numberField('Y','y',el.y||0,-.5,1.5)}${numberField('Width','w',el.w||.2,.02,1.5)}${numberField('Height','h',el.h||.2,.02,1.5)}</div>${range('Rotation','rotation',el.rotation||0,-180,180,1)}${range('Opacity','opacity',el.opacity??1,0,1,.01)}</div>`;
    if(['image','video','logo'].includes(el.type)){
      html+=`<div class="ue-section"><div class="micro-label">MEDIA</div>${c.replaceable?`<button class="btn-solid" data-ue-replace="${el.id}">REPLACE ${String(el.type).toUpperCase()}</button>`:'<div class="status warn">This generated structural media is controlled by its design settings.</div>'}<div class="form-group" style="margin-top:7px"><label>Fit</label><select class="form-control" data-ue-prop="fit"><option value="cover" ${el.fit==='cover'?'selected':''}>Cover</option><option value="contain" ${el.fit==='contain'?'selected':''}>Contain</option><option value="fill" ${el.fit==='fill'?'selected':''}>Fill</option></select></div>${range('Zoom','zoom',el.zoom||1,1,4,.01)}${range('Crop X','cropX',el.cropX||0,-1,1,.01)}${range('Crop Y','cropY',el.cropY||0,-1,1,.01)}${el.type==='video'?`<div class="ue-grid2"><button class="mini-btn" data-ue-toggle="loop">Loop: ${el.loop!==false?'ON':'OFF'}</button><button class="mini-btn" data-ue-toggle="muted">Mute: ${el.muted!==false?'ON':'OFF'}</button></div>`:''}</div>`;
    }
    if(el.type==='text'){
      html+=`<div class="ue-section"><div class="micro-label">TEXT</div>`;
      if(STRUCTURED_TEXT.has(el.role))html+=`<div class="status warn">This text is built from structured restaurant data. Edit dishes, prices, reservations or identity in Restaurant Content so the menu model stays consistent.</div><button class="btn-outline" style="margin-top:6px" data-ue-open-restaurant="${esc(el.role||'')}">EDIT RESTAURANT DATA</button>`;
      else html+=`<div class="form-group"><label>Text</label><textarea class="form-control" data-ue-prop="text" rows="4" style="resize:vertical">${esc(el.text||'')}</textarea></div>`;
      html+=`<div class="ue-grid2"><div class="form-group"><label>Font</label><select class="form-control" data-ue-prop="font">${['Arial','Georgia','Courier New','Trebuchet MS','Verdana','Times New Roman','Impact'].map(f=>`<option ${f===el.font?'selected':''}>${f}</option>`).join('')}</select></div><div class="form-group"><label>Weight</label><select class="form-control" data-ue-prop="fontWeight"><option value="400" ${Number(el.fontWeight||400)===400?'selected':''}>Regular</option><option value="600" ${Number(el.fontWeight)===600?'selected':''}>Semibold</option><option value="700" ${Number(el.fontWeight)===700?'selected':''}>Bold</option><option value="800" ${Number(el.fontWeight)===800?'selected':''}>Extra Bold</option></select></div><div class="form-group"><label>Size</label><input class="form-control" data-ue-prop="fontSize" type="number" min="8" max="220" step="1" value="${Number(el.fontSize||32)}"></div><div class="form-group"><label>Color</label><input class="color-input" data-ue-prop="color" type="color" value="${esc(el.color||'#f0e7d6')}"></div></div><div class="form-group"><label>Align</label><select class="form-control" data-ue-prop="align"><option value="left" ${el.align==='left'?'selected':''}>Left</option><option value="center" ${el.align==='center'?'selected':''}>Center</option><option value="right" ${el.align==='right'?'selected':''}>Right</option></select></div></div>`;
    }
    html+=`<div class="ue-section"><div class="micro-label">ELEMENT ACTIONS</div><div class="ue-actions three"><button class="mini-btn" data-ue-lock="${el.id}">${el.locked?'UNLOCK':'LOCK'}</button><button class="mini-btn" data-ue-hide="${el.id}">${el.visible?'HIDE':'SHOW'}</button>${c.duplicable?`<button class="mini-btn" data-ue-duplicate="${el.id}">DUPLICATE</button>`:c.resettable?`<button class="mini-btn" data-ue-reset="${el.id}">RESET</button>`:'<button class="mini-btn" disabled>STRUCTURE</button>'}</div><button class="mini-btn ${c.deletable?'danger':''}" style="width:100%;margin-top:5px" data-ue-remove="${el.id}">${c.deletable?'DELETE ELEMENT':'HIDE STRUCTURAL ELEMENT'}</button></div>`;
    return html;
  }

  function renderSaveState(){
    const box=$('#ue-save-state');if(!box)return;
    const out=$('#ws-output-state'),msg=$('#ws-output-status');
    const cls=out?.className||'',text=(out?.textContent||'CHECK').trim();
    box.className='ue-save-state '+(cls.includes('ws-green')?'ok':cls.includes('ws-red')?'bad':'warn');
    box.textContent=cls.includes('ws-green')?'PROJECT · SAVED / READY':cls.includes('ws-red')?'PROJECT · ISSUE TO FIX':'PROJECT · UNSAVED / CHECK';
    box.title=msg?.textContent||text;
  }

  function render(){
    injectStyle();const core=ensureUI();if(!core)return;
    const box=$('#ue-inspector');if(box)box.innerHTML=inspectorHTML(selected());
    renderSaveState();decorateRestaurantControls();
  }

  function openRestaurantForRole(r){
    const section=$('#restaurant-menu-controls-section');if(!section)return;section.open=true;
    const map={caption:'#rm-name','menu-signature':'[data-signature="0"]','menu-starters':'[data-section="starters"]','menu-mains':'[data-section="mains"]','menu-desserts':'[data-section="desserts"]','menu-drinks':'[data-section="drinks"]','cta':'#rm-phone'};
    const target=section.querySelector(map[r]||'#rm-name');const detail=target?.closest('details');if(detail)detail.open=true;target?.scrollIntoView({block:'nearest'});
  }

  function addSelectButton(container,roleName,label){
    if(!container||container.querySelector(`[data-ue-select-role="${roleName}"]`))return;
    const b=document.createElement('button');b.className='mini-btn ue-restaurant-select';b.dataset.ueSelectRole=roleName;b.textContent=`SELECT ON DOCUMENT · ${label}`;container.appendChild(b);
  }

  function decorateRestaurantControls(){
    const panel=$('#restaurant-menu-controls-section');if(!panel)return;
    const identity=$('#rm-name')?.closest('.section-body');if(identity){addSelectButton(identity,'logo','Logo');addSelectButton(identity,'subheadline','Claim');}
    addSelectButton($('#rm-hero-replace')?.closest('.section-body'),'hero','Hero');
    addSelectButton($('#rm-chef-title')?.closest('.section-body'),'body','Chef Note');
    $$('[data-signature]').forEach((row,i)=>addSelectButton(row,`signature-media-${i+1}`,`Signature Image ${i+1}`));
    const sectionRole={starters:'menu-starters',mains:'menu-mains',desserts:'menu-desserts',drinks:'menu-drinks'};
    $$('[data-section]').forEach(x=>{const k=x.dataset.section,r=sectionRole[k];if(r)addSelectButton(x,r,k);});
    addSelectButton($('#rm-phone')?.closest('.section-body'),'cta','Reservations');
  }

  document.addEventListener('click',e=>{
    const roleBtn=e.target.closest?.('[data-ue-select-role]');if(roleBtn){const el=role(roleBtn.dataset.ueSelectRole);if(el)selectElement(el.id);return;}
    const replace=e.target.closest?.('[data-ue-replace]');if(replace){const el=state.elements.find(x=>x.id===replace.dataset.ueReplace);if(!el)return;replaceTargetId=el.id;const input=$('#ue-replace-file');if(input){input.accept=el.type==='video'?'video/*':el.type==='logo'?'image/*':'image/*,video/*';input.click();}return;}
    const lock=e.target.closest?.('[data-ue-lock]');if(lock){const el=state.elements.find(x=>x.id===lock.dataset.ueLock);if(el){setProp(el,'locked',!el.locked);render();}return;}
    const hide=e.target.closest?.('[data-ue-hide]');if(hide){const el=state.elements.find(x=>x.id===hide.dataset.ueHide);if(el){setProp(el,'visible',!el.visible);render();}return;}
    const dup=e.target.closest?.('[data-ue-duplicate]');if(dup){const el=state.elements.find(x=>x.id===dup.dataset.ueDuplicate);if(el)duplicateElement(el);return;}
    const rem=e.target.closest?.('[data-ue-remove]');if(rem){const el=state.elements.find(x=>x.id===rem.dataset.ueRemove);if(el)deleteOrHide(el);return;}
    const reset=e.target.closest?.('[data-ue-reset]');if(reset){const el=state.elements.find(x=>x.id===reset.dataset.ueReset);if(el)resetStructural(el);return;}
    const open=e.target.closest?.('[data-ue-open-restaurant]');if(open){openRestaurantForRole(open.dataset.ueOpenRestaurant);return;}
    const toggle=e.target.closest?.('[data-ue-toggle]');if(toggle){const el=selected();if(el)setProp(el,toggle.dataset.ueToggle,!el[toggle.dataset.ueToggle]);return;}
  });

  document.addEventListener('change',e=>{
    const field=e.target.closest?.('[data-ue-prop]');if(!field)return;const el=selected();if(!el)return;
    const prop=field.dataset.ueProp;setProp(el,prop,field.value,{history:true});
  });

  let liveHistory=false;
  document.addEventListener('pointerdown',e=>{if(e.target.closest?.('[data-ue-live]')){liveHistory=true;try{if(typeof pushHistory==='function')pushHistory()}catch{}}});
  document.addEventListener('input',e=>{
    const field=e.target.closest?.('[data-ue-live]');if(!field)return;const el=selected();if(!el)return;
    const prop=field.dataset.ueLive,limits={rotation:[-180,180],opacity:[0,1],zoom:[1,4],cropX:[-1,1],cropY:[-1,1]},[a,b]=limits[prop]||[-999,999];el[prop]=clamp(field.value,a,b);state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});const v=document.querySelector(`[data-ue-value="${prop}"]`);if(v)v.textContent=Number(el[prop]).toFixed(2);
  });
  document.addEventListener('pointerup',()=>{if(liveHistory){liveHistory=false;try{window.BanderolasWorkspace?.captureThumbnail?.()}catch{}lastSig='';}});

  const container=()=>$('#canvas-container');
  function installLockedCanvasSelection(){
    const c=container();if(!c||c.dataset.ueLockedSelect==='1')return;c.dataset.ueLockedSelect='1';
    c.addEventListener('mousedown',e=>{
      if(state.mode!=='edit'||typeof screenToUV!=='function'||typeof contains!=='function')return;
      const r=c.getBoundingClientRect(),uv=screenToUV(e.clientX-r.left,e.clientY-r.top);if(!uv)return;
      const hit=[...(state.elements||[])].filter(x=>x.visible).sort((a,b)=>(b.zIndex||0)-(a.zIndex||0)).find(x=>contains(x,uv.u,uv.v));
      if(hit?.locked){selectElement(hit.id,{scroll:false});e.stopImmediatePropagation();}
    },true);
  }

  function sig(){const el=selected();return `${state?.restaurantDocument?.activePageId||''}|${state?.selectedId||''}|${state?.mode||''}|${el?JSON.stringify([el.id,el.type,el.role,el.assetId,el.name,el.text,el.x,el.y,el.w,el.h,el.rotation,el.opacity,el.visible,el.locked,el.fit,el.zoom,el.cropX,el.cropY,el.font,el.fontSize,el.fontWeight,el.color,el.align]):''}|${$('#ws-output-state')?.className||''}:${$('#ws-output-state')?.textContent||''}`;}
  function tick(){installLockedCanvasSelection();const s=sig();if(s!==lastSig||!$('#ue-core')){lastSig=s;render();}else{renderSaveState();decorateRestaurantControls();}}

  tick();setTimeout(tick,700);intervalId=setInterval(tick,650);
  window.BanderolasUniversalEditor={version:VERSION,render,selectElement,caps,replaceMedia,destroy:()=>{if(intervalId)clearInterval(intervalId);}};
})();
