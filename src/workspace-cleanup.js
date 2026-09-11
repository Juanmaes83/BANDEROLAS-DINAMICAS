'use strict';
(() => {
  const VERSION='5.4R';
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const deep=v=>JSON.parse(JSON.stringify(v));
  const PAGE_THUMBS=new Map();
  const PAPER_VARIANTS=['original','japanese','certificate','site-of-the-year'];
  const PAPER_VARIANT_LABELS={original:'Original',japanese:'Japanese',certificate:'Certificate','site-of-the-year':'Site of the Year'};
  const SIZE_OPTIONS=[
    ['standard','Portrait · Standard 9:16'],['tall','Portrait · Tall 9:24'],['long','Portrait · Long 9:32'],['extra','Portrait · Extra 9:40'],
    ['square','Square · 1:1'],['landscape','Landscape · 16:9'],['custom','Portrait · Custom height']
  ];
  let organized=false,renderQueued=false;

  const pagesApi=()=>window.BanderolasRestaurantPages||null;
  const extApi=()=>window.BanderolasExtendedRestaurantPage||null;
  const doc=()=>pagesApi()?.getDocument?.()||state.restaurantDocument||null;
  const page=(d=doc())=>d?.pages?.find(p=>p.id===d.activePageId)||d?.pages?.[0]||null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const summaryText=d=>d?.querySelector(':scope > summary')?.textContent?.trim()||'';
  const trigger=(el,type='change')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  const click=id=>$('#'+id)?.click();

  function css(){
    if($('#workspace-cleanup-style'))return;
    const s=document.createElement('style');s.id='workspace-cleanup-style';s.textContent=`
      #workspace-health{border:1px solid #332a25;background:#080504;padding:9px;margin:0 0 10px}
      .ws-health-row{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.ws-health-item{border:1px solid #2d2723;padding:6px 3px;text-align:center;font-size:8px;color:#8f8985;cursor:pointer;background:#050303}
      .ws-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:-1px;box-shadow:0 0 8px currentColor}.ws-red{color:#e35a5a}.ws-amber{color:#d8ab48}.ws-green{color:#70c98a}
      #workspace-health-message{font-size:9px;color:#b8aa97;margin-top:7px;line-height:1.4}.ws-step{border:1px solid #302925;padding:0 9px 7px;margin-bottom:8px;background:rgba(5,3,3,.38)}
      .ws-step>summary{font-size:11px;color:#eee;padding:10px 0}.ws-step>summary .ws-step-state{margin-left:auto;margin-right:8px;font-size:8px;font-weight:700;letter-spacing:.5px}
      .ws-step-body{padding:4px 0 2px}.ws-page-strip{display:flex;gap:7px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:thin}.ws-page-card{flex:0 0 102px;border:1px solid #332d29;background:#060403;padding:5px;cursor:pointer;color:#aaa}.ws-page-card.active{border-color:#d4af37;box-shadow:0 0 0 1px rgba(212,175,55,.18);color:#e8dcb9}.ws-page-card img,.ws-page-placeholder{width:90px;height:120px;object-fit:cover;display:block;background:linear-gradient(180deg,#21160f,#090604);border:1px solid #27211e}.ws-page-placeholder{display:flex;align-items:center;justify-content:center;font:800 18px Georgia;color:#6c5b42}.ws-page-title{font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:5px}.ws-page-meta{font-size:7px;color:#746b65;margin-top:2px}
      .ws-toolbar{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px}.ws-toolbar.two{grid-template-columns:repeat(2,1fr)}.ws-divider{height:1px;background:#2d2723;margin:9px 0}.ws-advanced{margin-top:8px;border-top:1px dashed #302925;padding-top:4px}.ws-advanced>summary{font-size:9px;color:#8f8985}.ws-simple-status{margin-top:7px}.ws-hidden-legacy{display:none!important}
      .ws-paper-only,.ws-classic-only{display:none}.ws-surface-paper .ws-paper-only{display:block}.ws-surface-classic .ws-classic-only{display:block}.ws-surface-alert{margin-top:7px}
      #ws-content-host>details,#ws-design-advanced>details,#ws-content-advanced>details,#ws-surface-advanced>details,#ws-output-advanced>details{margin:6px 0;border:1px solid #28221f;padding:0 7px;background:#070403}
      #ws-content-host>details>summary,#ws-design-advanced>details>summary,#ws-content-advanced>details>summary,#ws-surface-advanced>details>summary,#ws-output-advanced>details>summary{font-size:9px}
    `;document.head.appendChild(s);
  }

  function workspaceShell(){
    const panel=$('#ui-panel');if(!panel||$('#workspace-health'))return;
    const mode=panel.querySelector('.mode-toggle');
    const health=document.createElement('div');health.id='workspace-health';health.innerHTML=`<div class="ws-health-row">${['document','content','design','surface','output'].map((k,i)=>`<button class="ws-health-item" data-ws-open="${k}"><span class="ws-dot ws-red"></span>${i+1} ${k.toUpperCase()}</button>`).join('')}</div><div id="workspace-health-message">GUIDE · checking workspace…</div>`;
    mode?.insertAdjacentElement('afterend',health);
    const defs=[['document','1 · DOCUMENT'],['content','2 · CONTENT'],['design','3 · DESIGN'],['surface','4 · SURFACE'],['output','5 · OUTPUT']];
    let anchor=health;
    for(const [id,label] of defs){
      const d=document.createElement('details');d.id='ws-'+id;d.className='ws-step';d.open=id==='document';d.innerHTML=`<summary><span>${label}</span><span class="ws-step-state ws-red" id="ws-${id}-state">CHECK</span></summary><div class="ws-step-body" id="ws-${id}-body"></div>`;anchor.insertAdjacentElement('afterend',d);anchor=d;
      d.addEventListener('toggle',()=>{if(d.open)$$('.ws-step').forEach(x=>{if(x!==d)x.open=false;});});
    }
    $$('[data-ws-open]').forEach(b=>b.onclick=()=>{const d=$('#ws-'+b.dataset.wsOpen);if(d){d.open=true;d.scrollIntoView({block:'nearest'});}});
  }

  function ensureHosts(){
    const content=$('#ws-content-body'),design=$('#ws-design-body'),surface=$('#ws-surface-body'),output=$('#ws-output-body');if(!content||!design||!surface||!output)return;
    if(!$('#ws-content-host'))content.innerHTML=`<div id="ws-content-start" class="status" style="margin-bottom:8px"></div><button id="ws-apply-restaurant" class="btn-solid" style="display:none;margin-bottom:8px">Load Premium Restaurant Menu</button><div id="ws-content-host"></div><details class="ws-advanced"><summary>Advanced editing</summary><div id="ws-content-advanced"></div></details>`;
    if(!$('#ws-design-core'))design.innerHTML=`<div id="ws-design-core"><div class="form-group"><label>Visual style</label><select id="ws-style" class="form-control"><option value="dark">Dark Fine Dining</option><option value="ivory">Elegant Ivory</option><option value="mediterranean">Mediterranean Premium</option></select></div><button id="ws-refresh-brand" class="mini-btn" style="width:100%">Refresh logo + editorial plate</button><div id="ws-design-status" class="status ws-simple-status"></div></div><details class="ws-advanced"><summary>Brand & templates · Advanced</summary><div id="ws-design-advanced"></div></details>`;
    if(!$('#ws-surface-core'))surface.innerHTML=`<div id="ws-surface-core"><div class="form-group"><label>Engine</label><select id="ws-engine" class="form-control"><option value="classic">Classic Fabric / Verlet</option><option value="paper3d">3D Paper</option></select></div><div class="ws-classic-only"><div class="form-group"><label>Fabric preset</label><select id="ws-fabric" class="form-control"><option value="banner">Banner</option><option value="flag">Flag</option><option value="silk">Silk</option><option value="canvas">Canvas</option><option value="paper">Paper</option><option value="soft">Soft Fabric</option></select></div><div class="range-line"><label>Grip</label><input id="ws-grip" type="range" min="40" max="140" step="1"><div id="ws-grip-v" class="range-val"></div></div><button id="ws-reset-fabric" class="mini-btn" style="width:100%">Reset Fabric</button></div><div class="ws-paper-only"><div class="form-group"><label>Variant</label><select id="ws-paper-variant" class="form-control">${PAPER_VARIANTS.map(v=>`<option value="${v}">${PAPER_VARIANT_LABELS[v]}</option>`).join('')}</select></div><div class="form-group"><label>Content</label><select id="ws-paper-content" class="form-control"><option value="native-layout">Native Safe Layout · recommended</option><option value="native-content">Native + Content</option><option value="full-bleed">Full Bleed · replace artwork</option></select></div><div class="form-group"><label>Material</label><select id="ws-paper-material" class="form-control"></select></div><div class="form-group"><label>Motion</label><select id="ws-paper-motion" class="form-control"></select></div></div><div id="ws-surface-alert" class="status ws-surface-alert"></div></div><details class="ws-advanced"><summary>Surface controls · Advanced</summary><div id="ws-surface-advanced"></div></details>`;
    if(!$('#ws-output-core'))output.innerHTML=`<div id="ws-output-core"><div class="form-group"><label>Saved projects</label><select id="ws-project-select" class="form-control"></select></div><div class="ws-toolbar"><button id="ws-save" class="mini-btn">Save</button><button id="ws-open" class="mini-btn">Open</button><button id="ws-new" class="mini-btn">New</button></div><div class="ws-toolbar two"><button id="ws-undo" class="mini-btn">Undo</button><button id="ws-redo" class="mini-btn">Redo</button></div><div class="ws-toolbar two"><button id="ws-export-png" class="btn-solid">PNG</button><button id="ws-export-json" class="btn-outline">Project JSON</button></div><div id="ws-output-status" class="status ws-simple-status"></div></div><details class="ws-advanced"><summary>Production, delivery & export · Advanced</summary><div id="ws-output-advanced"></div></details>`;
  }

  function documentUI(){
    const body=$('#ws-document-body');if(!body||$('#ws-page-strip'))return;
    body.innerHTML=`<div class="micro-label">PAGES · CLICK A PAGE TO EDIT IT</div><div id="ws-page-strip" class="ws-page-strip"></div><div class="ws-toolbar"><button id="ws-page-new" class="mini-btn">+ New</button><button id="ws-page-duplicate" class="mini-btn">Duplicate</button><button id="ws-page-delete" class="mini-btn danger">Delete</button></div><div class="grid2"><div class="form-group"><label>Page name</label><input id="ws-page-name" class="form-control"></div><div class="form-group"><label>Size</label><select id="ws-page-size" class="form-control">${SIZE_OPTIONS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div></div><div id="ws-custom-row" class="form-group" style="display:none"><label>Custom height · px</label><div class="grid2"><input id="ws-custom-height" class="form-control" type="number" min="1920" max="4800" step="40" value="3200"><button id="ws-apply-custom" class="mini-btn">Apply</button></div></div><div class="grid2"><div class="form-group"><label>Layout</label><select id="ws-layout" class="form-control"></select></div><div class="form-group"><label>Order</label><div class="grid2"><button id="ws-page-left" class="mini-btn">← Move</button><button id="ws-page-right" class="mini-btn">Move →</button></div></div></div><div id="ws-document-status" class="status"></div>`;
  }

  function captureThumb(id=page()?.id){
    try{
      if(!id||typeof texCanvas==='undefined'||!texCanvas.width||!texCanvas.height)return;
      if(typeof updateTexture==='function')updateTexture();
      const w=120,h=Math.max(90,Math.min(180,Math.round(w*texCanvas.height/texCanvas.width)));const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(texCanvas,0,0,w,h);PAGE_THUMBS.set(id,c.toDataURL('image/jpeg',.58));
    }catch{}
  }
  function dims(p=page()){
    if(!p)return {w:1080,h:1920};
    try{const d=extApi()?.dimsFor?.(p);if(d)return {w:d.w||d.width||1080,h:d.h||d.height||1920};}catch{}
    const f=typeof fmtMap!=='undefined'?fmtMap[p.format]:null;return {w:f?.w||1080,h:f?.h||1920};
  }
  function sizeValue(p=page()){
    if(!p)return 'standard';const d=dims(p);
    if(p.format==='1:1')return 'square';if(p.format==='16:9')return 'landscape';
    if(p.format==='9:24'||d.h===2880)return 'tall';if(p.format==='9:32'||d.h===3840)return 'long';if(p.format==='9:40'||d.h===4800)return 'extra';if(p.format==='9:custom')return 'custom';return 'standard';
  }
  function renderFilmstrip(){
    const strip=$('#ws-page-strip'),d=doc();if(!strip)return;
    if(!d?.pages?.length){strip.innerHTML='<div class="status warn">No pages yet.</div>';return;}
    strip.innerHTML=d.pages.map((p,i)=>{const th=PAGE_THUMBS.get(p.id),di=dims(p);return `<button class="ws-page-card ${p.id===d.activePageId?'active':''}" data-ws-page="${p.id}">${th?`<img src="${th}" alt="">`:`<span class="ws-page-placeholder">${String(i+1).padStart(2,'0')}</span>`}<div class="ws-page-title">${i+1}. ${esc(p.name)}</div><div class="ws-page-meta">${di.w}×${di.h}</div></button>`;}).join('');
    $$('[data-ws-page]').forEach(b=>b.onclick=()=>switchPage(b.dataset.wsPage));
  }

  async function switchPage(id){
    const d=doc(),current=page(d);if(!d||!id||id===d.activePageId)return;
    captureThumb(current?.id);await pagesApi()?.activatePage?.(id);await wait(100);captureThumb(id);scheduleRender();
  }
  async function duplicatePage(){
    const d=doc(),source=page(d);if(!d||!source)return;captureThumb(source.id);const th=PAGE_THUMBS.get(source.id);await pagesApi()?.addPage?.('full');await wait(120);const now=page();if(now&&th)PAGE_THUMBS.set(now.id,th);scheduleRender();
  }
  async function newPage(){const source=page();captureThumb(source?.id);await pagesApi()?.addPage?.('layout');await wait(120);scheduleRender();}
  async function deletePage(){await pagesApi()?.deletePage?.();await wait(100);scheduleRender();}
  function renamePage(v){const hidden=$('#restaurant-page-name');if(hidden){hidden.value=v;trigger(hidden,'change');}else{const p=page();if(p)p.name=String(v||'Page').trim()||'Page';}scheduleRender();}
  async function hiddenFormat(format){const s=$('#restaurant-page-format');if(!s)return false;s.value=format;trigger(s,'change');await wait(180);return page()?.format===format;}
  async function applySize(v){
    const p=page();if(!p)return;
    if(v==='square'){await hiddenFormat('1:1');}
    else if(v==='landscape'){await hiddenFormat('16:9');}
    else if(v==='standard'){
      if(String(p.format).startsWith('9:')&&p.format!=='9:16')await extApi()?.applyHeight?.('standard');else await hiddenFormat('9:16');
    }else if(['tall','long','extra','custom'].includes(v)){
      if(p.format!=='9:16'&&!String(p.format).match(/^9:(24|32|40|custom)$/))await hiddenFormat('9:16');
      if(v!=='custom')await extApi()?.applyHeight?.(v);
    }
    await wait(120);captureThumb(page()?.id);scheduleRender();
  }
  async function applyCustom(){const h=Math.max(1920,Math.min(4800,Number($('#ws-custom-height')?.value)||3200));const p=page();if(p&&p.format!=='9:16'&&!String(p.format).startsWith('9:'))await hiddenFormat('9:16');await extApi()?.applyHeight?.('custom',h);await wait(120);captureThumb(page()?.id);scheduleRender();}

  function syncDocument(){
    const d=doc(),p=page(d);renderFilmstrip();
    const name=$('#ws-page-name'),size=$('#ws-page-size'),custom=$('#ws-custom-row'),customInput=$('#ws-custom-height'),layout=$('#ws-layout');
    if(name)name.value=p?.name||'';const sv=sizeValue(p);if(size)size.value=sv;if(custom)custom.style.display=sv==='custom'?'block':'none';if(customInput&&p)customInput.value=dims(p).h;
    const oldLayout=$('#layout-select');if(layout&&oldLayout){layout.innerHTML=oldLayout.innerHTML;layout.value=state.layout||oldLayout.value;}
    const status=$('#ws-document-status');if(status){const di=dims(p);status.className='status '+(p?'ok':'warn');status.textContent=p?`${d.pages.length} page${d.pages.length===1?'':'s'} · active ${di.w}×${di.h} · one physical surface at a time`:'Apply the Restaurant Menu preset to create the document.';}
  }

  function syncContent(){
    const active=!!state.restaurantMenu&&!!state.elements?.find(e=>e.role==='menu-backdrop');const st=$('#ws-content-start'),btn=$('#ws-apply-restaurant');if(st){st.className='status '+(active?'ok':'warn');st.textContent=active?'Restaurant Menu active · edit identity, hero, dishes, prices and reservations below.':'Restaurant document not active yet.';}if(btn)btn.style.display=active?'none':'block';
  }
  function syncDesign(){
    const src=$('#rm-style'),ws=$('#ws-style');if(ws)ws.value=src?.value||state.restaurantMenu?.style||'dark';const logo=state.elements?.find(e=>e.role==='logo'),bg=state.elements?.find(e=>e.role==='menu-backdrop'),s=$('#ws-design-status');if(s){const ok=!!logo?.assetId&&!!bg?.assetId;s.className='status '+(ok?'ok':'warn');s.textContent=ok?'Brand assets ready · visual style linked across pages.':'Add/refresh logo and editorial plate to complete the visual system.';}
  }
  function fillSelectFrom(targetId,sourceId,fallback){const t=$('#'+targetId),s=$('#'+sourceId);if(!t)return;if(s&&s.options.length)t.innerHTML=[...s.options].map(o=>`<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('');else if(fallback)t.innerHTML=fallback.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');if(s)t.value=s.value;}
  function syncSurface(){
    const engine=state.surface?.engine||'classic',core=$('#ws-surface-core');core?.classList.toggle('ws-surface-paper',engine==='paper3d');core?.classList.toggle('ws-surface-classic',engine!=='paper3d');const e=$('#ws-engine');if(e)e.value=engine;
    const f=$('#fabric-preset'),wf=$('#ws-fabric');if(wf&&f)wf.value=f.value;const grip=$('#p8-grip'),wg=$('#ws-grip'),wgv=$('#ws-grip-v');if(wg)wg.value=grip?.value||state.surface?.interaction?.gripRadius||80;if(wgv)wgv.textContent=(wg?.value||80)+'px';
    const pv=$('#ws-paper-variant');if(pv)pv.value=PAPER_VARIANTS.includes(state.surface?.variant)?state.surface.variant:'original';const pc=$('#paper-content-mode'),wpc=$('#ws-paper-content');if(wpc)wpc.value=pc?.value||state.surface?.content?.mode||'native-layout';fillSelectFrom('ws-paper-material','paper-material-preset',[['native','Native / EXACT ThreeUI']]);fillSelectFrom('ws-paper-motion','paper-motion-preset',[['native','Native ThreeUI']]);
    const alert=$('#ws-surface-alert');if(alert){const valid=engine==='classic'||(engine==='paper3d'&&PAPER_VARIANTS.includes(state.surface?.variant));const managerOk=!window.surfaceManager?.activeId||window.surfaceManager.activeId===engine;alert.className='status ws-surface-alert '+(valid&&managerOk?'ok':'warn');alert.textContent=valid&&managerOk?(engine==='paper3d'?`Paper ready · ${PAPER_VARIANT_LABELS[state.surface.variant]} · Variant live`:'Classic ready · grab / stretch / release available'):`Surface mismatch · engine=${engine} · active=${window.surfaceManager?.activeId||'unknown'} · check Variant/engine.`;}
  }
  function syncOutput(){
    const source=$('#project-select'),ws=$('#ws-project-select');if(ws&&source){ws.innerHTML=source.innerHTML;ws.value=source.value;}let saved=false;try{saved=JSON.parse(localStorage.getItem('banderolas-pro-projects-v2')||'[]').some(p=>p.id===state.projectId);}catch{}const s=$('#ws-output-status');if(s){s.className='status '+(saved?'ok':'warn');s.textContent=saved?'Project saved locally · ready for export.':'Unsaved changes/project · save before final delivery.';}
  }

  function health(){
    const d=doc(),p=page(d),menu=state.restaurantMenu,logo=state.elements?.find(e=>e.role==='logo'),bg=state.elements?.find(e=>e.role==='menu-backdrop'),hero=state.elements?.find(e=>e.role==='hero');
    const enabled=(menu?.sections||[]).filter(s=>s.enabled!==false&&s.dishes?.length);const documentState=d?.pages?.length&&p?'green':'red';const contentState=!menu?'red':(menu.restaurant?.name&&hero?.assetId&&enabled.length>=2?'green':'amber');const designState=!menu?.style?'red':(logo?.assetId&&bg?.assetId?'green':'amber');const eng=state.surface?.engine,surfaceState=!eng?'red':(eng==='paper3d'&&!PAPER_VARIANTS.includes(state.surface?.variant)?'red':'green');let saved=false;try{saved=JSON.parse(localStorage.getItem('banderolas-pro-projects-v2')||'[]').some(x=>x.id===state.projectId);}catch{}const outputState=saved?'green':'amber';
    const states={document:documentState,content:contentState,design:designState,surface:surfaceState,output:outputState};
    for(const [k,v] of Object.entries(states)){const top=$(`[data-ws-open="${k}"]`),dot=top?.querySelector('.ws-dot'),label=$('#ws-'+k+'-state');if(dot)dot.className='ws-dot ws-'+v;if(label){label.className='ws-step-state ws-'+v;label.textContent=v==='green'?'READY':v==='amber'?'CHECK':'FIX';}}
    const ready=Object.values(states).filter(x=>x==='green').length,first=Object.entries(states).find(([,v])=>v!=='green');const msg=$('#workspace-health-message');if(msg)msg.textContent=ready===5?'GUIDE · 5/5 GREEN · document ready for final review/export.':`GUIDE · ${ready}/5 GREEN · next: ${first?.[0]?.toUpperCase()||'REVIEW'} · ${first?.[1]==='red'?'needs attention':'check before delivery'}.`;
    return states;
  }

  function scheduleRender(ms=40){if(renderQueued)return;renderQueued=true;setTimeout(()=>{renderQueued=false;syncAll();},ms);}
  function syncAll(){if(!organized)return;syncDocument();syncContent();syncDesign();syncSurface();syncOutput();health();}

  function bind(){
    $('#ws-page-duplicate').onclick=duplicatePage;$('#ws-page-new').onclick=newPage;$('#ws-page-delete').onclick=deletePage;$('#ws-page-left').onclick=()=>{pagesApi()?.movePage?.(-1);scheduleRender();};$('#ws-page-right').onclick=()=>{pagesApi()?.movePage?.(1);scheduleRender();};$('#ws-page-name').onchange=e=>renamePage(e.target.value);$('#ws-page-size').onchange=e=>{const v=e.target.value;$('#ws-custom-row').style.display=v==='custom'?'block':'none';if(v!=='custom')applySize(v);};$('#ws-apply-custom').onclick=applyCustom;$('#ws-layout').onchange=e=>{const old=$('#layout-select');if(old){old.value=e.target.value;click('apply-layout');}scheduleRender();};
    $('#ws-apply-restaurant').onclick=()=>click('apply-restaurant-menu-premium');$('#ws-style').onchange=e=>{const old=$('#rm-style');if(old){old.value=e.target.value;trigger(old,'change');}scheduleRender(160);};$('#ws-refresh-brand').onclick=()=>{click('rm-refresh-brand');scheduleRender(500);};
    $('#ws-engine').onchange=e=>{const old=$('#surface-engine');if(old){old.value=e.target.value;trigger(old,'change');}scheduleRender(100);};$('#ws-fabric').onchange=e=>{const old=$('#fabric-preset');if(old){old.value=e.target.value;trigger(old,'change');}scheduleRender();};$('#ws-grip').oninput=e=>{const old=$('#p8-grip');if(old){old.value=e.target.value;trigger(old,'input');}$('#ws-grip-v').textContent=e.target.value+'px';};$('#ws-reset-fabric').onclick=()=>click('reset-cloth');
    $('#ws-paper-variant').onchange=e=>{window.BanderolasPaperStudio?.changeVariant?.(e.target.value);setTimeout(()=>{window.BanderolasPaperNativeFidelity?.syncUI?.();syncSurface();health();},80);};$('#ws-paper-content').onchange=e=>{const old=$('#paper-content-mode');if(old){old.value=e.target.value;trigger(old,'change');}scheduleRender(100);};$('#ws-paper-material').onchange=e=>{const old=$('#paper-material-preset');if(old){old.value=e.target.value;trigger(old,'change');}scheduleRender(100);};$('#ws-paper-motion').onchange=e=>{const old=$('#paper-motion-preset');if(old){old.value=e.target.value;trigger(old,'change');}scheduleRender(100);};
    $('#ws-project-select').onchange=e=>{const old=$('#project-select');if(old)old.value=e.target.value;};$('#ws-save').onclick=()=>{click('save-project');scheduleRender(100);};$('#ws-open').onclick=()=>{click('open-project');scheduleRender(350);};$('#ws-new').onclick=()=>{click('new-project');scheduleRender(250);};$('#ws-undo').onclick=()=>{click('undo');scheduleRender(250);};$('#ws-redo').onclick=()=>{click('redo');scheduleRender(250);};$('#ws-export-png').onclick=()=>click('export-png');$('#ws-export-json').onclick=()=>click('export-json');
    document.addEventListener('click',()=>scheduleRender(80),true);document.addEventListener('change',()=>scheduleRender(80),true);document.addEventListener('input',e=>{if(e.target?.closest?.('#ui-panel'))scheduleRender(120);},true);
  }

  function moveDetail(detail,target){if(detail&&target&&detail.parentElement!==target)target.appendChild(detail);}
  function organizeLegacy(){
    const panel=$('#ui-panel'),contentHost=$('#ws-content-host'),contentAdv=$('#ws-content-advanced'),designAdv=$('#ws-design-advanced'),surfaceAdv=$('#ws-surface-advanced'),outputAdv=$('#ws-output-advanced');if(!panel)return;
    const restaurant=$('#restaurant-menu-controls-section');if(restaurant){moveDetail(restaurant,contentHost);restaurant.open=true;const sum=restaurant.querySelector(':scope > summary');if(sum)sum.textContent='Restaurant content & dishes';}
    const premium=$('#restaurant-menu-premium-section');if(premium)premium.classList.add('ws-hidden-legacy');const pages=$('#restaurant-menu-pages-section');if(pages)pages.classList.add('ws-hidden-legacy');
    const legacy=[...panel.children].filter(x=>x.tagName==='DETAILS'&&!x.classList.contains('ws-step'));
    for(const d of legacy){const t=summaryText(d).toLowerCase();if(t.includes('format & layout')){d.classList.add('ws-hidden-legacy');continue;}if(t.includes('add')||t.includes('layers')||t.includes('selected element'))moveDetail(d,contentAdv);else if(t.includes('brand')||t.includes('template')||t.includes('background'))moveDetail(d,designAdv);else if(t.includes('surface')||t.includes('fabric')||t.includes('interaction'))moveDetail(d,surfaceAdv);else moveDetail(d,outputAdv);}
    const legacyVariant=$('#surface-variant')?.closest('.form-group'),legacyEngine=$('#surface-engine')?.closest('.form-group');if(legacyVariant)legacyVariant.style.display='none';if(legacyEngine)legacyEngine.style.display='none';
  }

  function boot(){
    css();workspaceShell();ensureHosts();documentUI();organizeLegacy();bind();organized=true;captureThumb();syncAll();setTimeout(()=>{organizeLegacy();syncAll();},600);setTimeout(()=>{organizeLegacy();syncAll();},1800);
    const panel=$('#ui-panel');if(panel){const mo=new MutationObserver(()=>{clearTimeout(boot._m);boot._m=setTimeout(()=>{organizeLegacy();syncAll();},120);});mo.observe(panel,{childList:true,subtree:false});}
  }

  window.BanderolasWorkspace=Object.freeze({version:VERSION,sync:syncAll,health,captureThumbnail:captureThumb});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,220),{once:true});else setTimeout(boot,220);
})();