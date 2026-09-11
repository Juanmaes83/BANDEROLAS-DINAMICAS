'use strict';
(() => {
  const VERSION='5.4R4';
  const $=s=>document.querySelector(s);
  let replaceTargetId=null;
  let lastSignature='';
  let rangeHistoryArmed=false;

  const pagesApi=()=>window.BanderolasRestaurantPages||null;
  const toastM=msg=>{try{toast(msg)}catch{console.log('[BANDEROLAS]',msg)}};
  const isPlacedUserMedia=el=>!!el && ['image','video','logo'].includes(el.type) && !el.role;
  const getPlaced=id=>(state?.elements||[]).find(x=>x.id===id && isPlacedUserMedia(x))||null;
  const selectedPlaced=()=>getPlaced(state?.selectedId);
  const clampN=(v,min,max)=>Math.max(min,Math.min(max,Number(v)));
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function ensureStyle(){
    if($('#workspace-media-placement-style'))return;
    const style=document.createElement('style');
    style.id='workspace-media-placement-style';
    style.textContent=`
      #ws-page-media{border:1px solid #302925;background:#080504;padding:8px;margin:8px 0 10px}
      .ws-page-media-list{display:flex;flex-direction:column;gap:6px;margin-top:7px}
      .ws-page-media-item{border:1px solid #2e2825;background:#050303;padding:7px;transition:.15s}
      .ws-page-media-item.selected{border-color:#d4af37;background:rgba(212,175,55,.07);box-shadow:0 0 0 1px rgba(212,175,55,.16)}
      .ws-page-media-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .ws-page-media-name{font-size:9px;color:#eee;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-page-media-badges{display:flex;gap:4px;align-items:center}.ws-page-media-type,.ws-page-media-selected{font-size:7px;border:1px solid #3a312c;padding:2px 4px}.ws-page-media-type{color:#9d8f83}.ws-page-media-selected{color:#70c98a;border-color:#315339}
      .ws-page-media-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.ws-page-media-actions .danger{grid-column:1 / -1}
      #ws-page-media-editor{margin-top:8px;border-top:1px dashed #332d29;padding-top:8px}.ws-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ws-quick-grid .form-group{margin-bottom:6px}
      .ws-quick-range{display:grid;grid-template-columns:54px 1fr 38px;gap:6px;align-items:center;margin-top:6px}.ws-quick-range label{font-size:8px;color:#8f8985;text-transform:uppercase}.ws-quick-range input{width:100%;accent-color:#d4af37}.ws-quick-value{font-size:8px;color:#c5baa9;text-align:right}
    `;
    document.head.appendChild(style);
  }

  function signature(){
    const ids=(state?.elements||[]).filter(isPlacedUserMedia).map(el=>`${el.id}:${el.assetId}:${el.type}:${el.name}:${el.x}:${el.y}:${el.w}:${el.h}:${el.fit}:${el.cropX}:${el.cropY}:${el.zoom}`).join('|');
    return `${state?.restaurantDocument?.activePageId||''}::${state?.selectedId||''}::${state?.mode||''}::${ids}`;
  }

  function ensureUI(){
    const core=$('#ws-media-core');if(!core)return null;
    let panel=$('#ws-page-media');if(panel)return panel;
    panel=document.createElement('div');panel.id='ws-page-media';
    panel.innerHTML=`<div class="micro-label">MEDIA ON THIS PAGE</div><div class="status">Add media above. EDIT selects the placed item, switches to EDIT CONTENT automatically and shows its handles on the document. Replace keeps its geometry. Remove deletes only the placement; the asset remains in Media Library.</div><input id="ws-page-media-replace-file" class="file-hidden" type="file" accept="image/*,video/*"><div id="ws-page-media-list" class="ws-page-media-list"></div><div id="ws-page-media-editor"></div>`;
    const library=core.querySelector('details');if(library)core.insertBefore(panel,library);else core.appendChild(panel);
    const input=$('#ws-page-media-replace-file');input.onchange=async()=>{const file=input.files?.[0],targetId=replaceTargetId;input.value='';replaceTargetId=null;if(file&&targetId)await replacePlacedMedia(targetId,file);};
    return panel;
  }

  function render(){
    ensureStyle();const panel=ensureUI();if(!panel)return;
    const list=$('#ws-page-media-list'),editor=$('#ws-page-media-editor');if(!list||!editor)return;
    const media=(state?.elements||[]).filter(isPlacedUserMedia),selectedId=state?.selectedId;
    if(!media.length){list.innerHTML='<div class="status warn">No added page media yet. Use + IMAGE or + VIDEO above.</div>';editor.innerHTML='';return;}
    list.innerHTML=media.map(el=>{
      const selected=el.id===selectedId;
      return `<div class="ws-page-media-item ${selected?'selected':''}" data-placement-id="${el.id}"><div class="ws-page-media-head"><div class="ws-page-media-name">${escapeHtml(el.name||el.type)}</div><div class="ws-page-media-badges"><span class="ws-page-media-type">${String(el.type||'media').toUpperCase()}</span>${selected?'<span class="ws-page-media-selected">SELECTED</span>':''}</div></div><div class="ws-page-media-actions"><button class="mini-btn ${selected&&state.mode==='edit'?'active':''}" data-placement-select="${el.id}">${selected&&state.mode==='edit'?'EDITING':'EDIT'}</button><button class="mini-btn" data-placement-replace="${el.id}">REPLACE FILE</button><button class="mini-btn danger" data-placement-remove="${el.id}">REMOVE FROM PAGE</button></div></div>`;
    }).join('');
    renderQuickEditor(editor,selectedPlaced());
  }

  function renderQuickEditor(box,el){
    if(!el){box.innerHTML='<div class="status" style="margin-top:8px">Choose EDIT on a media item to expose quick position, size and crop controls.</div>';return;}
    if(state.mode!=='edit'){
      box.innerHTML=`<div class="status warn">${escapeHtml(el.name||'Media')} is selected, but FABRIC / INTERACT is active. Return to EDIT CONTENT to change this element.</div><button class="btn-outline" style="margin-top:6px" data-placement-select="${el.id}">EDIT SELECTED MEDIA</button>`;return;
    }
    const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
    box.innerHTML=`<div class="micro-label">QUICK EDIT · ${escapeHtml(el.name||el.type)}</div><div class="status ok">EDIT MODE · handles are visible on the document. Drag there directly or use these precise controls.</div><div class="ws-quick-grid" style="margin-top:7px"><div class="form-group"><label>X</label><input class="form-control" data-placement-prop="x" type="number" min="-0.5" max="1.5" step="0.01" value="${n(el.x).toFixed(3)}"></div><div class="form-group"><label>Y</label><input class="form-control" data-placement-prop="y" type="number" min="-0.5" max="1.5" step="0.01" value="${n(el.y).toFixed(3)}"></div><div class="form-group"><label>Width</label><input class="form-control" data-placement-prop="w" type="number" min="0.02" max="1.5" step="0.01" value="${n(el.w,.2).toFixed(3)}"></div><div class="form-group"><label>Height</label><input class="form-control" data-placement-prop="h" type="number" min="0.02" max="1.5" step="0.01" value="${n(el.h,.2).toFixed(3)}"></div></div><div class="form-group"><label>Fit</label><select class="form-control" data-placement-prop="fit"><option value="cover" ${el.fit==='cover'?'selected':''}>Cover</option><option value="contain" ${el.fit==='contain'?'selected':''}>Contain</option><option value="fill" ${el.fit==='fill'?'selected':''}>Fill</option></select></div>${quickRange('Zoom','zoom',n(el.zoom,1),1,4,.01)}${quickRange('Crop X','cropX',n(el.cropX,0),-1,1,.01)}${quickRange('Crop Y','cropY',n(el.cropY,0),-1,1,.01)}<div class="ws-page-media-actions"><button class="mini-btn" data-placement-replace="${el.id}">REPLACE FILE</button><button class="mini-btn danger" data-placement-remove="${el.id}">REMOVE FROM PAGE</button></div>`;
  }

  function quickRange(label,prop,value,min,max,step){return `<div class="ws-quick-range"><label>${label}</label><input data-placement-live="${prop}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><span class="ws-quick-value" data-placement-value="${prop}">${Number(value).toFixed(2)}</span></div>`;}

  function switchToEdit(){
    if(state.mode==='edit')return true;
    const btn=document.querySelector('.mode-btn[data-mode="edit"]');
    if(btn){btn.click();return state.mode==='edit';}
    state.mode='edit';try{syncUI?.()}catch{};state.needsTextureUpdate=true;return true;
  }

  function selectPlacedMedia(id){
    const el=getPlaced(id);if(!el){toastM('Media element no longer exists');return;}
    switchToEdit();
    try{setSelected(id)}catch{state.selectedId=id;try{renderLayers?.();renderProperties?.()}catch{}state.needsTextureUpdate=true;}
    lastSignature='';render();
    toastM('EDIT CONTENT · media selected');
  }

  function persistActive({rescan=true}={}){
    state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});
    try{renderLayers?.();renderProperties?.();window.BanderolasWorkspace?.captureThumbnail?.()}catch{}
    if(rescan)try{$('#ws-media-rescan')?.click()}catch{}
    lastSignature='';render();
  }

  function mutatePlaced(prop,value,{history=true,rescan=false}={}){
    const el=selectedPlaced();if(!el||state.mode!=='edit')return;
    if(history)try{if(typeof pushHistory==='function')pushHistory()}catch{}
    if(['x','y','w','h','zoom','cropX','cropY'].includes(prop)){
      const limits={x:[-.5,1.5],y:[-.5,1.5],w:[.02,1.5],h:[.02,1.5],zoom:[1,4],cropX:[-1,1],cropY:[-1,1]};
      const [min,max]=limits[prop];el[prop]=clampN(value,min,max);
    }else if(prop==='fit'&&['cover','contain','fill'].includes(value))el.fit=value;
    persistActive({rescan});
  }

  async function replacePlacedMedia(id,file){
    const el=getPlaced(id);if(!el){toastM('Media element no longer exists');return;}
    try{if(typeof pushHistory==='function')pushHistory()}catch{}
    const newType=file.type?.startsWith('video/')?'video':(el.type==='logo'?'logo':'image');
    const assetId=typeof uid==='function'?uid('asset'):`asset-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    try{await putAsset(assetId,file);await loadRuntimeAsset(assetId,file,newType==='video'?'video':'image');}
    catch(err){console.error('[BANDEROLAS] replace placed media failed',err);toastM('Could not replace media');return;}
    el.assetId=assetId;el.type=newType;el.name=file.name||el.name;el.loop=true;el.muted=true;state.selectedId=id;persistActive();toastM('Media replaced · position and size preserved');
  }

  function removePlacedMedia(id){
    const el=getPlaced(id);if(!el)return;
    try{if(typeof pushHistory==='function')pushHistory()}catch{}
    state.elements=(state.elements||[]).filter(x=>x.id!==id);if(state.selectedId===id)state.selectedId=null;
    try{normalizeZ?.()}catch{}persistActive();toastM('Media removed from page · asset kept in Media Library');
  }

  document.addEventListener('click',ev=>{
    const select=ev.target.closest?.('[data-placement-select]');if(select){selectPlacedMedia(select.dataset.placementSelect);return;}
    const replace=ev.target.closest?.('[data-placement-replace]');if(replace){replaceTargetId=replace.dataset.placementReplace;const el=getPlaced(replaceTargetId),input=$('#ws-page-media-replace-file');if(input){input.accept=el?.type==='video'?'video/*':el?.type==='logo'?'image/*':'image/*,video/*';input.click();}return;}
    const remove=ev.target.closest?.('[data-placement-remove]');if(remove){removePlacedMedia(remove.dataset.placementRemove);return;}
  });

  document.addEventListener('change',ev=>{
    const field=ev.target.closest?.('[data-placement-prop]');if(!field)return;
    mutatePlaced(field.dataset.placementProp,field.value,{history:true,rescan:false});
  });
  document.addEventListener('pointerdown',ev=>{if(ev.target.closest?.('[data-placement-live]')){rangeHistoryArmed=true;try{if(typeof pushHistory==='function')pushHistory()}catch{}}});
  document.addEventListener('input',ev=>{
    const field=ev.target.closest?.('[data-placement-live]');if(!field)return;
    const prop=field.dataset.placementLive,el=selectedPlaced();if(!el||state.mode!=='edit')return;
    const limits={zoom:[1,4],cropX:[-1,1],cropY:[-1,1]},[min,max]=limits[prop]||[-10,10];el[prop]=clampN(field.value,min,max);state.needsTextureUpdate=true;pagesApi()?.saveActive?.({captureGlobal:false});
    const out=document.querySelector(`[data-placement-value="${prop}"]`);if(out)out.textContent=Number(el[prop]).toFixed(2);
  });
  document.addEventListener('pointerup',()=>{if(rangeHistoryArmed){rangeHistoryArmed=false;try{window.BanderolasWorkspace?.captureThumbnail?.()}catch{}lastSignature='';}});

  function tick(){const sig=signature();if(sig!==lastSignature||!$('#ws-page-media')){lastSignature=sig;render();}}
  tick();setTimeout(tick,900);setInterval(tick,800);
  window.BanderolasMediaPlacementControls={version:VERSION,render,selectPlacedMedia,removePlacedMedia,replacePlacedMedia};
})();
