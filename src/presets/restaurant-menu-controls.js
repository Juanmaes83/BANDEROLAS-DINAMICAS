'use strict';
(() => {
  const VERSION='5.2';
  const PANEL_ID='restaurant-menu-controls-section';
  const PRESET_ID='restaurant-menu-premium';
  const $=s=>document.querySelector(s);
  const deep=v=>JSON.parse(JSON.stringify(v));
  const uidSafe=p=>typeof uid==='function'?uid(p):`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const STYLES={
    dark:{label:'Dark Fine Dining',bg0:'#18130f',bg1:'#0c0907',bg2:'#050403',accent:'#c7a767',text:'#f0e7d6',muted:'#b7aa96',heroOverlay:'#050403',display:'Georgia',body:'Arial'},
    ivory:{label:'Elegant Ivory',bg0:'#f4efe6',bg1:'#e8dfd1',bg2:'#d9cdbb',accent:'#8d6a32',text:'#211b15',muted:'#756958',heroOverlay:'#efe6d8',display:'Georgia',body:'Arial'},
    mediterranean:{label:'Mediterranean Premium',bg0:'#f1ede3',bg1:'#dfe5df',bg2:'#cfdad4',accent:'#315c63',text:'#17363b',muted:'#687774',heroOverlay:'#17363b',display:'Georgia',body:'Trebuchet MS'}
  };
  const DEFAULT_MODEL={
    style:'dark',
    restaurant:{name:'LUME',claim:'COCINA DE PRODUCTO · FUEGO · TEMPORADA',location:'COSTA MEDITERRÁNEA',edition:'RESTAURANT MENU · AUTUMN 2026'},
    hero:{fit:'cover',opacity:1,zoom:1,overlay:.10},
    chef:{title:'NOTA DEL CHEF',body:'Cocinamos desde el producto y su estación. Brasas, fondos largos y acidez limpia para que cada ingrediente conserve su identidad.'},
    signatures:[
      {name:'GAMBA ROJA SALVAJE',desc:'arroz tostado · hierbas',price:'24 €'},
      {name:'ATÚN ROJO',desc:'naranja sanguina · aguacate',price:'26 €'},
      {name:'PRESA IBÉRICA',desc:'jugo de brasa · raíz',price:'31 €'}
    ],
    sections:[
      {key:'starters',role:'menu-starters',title:'ENTRANTES',enabled:true,dishes:[{name:'Ostra',desc:'pepino · manzana verde',price:'6 €'},{name:'Tomate antiguo',desc:'almendra · albahaca',price:'16 €'},{name:'Brioche',desc:'anchoa · limón',price:'14 €'}]},
      {key:'mains',role:'menu-mains',title:'PRINCIPALES',enabled:true,dishes:[{name:'Rodaballo',desc:'pilpil ahumado · hinojo',price:'32 €'},{name:'Presa ibérica',desc:'cebolla quemada · romero',price:'31 €'},{name:'Arroz meloso de gamba roja',desc:'azafrán',price:'29 €'}]},
      {key:'desserts',role:'menu-desserts',title:'POSTRES',enabled:true,dishes:[{name:'Chocolate 72%',desc:'AOVE · sal marina',price:'12 €'},{name:'Milhojas',desc:'vainilla · cítricos',price:'11 €'}]},
      {key:'drinks',role:'menu-drinks',title:'BODEGA · CÓCTELES',enabled:true,dishes:[{name:'Copa selección del sumiller',desc:'',price:'9 €'},{name:'LUME Negroni',desc:'naranja tostada',price:'14 €'}]}
    ],
    reservations:{phone:'+34 900 000 000',web:'lume.restaurant',instagram:'@lume.restaurant',address:'Costa Mediterránea'}
  };

  let bound=false;
  const role=r=>typeof state!=='undefined'?state.elements?.find(e=>e.role===r):null;
  const mark=()=>{if(typeof state!=='undefined')state.needsTextureUpdate=true;if(typeof renderLayers==='function')renderLayers();};
  const selectRole=r=>{const el=role(r);if(el&&typeof setSelected==='function')setSelected(el.id);};
  const setText=(r,value)=>{const el=role(r);if(!el)return;el.text=String(value??'');mark();};

  function ensureModel(){
    if(typeof state==='undefined')return deep(DEFAULT_MODEL);
    if(!state.restaurantMenu||state.restaurantMenu.version!==VERSION){state.restaurantMenu={...deep(DEFAULT_MODEL),version:VERSION};}
    return state.restaurantMenu;
  }

  function formatDish(d){
    const left=[d.name,d.desc].filter(Boolean).join(' · ');
    const dots='.'.repeat(Math.max(8,52-Math.min(40,left.length)));
    return `${left} ${dots} ${d.price||''}`.trim();
  }
  function renderSignatures(model){setText('menu-signature',model.signatures.map(formatDish).join('\n'));}
  function renderSection(section){
    const el=role(section.role);if(!el)return;
    el.visible=section.enabled!==false;
    el.text=[section.title,...section.dishes.map(formatDish)].join('\n');
    mark();
  }
  function renderReservations(model){
    const r=model.reservations;
    setText('cta',[`RESERVAS · ${r.web}`,r.phone,r.instagram,r.address].filter(Boolean).join('     '));
  }
  function renderIdentity(model){
    setText('menu-edition',model.restaurant.edition);
    setText('subheadline',model.restaurant.claim);
    setText('caption',`${model.restaurant.name} / MENÚ DEGUSTACIÓN · ${model.restaurant.location}`);
    if(typeof state!=='undefined'){
      state.projectName=`${model.restaurant.name} · Restaurant Menu Premium`;
      state.brand={...(state.brand||{}),name:model.restaurant.name};
      const p=$('#project-name');if(p)p.value=state.projectName;
      const b=$('#brand-name');if(b)b.value=model.restaurant.name;
    }
  }

  const toBlob=(c,type='image/png',q=.94)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Canvas export failed')),type,q));
  async function registerBlob(blob,type,name){
    const assetId=uidSafe(`restaurant-${type}`);
    const file=blob instanceof File?blob:new File([blob],name||`restaurant-${type}`,{type:blob.type||'application/octet-stream'});
    if(typeof putAsset==='function')await putAsset(assetId,file);
    if(typeof loadRuntimeAsset==='function')await loadRuntimeAsset(assetId,file,type==='video'?'video':'image');
    return assetId;
  }
  function hexA(hex,a){
    const h=hex.replace('#','');const v=h.length===3?h.split('').map(x=>x+x).join(''):h;const n=parseInt(v,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }
  async function makeBackdropBlob(style){
    const s=STYLES[style]||STYLES.dark,c=document.createElement('canvas');c.width=1080;c.height=1920;const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,s.bg0);bg.addColorStop(.48,s.bg1);bg.addColorStop(1,s.bg2);g.fillStyle=bg;g.fillRect(0,0,1080,1920);
    const glow=g.createRadialGradient(840,320,20,840,320,720);glow.addColorStop(0,hexA(s.accent,.16));glow.addColorStop(1,hexA(s.accent,0));g.fillStyle=glow;g.fillRect(0,0,1080,1920);
    g.strokeStyle=hexA(s.accent,.55);g.lineWidth=2;g.strokeRect(56,54,968,1812);g.strokeStyle=hexA(s.accent,.20);g.lineWidth=1;g.strokeRect(72,70,936,1780);
    g.fillStyle=hexA(s.text,.02);g.fillRect(78,255,924,420);g.strokeStyle=hexA(s.accent,.34);g.strokeRect(78,255,924,420);
    [738,1018,1300,1560,1740].forEach(y=>{g.beginPath();g.moveTo(82,y);g.lineTo(998,y);g.stroke();});
    return toBlob(c,'image/webp',.93);
  }
  async function makeLogoBlob(name,style){
    const s=STYLES[style]||STYLES.dark,c=document.createElement('canvas');c.width=900;c.height=250;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);
    g.strokeStyle=s.accent;g.lineWidth=8;g.beginPath();g.moveTo(42,125);g.lineTo(84,60);g.lineTo(126,125);g.lineTo(84,190);g.closePath();g.stroke();g.beginPath();g.moveTo(84,60);g.lineTo(84,190);g.moveTo(42,125);g.lineTo(126,125);g.stroke();
    g.fillStyle=s.text;g.font=`600 104px ${s.display}`;g.textBaseline='middle';g.fillText(String(name||'RESTAURANT').toUpperCase().slice(0,18),174,126);g.fillStyle=s.accent;g.fillRect(176,188,610,3);return toBlob(c);
  }
  async function replaceAsset(roleName,file){
    const el=role(roleName);if(!el||!file)return;
    if(typeof pushHistory==='function')pushHistory();
    const isVideo=file.type.startsWith('video/');
    const id=await registerBlob(file,isVideo?'video':'image',file.name);
    el.assetId=id;el.type=isVideo?'video':(el.type==='logo'?'logo':'image');el.name=file.name||el.name;el.loop=true;el.muted=true;mark();
    if(typeof renderProperties==='function'&&state.selectedId===el.id)renderProperties();
  }
  async function regenerateBrandAssets(model){
    const [backdrop,logo]=await Promise.all([makeBackdropBlob(model.style),makeLogoBlob(model.restaurant.name,model.style)]);
    const bgEl=role('menu-backdrop'),logoEl=role('logo');
    if(bgEl)bgEl.assetId=await registerBlob(backdrop,'image','restaurant-backdrop.webp');
    if(logoEl)logoEl.assetId=await registerBlob(logo,'image','restaurant-logo.png');
    mark();
  }
  async function ensureHeroOverlay(model){
    let el=role('hero-overlay');
    if(!el){
      const c=document.createElement('canvas');c.width=c.height=4;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,4,4);const assetId=await registerBlob(await toBlob(c),'image','hero-overlay.png');
      const hero=role('hero');if(!hero)return;
      el={id:uidSafe('image'),type:'image',name:'Hero Overlay',role:'hero-overlay',assetId,x:hero.x,y:hero.y,w:hero.w,h:hero.h,rotation:0,opacity:model.hero.overlay??.1,zIndex:(hero.zIndex||0)+1,visible:true,locked:false,aspectLock:false,fit:'fill',cropX:0,cropY:0,zoom:1};
      state.elements.push(el);state.elements.sort((a,b)=>(a.zIndex||0)-(b.zIndex||0)).forEach((x,i)=>x.zIndex=i);mark();
    }
    el.opacity=model.hero.overlay??.1;mark();
  }
  function applyStyleTokens(model){
    const s=STYLES[model.style]||STYLES.dark;
    const accent=new Set(['menu-edition','menu-chef-title','menu-signature-title','cta']);
    for(const el of state.elements||[]){
      if(el.type!=='text')continue;
      el.font=accent.has(el.role)?s.body:(el.role==='body'?s.display:s.body);
      el.color=accent.has(el.role)?s.accent:(el.role==='subheadline'?s.muted:s.text);
    }
    state.brand={...(state.brand||{}),primary:s.accent,secondary:s.text,font:s.display};
    const bp=$('#brand-primary'),bs=$('#brand-secondary'),bf=$('#brand-font');if(bp)bp.value=s.accent;if(bs)bs.value=s.text;if(bf)bf.value=s.display;
    mark();
  }
  async function applyAll(model,{assets=false}={}){
    renderIdentity(model);setText('menu-chef-title',model.chef.title);setText('body',model.chef.body);renderSignatures(model);model.sections.forEach(renderSection);renderReservations(model);
    const hero=role('hero');if(hero){hero.fit=model.hero.fit;hero.opacity=model.hero.opacity;hero.zoom=model.hero.zoom;}
    applyStyleTokens(model);await ensureHeroOverlay(model);if(assets)await regenerateBrandAssets(model);mark();
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function field(label,id,value,type='text'){return `<div class="form-group"><label>${label}</label><input id="${id}" class="form-control" type="${type}" value="${esc(value)}"></div>`;}
  function area(label,id,value,rows=3){return `<div class="form-group"><label>${label}</label><textarea id="${id}" class="form-control" rows="${rows}" style="resize:vertical">${esc(value)}</textarea></div>`;}
  function range(label,id,value,min,max,step){return `<div class="range-line"><label>${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><div class="range-val" id="${id}-v">${Number(value).toFixed(2)}</div></div>`;}
  function dishRow(section,si,d,di){return `<div class="restaurant-dish" data-section-index="${si}" data-dish-index="${di}" style="border:1px solid #2e2825;padding:7px;margin:0 0 7px"><div class="grid2">${field('Dish',`rm-dish-name-${si}-${di}`,d.name)}${field('Price',`rm-dish-price-${si}-${di}`,d.price)}</div>${field('Description',`rm-dish-desc-${si}-${di}`,d.desc)}<div class="grid3"><button class="mini-btn" data-dish-up="${si}:${di}">Up</button><button class="mini-btn" data-dish-down="${si}:${di}">Down</button><button class="mini-btn danger" data-dish-delete="${si}:${di}">Delete</button></div></div>`;}
  function sectionEditor(section,idx){return `<details class="restaurant-sub"><summary>${esc(section.title)}</summary><div class="section-body" data-section="${esc(section.key)}"><div class="grid2">${field('Section title',`rm-section-title-${idx}`,section.title)}<div class="form-group"><label>Visible</label><select id="rm-section-enabled-${idx}" class="form-control"><option value="1" ${section.enabled?'selected':''}>On</option><option value="0" ${!section.enabled?'selected':''}>Off</option></select></div></div><div id="rm-dishes-${idx}">${section.dishes.map((d,j)=>dishRow(section,idx,d,j)).join('')}</div><button class="mini-btn" data-add-dish="${idx}" style="width:100%">+ Add dish</button></div></details>`;}

  function renderPanel(){
    const panel=$(`#${PANEL_ID} .section-body`);if(!panel)return;const m=ensureModel();
    panel.innerHTML=`<div class="status ok" style="margin-bottom:9px">LIVE DOCUMENT CONTROLS · edits the same BANDEROLAS layers. Surface engines stay untouched.</div><div class="form-group"><label>Visual style</label><select id="rm-style" class="form-control">${Object.entries(STYLES).map(([k,v])=>`<option value="${k}" ${m.style===k?'selected':''}>${v.label}</option>`).join('')}</select></div><details open class="restaurant-sub"><summary>Identity</summary><div class="section-body">${field('Restaurant name','rm-name',m.restaurant.name)}${field('Claim','rm-claim',m.restaurant.claim)}<div class="grid2">${field('Location','rm-location',m.restaurant.location)}${field('Edition','rm-edition',m.restaurant.edition)}</div><button id="rm-refresh-brand" class="mini-btn" style="width:100%">Refresh logo + plate</button></div></details><details class="restaurant-sub"><summary>Hero</summary><div class="section-body"><div class="grid2"><div class="form-group"><label>Fit</label><select id="rm-hero-fit" class="form-control"><option value="cover" ${m.hero.fit==='cover'?'selected':''}>Cover</option><option value="contain" ${m.hero.fit==='contain'?'selected':''}>Contain</option><option value="fill" ${m.hero.fit==='fill'?'selected':''}>Fill</option></select></div><div class="form-group"><label>Replace media</label><button id="rm-hero-replace" class="mini-btn" style="width:100%">Image / Video</button></div></div>${range('Hero opacity','rm-hero-opacity',m.hero.opacity,0,1,.01)}${range('Hero zoom','rm-hero-zoom',m.hero.zoom,.5,2,.01)}${range('Overlay','rm-hero-overlay',m.hero.overlay,0,.75,.01)}<input id="rm-hero-file" class="file-hidden" type="file" accept="image/*,video/*"></div></details><details class="restaurant-sub"><summary>Chef Note</summary><div class="section-body">${field('Title','rm-chef-title',m.chef.title)}${area('Text','rm-chef-body',m.chef.body,4)}</div></details><details class="restaurant-sub"><summary>Signature Dishes</summary><div class="section-body">${m.signatures.map((d,i)=>`<div class="restaurant-dish" data-signature="${i}" style="border:1px solid #2e2825;padding:7px;margin-bottom:7px"><div class="grid2">${field('Dish',`rm-sign-name-${i}`,d.name)}${field('Price',`rm-sign-price-${i}`,d.price)}</div>${field('Description',`rm-sign-desc-${i}`,d.desc)}<button class="mini-btn" data-replace-signature="${i}" style="width:100%">Replace dish image</button><input id="rm-sign-file-${i}" class="file-hidden" type="file" accept="image/*"></div>`).join('')}</div></details><details class="restaurant-sub"><summary>Menu Sections</summary><div class="section-body">${m.sections.map(sectionEditor).join('')}</div></details><details class="restaurant-sub"><summary>Reservations</summary><div class="section-body"><div class="grid2">${field('Phone','rm-phone',m.reservations.phone)}${field('Web','rm-web',m.reservations.web)}</div><div class="grid2">${field('Instagram','rm-instagram',m.reservations.instagram)}${field('Address','rm-address',m.reservations.address)}</div></div></details><div class="grid2" style="margin-top:8px"><button id="rm-sync-layers" class="mini-btn">Sync from layers</button><button id="rm-reset" class="mini-btn danger">Reset controls</button></div>`;
    bindPanel();
  }

  function wire(id,event,fn){const el=$(`#${id}`);if(el)el.addEventListener(event,fn);}
  function bindPanel(){
    const m=ensureModel();
    wire('rm-style','change',async e=>{if(typeof pushHistory==='function')pushHistory();m.style=e.target.value;applyStyleTokens(m);await regenerateBrandAssets(m);renderPanel();});
    wire('rm-name','input',e=>{m.restaurant.name=e.target.value;renderIdentity(m);});
    wire('rm-claim','input',e=>{m.restaurant.claim=e.target.value;renderIdentity(m);});
    wire('rm-location','input',e=>{m.restaurant.location=e.target.value;renderIdentity(m);});
    wire('rm-edition','input',e=>{m.restaurant.edition=e.target.value;renderIdentity(m);});
    wire('rm-refresh-brand','click',async()=>{if(typeof pushHistory==='function')pushHistory();await regenerateBrandAssets(m);});
    wire('rm-hero-fit','change',e=>{m.hero.fit=e.target.value;const h=role('hero');if(h){h.fit=m.hero.fit;mark();}});
    [['rm-hero-opacity','opacity'],['rm-hero-zoom','zoom'],['rm-hero-overlay','overlay']].forEach(([id,key])=>wire(id,'input',e=>{m.hero[key]=Number(e.target.value);const v=$(`#${id}-v`);if(v)v.textContent=m.hero[key].toFixed(2);if(key==='overlay'){const o=role('hero-overlay');if(o){o.opacity=m.hero.overlay;mark();}}else{const h=role('hero');if(h){h[key]=m.hero[key];mark();}}}));
    wire('rm-hero-replace','click',()=>$('#rm-hero-file')?.click());wire('rm-hero-file','change',async e=>{const f=e.target.files?.[0];if(f)await replaceAsset('hero',f);e.target.value='';});
    wire('rm-chef-title','input',e=>{m.chef.title=e.target.value;setText('menu-chef-title',m.chef.title);});wire('rm-chef-body','input',e=>{m.chef.body=e.target.value;setText('body',m.chef.body);});
    m.signatures.forEach((d,i)=>{wire(`rm-sign-name-${i}`,'input',e=>{d.name=e.target.value;renderSignatures(m);selectRole('menu-signature');});wire(`rm-sign-price-${i}`,'input',e=>{d.price=e.target.value;renderSignatures(m);});wire(`rm-sign-desc-${i}`,'input',e=>{d.desc=e.target.value;renderSignatures(m);});const b=$(`[data-replace-signature="${i}"]`);if(b)b.onclick=()=>$('#rm-sign-file-'+i)?.click();wire(`rm-sign-file-${i}`,'change',async e=>{const f=e.target.files?.[0];if(f)await replaceAsset(`signature-media-${i+1}`,f);e.target.value='';});});
    m.sections.forEach((s,si)=>{
      wire(`rm-section-title-${si}`,'input',e=>{s.title=e.target.value;renderSection(s);});wire(`rm-section-enabled-${si}`,'change',e=>{s.enabled=e.target.value==='1';renderSection(s);});
      s.dishes.forEach((d,di)=>{wire(`rm-dish-name-${si}-${di}`,'input',e=>{d.name=e.target.value;renderSection(s);selectRole(s.role);});wire(`rm-dish-price-${si}-${di}`,'input',e=>{d.price=e.target.value;renderSection(s);});wire(`rm-dish-desc-${si}-${di}`,'input',e=>{d.desc=e.target.value;renderSection(s);});});
    });
    document.querySelectorAll('[data-add-dish]').forEach(b=>b.onclick=()=>{const s=m.sections[Number(b.dataset.addDish)];if(!s)return;if(typeof pushHistory==='function')pushHistory();s.dishes.push({name:'Nuevo plato',desc:'descripción',price:'0 €'});renderSection(s);renderPanel();selectRole(s.role);});
    document.querySelectorAll('[data-dish-delete]').forEach(b=>b.onclick=()=>{const [si,di]=b.dataset.dishDelete.split(':').map(Number),s=m.sections[si];if(!s||s.dishes.length<=1)return;if(typeof pushHistory==='function')pushHistory();s.dishes.splice(di,1);renderSection(s);renderPanel();});
    document.querySelectorAll('[data-dish-up],[data-dish-down]').forEach(b=>b.onclick=()=>{const raw=b.dataset.dishUp||b.dataset.dishDown;const [si,di]=raw.split(':').map(Number),s=m.sections[si],dir=b.dataset.dishUp!==undefined?-1:1,n=di+dir;if(!s||n<0||n>=s.dishes.length)return;if(typeof pushHistory==='function')pushHistory();[s.dishes[di],s.dishes[n]]=[s.dishes[n],s.dishes[di]];renderSection(s);renderPanel();});
    ['phone','web','instagram','address'].forEach(k=>wire(`rm-${k}`,'input',e=>{m.reservations[k]=e.target.value;renderReservations(m);}));
    wire('rm-sync-layers','click',()=>syncFromLayers(true));wire('rm-reset','click',async()=>{if(typeof pushHistory==='function')pushHistory();state.restaurantMenu={...deep(DEFAULT_MODEL),version:VERSION};await applyAll(state.restaurantMenu,{assets:true});renderPanel();});
  }

  function parseDishLine(line){
    const price=(line.match(/(\d+(?:[.,]\d+)?\s*€)\s*$/)||[])[1]||'';
    const left=line.replace(/\.{3,}.*$/,'').replace(price,'').trim();const parts=left.split(' · ');return {name:parts.shift()||'Plato',desc:parts.join(' · '),price};
  }
  function syncFromLayers(rerender=false){
    if(typeof state==='undefined')return;const m=ensureModel();
    const edition=role('menu-edition'),claim=role('subheadline'),caption=role('caption'),chefTitle=role('menu-chef-title'),chef=role('body'),sig=role('menu-signature');
    if(edition)m.restaurant.edition=edition.text;if(claim)m.restaurant.claim=claim.text;if(caption?.text){const p=caption.text.split('/ MENÚ DEGUSTACIÓN ·');if(p[0])m.restaurant.name=p[0].trim();if(p[1])m.restaurant.location=p[1].trim();}
    if(chefTitle)m.chef.title=chefTitle.text;if(chef)m.chef.body=chef.text;
    if(sig?.text){const lines=String(sig.text).split('\n').filter(Boolean);if(lines.length)m.signatures=lines.slice(0,3).map(parseDishLine);}
    m.sections.forEach(s=>{const el=role(s.role);if(!el)return;const lines=String(el.text||'').split('\n').filter(Boolean);if(lines.length){s.title=lines.shift();s.dishes=lines.map(parseDishLine);}s.enabled=el.visible!==false;});
    const h=role('hero');if(h){m.hero.fit=h.fit||'cover';m.hero.opacity=h.opacity??1;m.hero.zoom=h.zoom??1;}const o=role('hero-overlay');if(o)m.hero.overlay=o.opacity??.1;
    if(rerender)renderPanel();
  }

  function patchPersistence(){
    try{
      if(typeof snapshot==='function'&&!snapshot.__restaurant52){const prev=snapshot;const wrapped=function(){const s=prev();if(typeof state!=='undefined'&&state.restaurantMenu)s.restaurantMenu=deep(state.restaurantMenu);return s;};wrapped.__restaurant52=true;snapshot=wrapped;}
      if(typeof restoreSnapshot==='function'&&!restoreSnapshot.__restaurant52){const prev=restoreSnapshot;const wrapped=async function(s){await prev(s);if(s?.restaurantMenu&&typeof state!=='undefined')state.restaurantMenu=deep(s.restaurantMenu);setTimeout(()=>{syncFromLayers(false);renderPanel();},0);};wrapped.__restaurant52=true;restoreSnapshot=wrapped;}
    }catch(e){console.warn('[Restaurant Menu 5.2] persistence wrapper unavailable',e);}
  }
  function inject(){
    if($(`#${PANEL_ID}`))return;const host=$('#restaurant-menu-premium-section')||$('#ui-panel');if(!host)return;
    const d=document.createElement('details');d.id=PANEL_ID;d.open=true;d.innerHTML='<summary>Restaurant Menu · Edit</summary><div class="section-body"></div>';
    if(host.id==='restaurant-menu-premium-section')host.insertAdjacentElement('afterend',d);else host.appendChild(d);
    renderPanel();patchPersistence();
    if(!bound){bound=true;document.addEventListener('click',e=>{if(e.target?.id==='apply-restaurant-menu-premium')setTimeout(async()=>{if(typeof state!=='undefined'){state.restaurantMenu={...deep(DEFAULT_MODEL),version:VERSION};await applyAll(state.restaurantMenu);renderPanel();}},900);});document.addEventListener('input',e=>{if(e.target?.closest?.('#properties'))setTimeout(()=>syncFromLayers(true),0);});}
    if(new URLSearchParams(location.search).get('demo')==='restaurant')setTimeout(async()=>{if(typeof state!=='undefined'){state.restaurantMenu={...deep(DEFAULT_MODEL),version:VERSION};await applyAll(state.restaurantMenu);renderPanel();}},1500);
  }
  window.BanderolasRestaurantMenuControls={version:VERSION,styles:STYLES,syncFromLayers,applyAll,getModel:()=>ensureModel()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();
