'use strict';
(() => {
  const VERSION = '5.1';
  const PRESET_ID = 'restaurant-menu-premium';
  const SOURCE_REPO = 'Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA';
  const RAW = 'https://raw.githubusercontent.com/Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA/main/';

  const PALETTE = Object.freeze({
    ink:'#090806', charcoal:'#15120f', ivory:'#f0e7d6', soft:'#b7aa96', gold:'#c7a767', crimson:'#8b2b2b'
  });

  const DEMO_MEDIA = Object.freeze([
    {key:'hero', type:'video', name:'LUME · Hero Film', url:RAW + 'Grabaci%C3%B3n%20de%20pantalla%202026-09-04%20085412.mp4'},
    {key:'signature1', type:'image', name:'Gamba roja salvaje', url:RAW + 'assets/anchor-scenes/runtime/scene-01-gamba-roja.webp'},
    {key:'signature2', type:'image', name:'Atún rojo · naranja sanguina', url:RAW + 'assets/anchor-scenes/runtime/scene-02-atun-rojo.webp'},
    {key:'signature3', type:'image', name:'Presa ibérica', url:RAW + 'assets/anchor-scenes/runtime/scene-05-presa-iberica.webp'}
  ]);

  const $q = sel => document.querySelector(sel);
  const id = prefix => typeof uid === 'function' ? uid(prefix) : `${prefix}-${Math.random().toString(36).slice(2,9)}`;
  const layerBase = (type,name,role,x,y,w,h,z) => ({
    id:id(type), type, name, role, x,y,w,h, rotation:0, opacity:1, zIndex:z,
    visible:true, locked:false
  });

  function textLayer(name,role,text,x,y,w,h,size,z,opts={}){
    return Object.assign(layerBase('text',name,role,x,y,w,h,z),{
      text, font:opts.font || 'Georgia', fontSize:size, fontWeight:opts.weight ?? 400,
      fontStyle:opts.style || 'normal', color:opts.color || PALETTE.ivory,
      align:opts.align || 'left', lineHeight:opts.lineHeight || 1.18,
      letterSpacing:opts.letterSpacing || 0, textMode:'autoFit'
    });
  }

  function mediaLayer(type,name,role,assetId,x,y,w,h,z,opts={}){
    return Object.assign(layerBase(type,name,role,x,y,w,h,z),{
      assetId, aspectLock:true, fit:opts.fit || (type==='logo'?'contain':'cover'),
      cropX:0, cropY:0, zoom:opts.zoom || 1, loop:true, muted:true
    });
  }

  function canvasBlob(canvas,type='image/png',quality=.94){
    return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Canvas export failed')),type,quality));
  }

  async function makeBackdropBlob(){
    const c=document.createElement('canvas'); c.width=1080; c.height=1920;
    const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,1080,1920); bg.addColorStop(0,'#17130f'); bg.addColorStop(.42,'#0c0a08'); bg.addColorStop(1,'#050504');
    g.fillStyle=bg; g.fillRect(0,0,c.width,c.height);
    const glow=g.createRadialGradient(840,360,20,840,360,760); glow.addColorStop(0,'rgba(199,167,103,.16)'); glow.addColorStop(1,'rgba(199,167,103,0)');
    g.fillStyle=glow; g.fillRect(0,0,c.width,c.height);
    g.strokeStyle='rgba(199,167,103,.52)'; g.lineWidth=2;
    g.strokeRect(56,54,968,1812);
    g.strokeStyle='rgba(199,167,103,.22)'; g.lineWidth=1;
    g.strokeRect(72,70,936,1780);
    // Hero aperture and editorial rails. No text is baked into the plate.
    g.fillStyle='rgba(255,255,255,.018)'; g.fillRect(78,250,924,430);
    g.strokeStyle='rgba(199,167,103,.35)'; g.strokeRect(78,250,924,430);
    const rules=[742,1030,1308,1572,1742];
    g.strokeStyle='rgba(199,167,103,.22)';
    rules.forEach(y=>{g.beginPath();g.moveTo(82,y);g.lineTo(998,y);g.stroke();});
    for(let i=0;i<6500;i++){
      const a=Math.random()*.028; g.fillStyle=`rgba(240,231,214,${a})`; const s=.35+Math.random()*1.1;
      g.fillRect(Math.random()*1080,Math.random()*1920,s,s);
    }
    return canvasBlob(c,'image/webp',.92);
  }

  async function makeLogoBlob(){
    const c=document.createElement('canvas'); c.width=760; c.height=240; const g=c.getContext('2d');
    g.clearRect(0,0,c.width,c.height); g.strokeStyle=PALETTE.gold; g.lineWidth=8;
    g.beginPath(); g.moveTo(42,120); g.lineTo(84,55); g.lineTo(126,120); g.lineTo(84,185); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(84,55); g.lineTo(84,185); g.moveTo(42,120); g.lineTo(126,120); g.stroke();
    g.fillStyle=PALETTE.ivory; g.font='600 112px Georgia'; g.textBaseline='middle'; g.fillText('LUME',174,121);
    g.fillStyle=PALETTE.gold; g.fillRect(176,183,478,3);
    return canvasBlob(c,'image/png');
  }

  async function makeHeroFallbackBlob(){
    const c=document.createElement('canvas');c.width=1200;c.height=720;const g=c.getContext('2d');
    const bg=g.createRadialGradient(760,260,30,600,350,780);bg.addColorStop(0,'#5b3522');bg.addColorStop(.44,'#24150e');bg.addColorStop(1,'#070504');
    g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);
    g.fillStyle='rgba(199,167,103,.16)';g.beginPath();g.ellipse(600,410,330,145,-.08,0,Math.PI*2);g.fill();
    g.strokeStyle='rgba(240,231,214,.45)';g.lineWidth=3;g.beginPath();g.ellipse(600,410,270,104,-.08,0,Math.PI*2);g.stroke();
    g.fillStyle='#7f3426';g.beginPath();g.ellipse(600,402,170,62,-.08,0,Math.PI*2);g.fill();
    for(let i=0;i<24;i++){g.fillStyle=i%2?'#d0a45f':'#789363';g.beginPath();g.arc(485+Math.random()*240,365+Math.random()*75,5+Math.random()*12,0,Math.PI*2);g.fill();}
    const vign=g.createRadialGradient(600,360,170,600,360,700);vign.addColorStop(.2,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.72)');g.fillStyle=vign;g.fillRect(0,0,c.width,c.height);
    return canvasBlob(c,'image/webp',.92);
  }

  async function registerBlob(assetId,blob,type){
    if(typeof putAsset==='function') await putAsset(assetId,blob);
    if(typeof loadRuntimeAsset==='function') await loadRuntimeAsset(assetId,blob,type==='video'?'video':'image');
    return assetId;
  }

  async function remoteBlob(spec){
    const res=await fetch(spec.url,{cache:'force-cache',mode:'cors'});
    if(!res.ok) throw new Error(`${spec.name}: HTTP ${res.status}`);
    const blob=await res.blob();
    if(!blob.size) throw new Error(`${spec.name}: empty asset`);
    return blob;
  }

  async function ensureAsset(spec){
    const assetId=`builtin:${PRESET_ID}:${spec.key}`;
    if(typeof runtimeAssets!=='undefined' && runtimeAssets.has(assetId)) return {assetId,type:spec.type,ok:true,cached:true};
    if(typeof getAsset==='function'){
      const existing=await getAsset(assetId);
      if(existing){ await loadRuntimeAsset(assetId,existing,spec.type==='video'?'video':'image'); return {assetId,type:spec.type,ok:true,cached:true}; }
    }
    try{
      const blob=await remoteBlob(spec); await registerBlob(assetId,blob,spec.type); return {assetId,type:spec.type,ok:true,cached:false};
    }catch(error){
      console.warn('[Restaurant Menu Premium] demo media unavailable',spec.key,error);
      if(spec.key==='hero'){
        const fallbackId=`builtin:${PRESET_ID}:hero-fallback`;
        const blob=await makeHeroFallbackBlob(); await registerBlob(fallbackId,blob,'image');
        return {assetId:fallbackId,type:'image',ok:false,fallback:true,error:String(error)};
      }
      return {assetId:null,type:spec.type,ok:false,error:String(error)};
    }
  }

  function buildLayers(assets){
    let z=0; const out=[];
    const backdrop=`builtin:${PRESET_ID}:backdrop`, logo=`builtin:${PRESET_ID}:logo`;
    out.push(mediaLayer('image','Editorial Dark Plate','menu-backdrop',backdrop,0,0,1,1,z++,{fit:'fill'}));
    out.push(mediaLayer('logo','LUME · Brand Mark','logo',logo,.068,.034,.31,.083,z++,{fit:'contain'}));
    out.push(textLayer('Menu Edition','menu-edition','RESTAURANT MENU · SEPTIEMBRE 2026',.60,.062,.33,.036,24,z++,{align:'right',font:'Arial',weight:600,color:PALETTE.gold,letterSpacing:2.1}));
    out.push(textLayer('Brand Statement','subheadline','COCINA DE PRODUCTO · FUEGO · TEMPORADA',.07,.132,.86,.043,27,z++,{align:'center',font:'Arial',weight:600,color:PALETTE.soft,letterSpacing:1.4}));

    const hero=assets.hero;
    if(hero?.assetId) out.push(mediaLayer(hero.type,'Hero · Chef Film','hero',hero.assetId,.073,.141,.854,.225,z++,{fit:'cover'}));
    out.push(textLayer('Hero Caption','caption','LUME / MENÚ DEGUSTACIÓN · COSTA MEDITERRÁNEA',.09,.337,.80,.026,20,z++,{font:'Arial',weight:700,color:PALETTE.ivory,letterSpacing:1.2}));

    out.push(textLayer('Chef Note Title','menu-chef-title','NOTA DEL CHEF',.075,.389,.25,.032,27,z++,{font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:1.5}));
    out.push(textLayer('Chef Note','body','Cocinamos desde el producto y su estación. Brasas, fondos largos y acidez limpia para que cada ingrediente conserve su identidad.',.075,.423,.85,.073,27,z++,{font:'Georgia',color:PALETTE.ivory,lineHeight:1.32}));

    out.push(textLayer('Signature Title','menu-signature-title','PLATOS DE FIRMA',.075,.516,.40,.033,28,z++,{font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:1.6}));
    const thumbs=[assets.signature1,assets.signature2,assets.signature3];
    const xs=[.075,.356,.637];
    thumbs.forEach((a,i)=>{if(a?.assetId)out.push(mediaLayer('image',DEMO_MEDIA[i+1].name,`signature-media-${i+1}`,a.assetId,xs[i],.557,.255,.117,z++,{fit:'cover'}));});
    out.push(textLayer('Signature Dishes','menu-signature','GAMBA ROJA SALVAJE · arroz tostado · hierbas                         24 €\nATÚN ROJO · naranja sanguina · aguacate                               26 €\nPRESA IBÉRICA · jugo de brasa · raíz                                    31 €',.075,.681,.85,.078,24,z++,{font:'Arial',weight:500,color:PALETTE.ivory,lineHeight:1.48}));

    out.push(textLayer('Entrantes','menu-starters','ENTRANTES\nOstra · pepino · manzana verde ........................................ 6 €\nTomate antiguo · almendra · albahaca ................................ 16 €\nBrioche de mantequilla · anchoa · limón ............................... 14 €',.075,.775,.85,.114,25,z++,{font:'Arial',weight:500,color:PALETTE.ivory,lineHeight:1.45}));
    out.push(textLayer('Principales','menu-mains','PRINCIPALES\nRodaballo · pilpil ahumado · hinojo ................................... 32 €\nPresa ibérica · cebolla quemada · romero .............................. 31 €\nArroz meloso de gamba roja · azafrán ................................ 29 €',.075,.914,.85,.114,25,z++,{font:'Arial',weight:500,color:PALETTE.ivory,lineHeight:1.45}));
    out.push(textLayer('Postres','menu-desserts','POSTRES\nChocolate 72% · AOVE · sal marina ..................................... 12 €\nMilhojas · vainilla · cítricos ............................................. 11 €',.075,1.053,.85,.093,25,z++,{font:'Arial',weight:500,color:PALETTE.ivory,lineHeight:1.46}));
    out.push(textLayer('Bodega y Cócteles','menu-drinks','BODEGA · CÓCTELES\nCopa selección del sumiller ................................................ 9 €\nLUME Negroni · naranja tostada ......................................... 14 €',.075,1.172,.85,.093,25,z++,{font:'Arial',weight:500,color:PALETTE.ivory,lineHeight:1.46}));
    // Normalized y must stay <= 1; the sections above intentionally use normalized values after remapping below.
    const remap={
      'menu-chef-title':.386,'body':.417,'menu-signature-title':.498,
      'signature-media-1':.536,'signature-media-2':.536,'signature-media-3':.536,
      'menu-signature':.662,'menu-starters':.730,'menu-mains':.806,'menu-desserts':.882,'menu-drinks':.929
    };
    out.forEach(el=>{if(remap[el.role]!==undefined)el.y=remap[el.role];});
    // Tighten the lower editorial columns to keep the whole card within the 9:16 page.
    const starters=out.find(e=>e.role==='menu-starters'); if(starters){starters.h=.066;starters.fontSize=21;}
    const mains=out.find(e=>e.role==='menu-mains'); if(mains){mains.h=.066;mains.fontSize=21;}
    const desserts=out.find(e=>e.role==='menu-desserts'); if(desserts){desserts.h=.052;desserts.fontSize=20;}
    const drinks=out.find(e=>e.role==='menu-drinks'); if(drinks){drinks.h=.052;drinks.fontSize=20;}
    out.push(textLayer('Reservation Footer','cta','RESERVAS · lume.restaurant     +34 900 000 000     @lume.restaurant',.075,.972,.85,.022,18,z++,{align:'center',font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:1.0}));
    out.forEach((el,i)=>el.zIndex=i);
    return out;
  }

  function setStatus(message,kind=''){
    const el=$q('#restaurant-menu-status'); if(!el)return; el.textContent=message; el.className='status'+(kind?` ${kind}`:'');
  }

  async function applyRestaurantMenuPremium(){
    if(typeof state==='undefined') throw new Error('BANDEROLAS editor state is not ready');
    const button=$q('#apply-restaurant-menu-premium'); if(button){button.disabled=true;button.textContent='LOADING PREMIUM MENU…';}
    setStatus('Preparando identidad, carta y media gastronómica…');
    try{
      if(typeof pushHistory==='function') pushHistory();
      const backdropId=`builtin:${PRESET_ID}:backdrop`, logoId=`builtin:${PRESET_ID}:logo`;
      if(!(typeof runtimeAssets!=='undefined' && runtimeAssets.has(backdropId))){
        const b=await makeBackdropBlob(); await registerBlob(backdropId,b,'image');
      }
      if(!(typeof runtimeAssets!=='undefined' && runtimeAssets.has(logoId))){
        const b=await makeLogoBlob(); await registerBlob(logoId,b,'image');
      }
      const loaded=await Promise.all(DEMO_MEDIA.map(ensureAsset));
      const assets=Object.fromEntries(DEMO_MEDIA.map((m,i)=>[m.key,loaded[i]]));

      state.projectName='LUME · Restaurant Menu Premium';
      state.format='9:16'; state.layout='free'; state.mode='edit';
      state.brand={...(state.brand||{}),name:'LUME',primary:PALETTE.gold,secondary:PALETTE.ivory,font:'Georgia'};
      state.elements=buildLayers(assets);
      state.selectedId=state.elements.find(e=>e.role==='hero')?.id || state.elements.find(e=>e.role==='menu-signature-title')?.id || null;
      state.needsTextureUpdate=true;

      if(typeof rebuildCompositor==='function') rebuildCompositor();
      if(typeof rebuildCloth==='function') rebuildCloth();
      if(typeof syncUI==='function') syncUI();
      if(typeof renderLayers==='function') renderLayers();
      if(typeof renderProperties==='function') renderProperties();
      state.needsTextureUpdate=true;

      const fallbacks=loaded.filter(x=>!x.ok).length;
      setStatus(fallbacks?`Premium Menu aplicado. ${fallbacks} demo asset(s) usaron fallback; todas las capas siguen editables.`:'Premium Menu aplicado · hero audiovisual + 3 platos · todas las capas son editables.','ok');
      if(typeof toast==='function') toast('Restaurant Menu Premium aplicado');
      return {preset:PRESET_ID,version:VERSION,sourceRepo:SOURCE_REPO,assets:loaded,elements:state.elements.length};
    } finally {
      if(button){button.disabled=false;button.textContent='APPLY PREMIUM MENU';}
    }
  }

  function injectUI(){
    if($q('#apply-restaurant-menu-premium')) return;
    const select=$q('#template-select'); const body=select?.closest('.section-body'); if(!body)return;
    const block=document.createElement('div');
    block.setAttribute('data-document-presets','restaurant');
    block.style.cssText='margin:0 0 12px;padding:10px;border:1px solid rgba(199,167,103,.34);background:rgba(199,167,103,.035)';
    block.innerHTML=`<div class="micro-label">Premium document presets</div>
      <div class="form-group"><select id="builtin-document-preset" class="form-control"><option value="${PRESET_ID}">Restaurant Menu Premium · Editorial / Dark Fine Dining</option></select></div>
      <button id="apply-restaurant-menu-premium" class="btn-solid">APPLY PREMIUM MENU</button>
      <div id="restaurant-menu-status" class="status" style="margin-top:7px">9:16 · LUME · hero audiovisual · chef note · carta · reservas. Uses the existing layers and right panel.</div>`;
    body.prepend(block);
    $q('#apply-restaurant-menu-premium').addEventListener('click',()=>applyRestaurantMenuPremium().catch(error=>{
      console.error('[Restaurant Menu Premium]',error); setStatus(`No se pudo aplicar: ${error.message||error}`,'warn');
      const b=$q('#apply-restaurant-menu-premium');if(b){b.disabled=false;b.textContent='APPLY PREMIUM MENU';}
    }));
  }

  window.BanderolasPresets=window.BanderolasPresets||{};
  window.BanderolasPresets[PRESET_ID]=Object.freeze({id:PRESET_ID,version:VERSION,label:'Restaurant Menu Premium · Editorial / Dark Fine Dining',apply:applyRestaurantMenuPremium,media:DEMO_MEDIA,sourceRepo:SOURCE_REPO});
  window.applyRestaurantMenuPremium=applyRestaurantMenuPremium;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',injectUI,{once:true}); else injectUI();
})();