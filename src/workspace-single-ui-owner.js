'use strict';
(() => {
  const VERSION='5.4R7';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let timer=null;
  let lastSelected=null;
  let initialCollapseDone=false;

  function style(){
    if($('#r7-style'))return;
    const s=document.createElement('style');
    s.id='r7-style';
    s.textContent=`
      #r7-controlbar{position:sticky;top:-18px;z-index:500;background:linear-gradient(180deg,#1b100b 0%,#130a07 88%,rgba(19,10,7,.97) 100%);padding:10px 0 8px;margin:-2px 0 8px;border-bottom:1px solid #3b3029;box-shadow:0 8px 18px rgba(0,0,0,.34)}
      #r7-mode-host .mode-toggle{position:static!important;top:auto!important;margin:0 0 6px!important;padding:0!important;background:transparent!important;z-index:auto!important;grid-template-columns:1fr 1fr!important}
      #r7-mode-host .mode-btn{min-height:35px;font-size:9px;letter-spacing:.65px}
      #r7-meta{display:grid;grid-template-columns:1fr 82px;gap:6px;align-items:center}
      #r7-status{border:1px solid #5a4d26;background:#070403;padding:6px 8px;font-size:8px;letter-spacing:.35px;color:#d8ab48;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #r7-status.ok{color:#70c98a;border-color:#315339}#r7-status.bad{color:#e35a5a;border-color:#6b3131}#r7-status.warn{color:#d8ab48;border-color:#5a4d26}
      #r7-save{padding:7px 5px!important}
      #ue-save-row{display:none!important}
      #ws-content-start,#ws-apply-restaurant,#restaurant-menu-premium-section,#ws-page-media-editor{display:none!important}
      #ws-media-core{display:none!important}
      #ws-content-host{display:contents!important}
      #ws-content-body>#ue-core{margin:0 0 8px!important;border-color:#4a3a24!important}
      #ws-content-body>#ue-core .ue-title{font-size:11px!important}
      #restaurant-menu-controls-section,#r7-assets-details,#ws-content-body>.ws-advanced{margin:7px 0!important;border:1px solid #2d2723!important;background:#070403!important;padding:0 7px 7px!important}
      #restaurant-menu-controls-section>summary,#r7-assets-details>summary,#ws-content-body>.ws-advanced>summary{font-size:9px!important;color:#cdbb9b!important;padding:9px 2px 8px!important}
      #r7-assets-details .section-body{padding-top:4px}
      #r7-interact-card{display:none;border:1px solid #5a4d26;background:#0f0b06;padding:12px;margin:0 0 8px;color:#d8c18b}
      #r7-interact-card strong{display:block;font-size:11px;letter-spacing:.8px;margin-bottom:7px;color:#e7c85d}
      #r7-interact-card p{font-size:9px;line-height:1.5;margin:0 0 9px;color:#b8aa97}
      #r7-interact-card button{width:100%}
      #ws-content-body.r7-interact #r7-interact-card{display:block}
      #ws-content-body.r7-interact>#ue-core,#ws-content-body.r7-interact>#ws-content-host,#ws-content-body.r7-interact>#r7-assets-details,#ws-content-body.r7-interact>.ws-advanced{display:none!important}
      #ws-content-body.r7-edit #r7-interact-card{display:none}
      #ws-content-advanced details:has(.add-grid){display:none!important}
      @media(max-width:900px){#r7-controlbar{top:-12px}}
    `;
    document.head.appendChild(s);
  }

  function openContent({scroll=false}={}){
    const target=$('#ws-content');
    if(!target)return;
    $$('.ws-step').forEach(x=>{x.open=x===target;});
    if(scroll)target.scrollIntoView({block:'start',behavior:'smooth'});
  }

  function ensureBar(){
    const panel=$('#ui-panel');
    const mode=panel?.querySelector('.mode-toggle');
    if(!panel||!mode)return;
    let bar=$('#r7-controlbar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='r7-controlbar';
      bar.innerHTML='<div id="r7-mode-host"></div><div id="r7-meta"><div id="r7-status" class="warn">● CHECKING PROJECT</div><button id="r7-save" class="btn-solid">SAVE</button></div>';
      const health=$('#workspace-health');
      panel.insertBefore(bar,health||mode);
      $('#r7-save').onclick=()=>($('#ws-save')||$('#save-project'))?.click();
    }
    const host=$('#r7-mode-host');
    if(host&&mode.parentElement!==host)host.appendChild(mode);
    const edit=mode.querySelector('[data-mode="edit"]');
    const interact=mode.querySelector('[data-mode="interact"]');
    if(edit)edit.textContent='EDIT CONTENT';
    if(interact)interact.textContent='FABRIC / INTERACT';
  }

  function ensureInteractCard(body){
    let card=$('#r7-interact-card');
    if(card)return card;
    card=document.createElement('div');
    card.id='r7-interact-card';
    card.innerHTML='<strong>FABRIC / INTERACT ACTIVE</strong><p>Grab, stretch and deform the physical surface. Content editing is paused so the controls cannot be confused with fabric interaction.</p><button id="r7-switch-edit" class="btn-solid">SWITCH TO EDIT CONTENT</button>';
    body.prepend(card);
    $('#r7-switch-edit').onclick=()=>document.querySelector('.mode-btn[data-mode="edit"]')?.click();
    return card;
  }

  function ensureAssets(body){
    let assets=$('#r7-assets-details');
    if(assets)return assets;
    const core=$('#ws-media-core');
    const old=core?.querySelector('details');
    if(!old)return null;
    assets=old;
    assets.id='r7-assets-details';
    const sum=assets.querySelector(':scope > summary');
    if(sum)sum.textContent='ASSETS / MEDIA';
    assets.open=false;
    body.appendChild(assets);
    const storage=$('#ws-storage-status');
    const section=assets.querySelector(':scope > .section-body');
    if(storage&&section&&storage.parentElement!==section)section.insertBefore(storage,section.firstChild);
    return assets;
  }

  function ensureRestaurant(body){
    const restaurant=$('#restaurant-menu-controls-section');
    if(!restaurant)return null;
    const summary=restaurant.querySelector(':scope > summary');
    if(summary)summary.textContent='RESTAURANT CONTENT';
    const host=$('#ws-content-host');
    if(host&&restaurant.parentElement!==host)host.appendChild(restaurant);
    return restaurant;
  }

  function ensureAdvanced(body){
    const advanced=body.querySelector(':scope > details.ws-advanced');
    if(!advanced)return null;
    const summary=advanced.querySelector(':scope > summary');
    if(summary)summary.textContent='ADVANCED EDITING';
    const content=$('#ws-content-advanced');
    if(content){
      const add=content.querySelector('.add-grid')?.closest('details');
      if(add)add.style.display='none';
    }
    return advanced;
  }

  function organizeContent(){
    const body=$('#ws-content-body');
    const ue=$('#ue-core');
    if(!body||!ue)return;
    ensureInteractCard(body);
    const host=$('#ws-content-host');
    const restaurant=ensureRestaurant(body);
    const assets=ensureAssets(body);
    const advanced=ensureAdvanced(body);
    const title=ue.querySelector('.ue-title');if(title)title.textContent='CONTENT EDITOR';
    const help=ue.querySelector('.ue-help');if(help)help.textContent='EDIT CONTENT → click anything visible on the document. The same inspector handles text, image, video, logo and menu elements.';

    const card=$('#r7-interact-card');
    if(card.nextElementSibling!==ue)body.insertBefore(ue,card.nextSibling);
    if(host&&ue.nextElementSibling!==host)body.insertBefore(host,ue.nextSibling);
    if(assets&&host?.nextElementSibling!==assets)body.insertBefore(assets,host.nextSibling);
    if(advanced&&assets?.nextElementSibling!==advanced)body.insertBefore(advanced,assets.nextSibling);

    if(!initialCollapseDone){
      if(restaurant)restaurant.open=false;
      if(assets)assets.open=false;
      if(advanced)advanced.open=false;
    }
  }

  function syncStatus(){
    const out=$('#r7-status');if(!out)return;
    const source=$('#ue-save-state');
    const text=(source?.textContent||'').trim().toUpperCase();
    let cls='warn',label='● UNSAVED / CHECK';
    if(/MISSING|ERROR|FAILED/.test(text)){cls='bad';label='● '+(text||'PROJECT ERROR');}
    else if(/SAVED|READY/.test(text)&&!/UNSAVED/.test(text)){cls='ok';label='● SAVED';}
    else if(text){label='● '+text.replace(/^PROJECT\s*[·:-]?\s*/,'').slice(0,34);}
    out.className=cls;out.textContent=label;
  }

  function syncMode(){
    const body=$('#ws-content-body');if(!body||typeof state==='undefined')return;
    const edit=state.mode==='edit';
    body.classList.toggle('r7-edit',edit);
    body.classList.toggle('r7-interact',!edit);
    const editBtn=document.querySelector('.mode-btn[data-mode="edit"]');
    const intBtn=document.querySelector('.mode-btn[data-mode="interact"]');
    if(editBtn)editBtn.textContent='EDIT CONTENT';if(intBtn)intBtn.textContent='FABRIC / INTERACT';
    if(edit&&state.selectedId&&state.selectedId!==lastSelected){lastSelected=state.selectedId;openContent({scroll:true});}
    else if(state.selectedId!==lastSelected)lastSelected=state.selectedId;
  }

  function organize(){
    style();ensureBar();organizeContent();syncStatus();syncMode();
  }

  function schedule(ms=60){clearTimeout(timer);timer=setTimeout(organize,ms);}

  function boot(){
    organize();
    setTimeout(()=>{organize();initialCollapseDone=true;},2300);
    const panel=$('#ui-panel');
    if(panel){
      const mo=new MutationObserver(()=>schedule(80));
      mo.observe(panel,{childList:true,subtree:true});
    }
    document.addEventListener('click',()=>setTimeout(()=>{organize();syncStatus();syncMode();},70),true);
    document.addEventListener('pointerup',()=>setTimeout(()=>{syncMode();syncStatus();},40),true);
    document.addEventListener('change',()=>setTimeout(()=>{organize();syncStatus();},80),true);
    document.addEventListener('input',()=>setTimeout(syncStatus,100),true);
  }

  window.BanderolasSingleUIOwner=Object.freeze({version:VERSION,organize,openContent});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,1250),{once:true});else setTimeout(boot,1250);
})();
