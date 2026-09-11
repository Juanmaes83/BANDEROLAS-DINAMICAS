'use strict';
(() => {
  const VERSION='5.4R6';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  let lastSelected=null;
  let organizeTimer=null;

  function injectStyle(){
    if($('#ws-r6-style'))return;
    const s=document.createElement('style');
    s.id='ws-r6-style';
    s.textContent=`
      #ws-sticky-controlbar{position:sticky;top:-18px;z-index:250;background:linear-gradient(180deg,#1b100b 0%,#130a07 86%,rgba(19,10,7,.96) 100%);padding:10px 0 8px;margin:-2px 0 8px;border-bottom:1px solid #3a3029;box-shadow:0 8px 16px rgba(0,0,0,.28)}
      #ws-sticky-controlbar .mode-toggle{position:static!important;top:auto!important;margin:0 0 6px!important;padding:0!important;background:transparent!important;z-index:auto!important;grid-template-columns:1fr 1fr!important}
      #ws-sticky-controlbar .mode-btn{min-height:34px;font-size:9px;letter-spacing:.7px}
      #ws-sticky-meta{display:grid;grid-template-columns:1fr 82px;gap:6px;align-items:center}
      #ws-sticky-status{border:1px solid #332b26;background:#070403;padding:6px 8px;font-size:8px;letter-spacing:.45px;color:#d8ab48;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #ws-sticky-status.ok{color:#70c98a;border-color:#315339}#ws-sticky-status.bad{color:#e35a5a;border-color:#6b3131}#ws-sticky-status.warn{color:#d8ab48;border-color:#5a4d26}
      #ws-sticky-save{padding:7px 5px!important}
      #ue-save-row{display:none!important}
      #ws-media-core{display:none!important}
      #ws-page-media{display:none!important}
      #restaurant-menu-premium-section{display:none!important}
      #ws-content-host{display:none!important}
      #ws-content-start{display:none!important}
      #ue-core{margin:0 0 8px!important;border-color:#4a3a24!important}
      #ue-core .ue-title{font-size:11px!important}
      #ue-core .ue-help{margin-top:3px}
      #restaurant-menu-controls-section,#ue-assets-details{margin:7px 0!important;border:1px solid #2d2723!important;background:#070403!important;padding:0 7px 7px!important}
      #restaurant-menu-controls-section>summary,#ue-assets-details>summary{font-size:9px!important;color:#cdbb9b!important;padding:9px 2px 8px!important}
      #ue-assets-details .section-body{padding-top:4px}
      #ws-content-body>.ws-advanced{margin-top:7px!important}
      #workspace-health{margin-top:0!important}
      #workspace-health-message{font-size:8px!important;margin-top:5px!important}
      .ws-health-item{padding:5px 2px!important;font-size:7px!important}
      @media(max-width:900px){#ws-sticky-controlbar{top:-12px}}
    `;
    document.head.appendChild(s);
  }

  function openContent(){
    const target=$('#ws-content');
    if(!target)return;
    $$('.ws-step').forEach(x=>{x.open=x===target;});
  }

  function ensureStickyBar(){
    const panel=$('#ui-panel');
    const mode=panel?.querySelector('.mode-toggle');
    if(!panel||!mode)return;
    let bar=$('#ws-sticky-controlbar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='ws-sticky-controlbar';
      bar.innerHTML='<div id="ws-sticky-mode-host"></div><div id="ws-sticky-meta"><div id="ws-sticky-status" class="warn">● CHECKING PROJECT</div><button id="ws-sticky-save" class="btn-solid">SAVE</button></div>';
      const health=$('#workspace-health');
      panel.insertBefore(bar,health||mode);
      $('#ws-sticky-save').onclick=()=>($('#ws-save')||$('#save-project'))?.click();
    }
    const host=$('#ws-sticky-mode-host');
    if(host&&mode.parentElement!==host)host.appendChild(mode);
    const edit=mode.querySelector('[data-mode="edit"]');
    const interact=mode.querySelector('[data-mode="interact"]');
    if(edit){edit.textContent='EDIT CONTENT';if(edit.dataset.r6!=='1'){edit.dataset.r6='1';edit.addEventListener('click',()=>setTimeout(()=>{openContent();syncStickyStatus();},0));}}
    if(interact)interact.textContent='FABRIC / INTERACT';
  }

  function mediaDetails(){
    const existing=$('#ue-assets-details');
    if(existing)return existing;
    const core=$('#ws-media-core');
    const d=core?.querySelector('details');
    if(!d)return null;
    d.id='ue-assets-details';
    const summary=d.querySelector(':scope > summary');
    if(summary)summary.textContent='ASSETS / MEDIA';
    d.open=false;
    return d;
  }

  function organizeContent(){
    const body=$('#ws-content-body');
    const ue=$('#ue-core');
    if(!body||!ue)return;
    const first=body.firstElementChild;
    if(first!==ue)body.insertBefore(ue,first);
    const title=ue.querySelector('.ue-title');if(title)title.textContent='CONTENT EDITOR';
    const help=ue.querySelector('.ue-help');if(help)help.textContent='Click any visible element on the document. One inspector handles text, images, video, logo and structural menu elements.';

    const restaurant=$('#restaurant-menu-controls-section');
    if(restaurant){
      const summary=restaurant.querySelector(':scope > summary');if(summary)summary.textContent='RESTAURANT CONTENT';
      restaurant.open=false;
      if(restaurant.parentElement!==body)body.appendChild(restaurant);
    }

    const assets=mediaDetails();
    if(assets&&assets.parentElement!==body)body.appendChild(assets);

    const advanced=body.querySelector(':scope > details.ws-advanced');
    if(advanced)body.appendChild(advanced);

    const host=$('#ws-content-host');if(host)host.setAttribute('aria-hidden','true');
    const legacyMedia=$('#ws-media-core');if(legacyMedia)legacyMedia.setAttribute('aria-hidden','true');
    const pageMedia=$('#ws-page-media');if(pageMedia)pageMedia.setAttribute('aria-hidden','true');
  }

  function syncStickyStatus(){
    const out=$('#ws-sticky-status');if(!out)return;
    const source=$('#ue-save-state');
    const text=(source?.textContent||'').trim().toUpperCase();
    let cls='warn',label='● UNSAVED / CHECK';
    if(/MISSING|ERROR|FAILED/.test(text)){cls='bad';label='● '+(text||'PROJECT ERROR');}
    else if(/SAVED|READY/.test(text)&&!/UNSAVED/.test(text)){cls='ok';label='● SAVED';}
    else if(text){label='● '+text.replace(/^PROJECT\s*[·:-]?\s*/,'').slice(0,34);}
    out.className=cls;out.textContent=label;
  }

  function syncModeState(){
    const edit=document.querySelector('.mode-btn[data-mode="edit"]');
    const interact=document.querySelector('.mode-btn[data-mode="interact"]');
    if(edit)edit.textContent='EDIT CONTENT';if(interact)interact.textContent='FABRIC / INTERACT';
    if(typeof state!=='undefined'&&state.mode==='edit'&&state.selectedId&&state.selectedId!==lastSelected){lastSelected=state.selectedId;openContent();}
    if(typeof state!=='undefined'&&state.selectedId!==lastSelected)lastSelected=state.selectedId;
  }

  function organize(){
    injectStyle();ensureStickyBar();organizeContent();syncStickyStatus();syncModeState();
  }
  function schedule(){clearTimeout(organizeTimer);organizeTimer=setTimeout(organize,60);}

  function boot(){
    organize();
    const panel=$('#ui-panel');
    if(panel){const mo=new MutationObserver(schedule);mo.observe(panel,{childList:true,subtree:true});}
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('#ws-sticky-save,.mode-btn,[data-ue-select-role],[data-ue-action]'))setTimeout(()=>{organize();syncStickyStatus();},80);
    },true);
    document.addEventListener('change',()=>setTimeout(syncStickyStatus,80),true);
    document.addEventListener('input',()=>setTimeout(syncStickyStatus,80),true);
    setInterval(()=>{syncStickyStatus();syncModeState();},700);
  }

  window.BanderolasSingleControlSurface=Object.freeze({version:VERSION,organize,openContent});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();
