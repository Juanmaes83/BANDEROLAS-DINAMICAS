'use strict';
(() => {
  const VERSION='5.4R3';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let replaceTargetId=null;
  let lastSignature='';

  const pagesApi=()=>window.BanderolasRestaurantPages||null;
  const toastM=msg=>{try{toast(msg)}catch{console.log('[BANDEROLAS]',msg)}};
  const isPlacedUserMedia=el=>!!el && ['image','video','logo'].includes(el.type) && !el.role;

  function ensureStyle(){
    if($('#workspace-media-placement-style'))return;
    const style=document.createElement('style');
    style.id='workspace-media-placement-style';
    style.textContent=`
      #ws-page-media{border:1px solid #302925;background:#080504;padding:8px;margin:8px 0 10px}
      .ws-page-media-list{display:flex;flex-direction:column;gap:6px;margin-top:7px}
      .ws-page-media-item{border:1px solid #2e2825;background:#050303;padding:7px}
      .ws-page-media-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
      .ws-page-media-name{font-size:9px;color:#eee;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ws-page-media-type{font-size:7px;color:#9d8f83;border:1px solid #3a312c;padding:2px 4px}
      .ws-page-media-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}
      .ws-page-media-actions .danger{grid-column:1 / -1}
    `;
    document.head.appendChild(style);
  }

  function signature(){
    const ids=(state?.elements||[]).filter(isPlacedUserMedia).map(el=>`${el.id}:${el.assetId}:${el.type}:${el.name}`).join('|');
    return `${state?.restaurantDocument?.activePageId||''}::${ids}`;
  }

  function ensureUI(){
    const core=$('#ws-media-core');
    if(!core)return null;
    let panel=$('#ws-page-media');
    if(panel)return panel;
    panel=document.createElement('div');
    panel.id='ws-page-media';
    panel.innerHTML=`<div class="micro-label">MEDIA ON THIS PAGE</div><div class="status">Images/videos added with + IMAGE / + VIDEO appear here. Replace changes the file on this placed element. Remove deletes only the element from this page; the asset stays in Media Library until you delete it as unused.</div><input id="ws-page-media-replace-file" class="file-hidden" type="file" accept="image/*,video/*"><div id="ws-page-media-list" class="ws-page-media-list"></div>`;
    const library=core.querySelector('details');
    if(library)core.insertBefore(panel,library);else core.appendChild(panel);
    const input=$('#ws-page-media-replace-file');
    input.onchange=async()=>{
      const file=input.files?.[0];
      const targetId=replaceTargetId;
      input.value='';replaceTargetId=null;
      if(!file||!targetId)return;
      await replacePlacedMedia(targetId,file);
    };
    return panel;
  }

  function render(){
    ensureStyle();
    const panel=ensureUI();if(!panel)return;
    const list=$('#ws-page-media-list');if(!list)return;
    const media=(state?.elements||[]).filter(isPlacedUserMedia);
    if(!media.length){list.innerHTML='<div class="status warn">No added page media yet. Use + IMAGE or + VIDEO above.</div>';return;}
    list.innerHTML=media.map(el=>`<div class="ws-page-media-item" data-placement-id="${el.id}"><div class="ws-page-media-head"><div class="ws-page-media-name">${escapeHtml(el.name||el.type)}</div><span class="ws-page-media-type">${String(el.type||'media').toUpperCase()}</span></div><div class="ws-page-media-actions"><button class="mini-btn" data-placement-select="${el.id}">SELECT</button><button class="mini-btn" data-placement-replace="${el.id}">REPLACE FILE</button><button class="mini-btn danger" data-placement-remove="${el.id}">REMOVE FROM PAGE</button></div></div>`).join('');
  }

  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function persistActive(){
    state.needsTextureUpdate=true;
    pagesApi()?.saveActive?.({captureGlobal:false});
    try{renderLayers?.()}catch{}
    try{renderProperties?.()}catch{}
    try{window.BanderolasWorkspace?.captureThumbnail?.()}catch{}
    try{$('#ws-media-rescan')?.click()}catch{}
    lastSignature='';
    render();
  }

  async function replacePlacedMedia(id,file){
    const el=(state?.elements||[]).find(x=>x.id===id && isPlacedUserMedia(x));
    if(!el){toastM('Media element no longer exists');return;}
    try{if(typeof pushHistory==='function')pushHistory()}catch{}
    const newType=file.type?.startsWith('video/')?'video':(el.type==='logo'?'logo':'image');
    const assetId=typeof uid==='function'?uid('asset'):`asset-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    try{
      await putAsset(assetId,file);
      await loadRuntimeAsset(assetId,file,newType==='video'?'video':'image');
    }catch(err){console.error('[BANDEROLAS] replace placed media failed',err);toastM('Could not replace media');return;}
    el.assetId=assetId;el.type=newType;el.name=file.name||el.name;el.loop=true;el.muted=true;
    persistActive();
    toastM('Media replaced on this page');
  }

  function removePlacedMedia(id){
    const el=(state?.elements||[]).find(x=>x.id===id && isPlacedUserMedia(x));
    if(!el)return;
    try{if(typeof pushHistory==='function')pushHistory()}catch{}
    state.elements=(state.elements||[]).filter(x=>x.id!==id);
    if(state.selectedId===id)state.selectedId=null;
    try{normalizeZ?.()}catch{}
    persistActive();
    toastM('Media removed from this page. Asset kept in Media Library.');
  }

  document.addEventListener('click',ev=>{
    const select=ev.target.closest?.('[data-placement-select]');
    if(select){const id=select.dataset.placementSelect;try{setSelected?.(id)}catch{state.selectedId=id;renderLayers?.();renderProperties?.()}return;}
    const replace=ev.target.closest?.('[data-placement-replace]');
    if(replace){replaceTargetId=replace.dataset.placementReplace;const el=(state?.elements||[]).find(x=>x.id===replaceTargetId);const input=$('#ws-page-media-replace-file');if(input){input.accept=el?.type==='video'?'video/*':el?.type==='logo'?'image/*':'image/*,video/*';input.click();}return;}
    const remove=ev.target.closest?.('[data-placement-remove]');
    if(remove){removePlacedMedia(remove.dataset.placementRemove);return;}
  });

  function tick(){
    const sig=signature();
    if(sig!==lastSignature||!$('#ws-page-media')){lastSignature=sig;render();}
  }
  tick();
  setTimeout(tick,900);
  setInterval(tick,1200);
  window.BanderolasMediaPlacementControls={version:VERSION,render,removePlacedMedia,replacePlacedMedia};
})();
