'use strict';
(() => {
  const VERSION='5.1R';
  const PRESET_ID='restaurant-menu-premium';
  const RAW='https://raw.githubusercontent.com/Juanmaes83/WEB-RESTAURACI-N-PREMIUM-DIN-MICA/main/';
  const PALETTE={ink:'#090806',charcoal:'#15120f',ivory:'#f0e7d6',soft:'#b7aa96',gold:'#c7a767'};
  const MEDIA=[
    {key:'hero',type:'video',name:'LUME · Hero Film',url:RAW+'Grabaci%C3%B3n%20de%20pantalla%202026-09-04%20085412.mp4'},
    {key:'signature1',type:'image',name:'Gamba roja salvaje',url:RAW+'assets/anchor-scenes/runtime/scene-01-gamba-roja.webp'},
    {key:'signature2',type:'image',name:'Atún rojo · naranja sanguina',url:RAW+'assets/anchor-scenes/runtime/scene-02-atun-rojo.webp'},
    {key:'signature3',type:'image',name:'Presa ibérica',url:RAW+'assets/anchor-scenes/runtime/scene-05-presa-iberica.webp'}
  ];
  const $=s=>document.querySelector(s);
  const uidSafe=p=>typeof uid==='function'?uid(p):`${p}-${Math.random().toString(36).slice(2,9)}`;
  const base=(type,name,role,x,y,w,h,z)=>({id:uidSafe(type),type,name,role,x,y,w,h,rotation:0,opacity:1,zIndex:z,visible:true,locked:false});
  function text(name,role,value,x,y,w,h,size,z,o={}){return {...base('text',name,role,x,y,w,h,z),text:value,font:o.font||'Georgia',fontSize:size,fontWeight:o.weight??400,fontStyle:o.style||'normal',color:o.color||PALETTE.ivory,align:o.align||'left',lineHeight:o.lineHeight||1.18,letterSpacing:o.letterSpacing||0,textMode:'autoFit'};}
  function media(type,name,role,assetId,x,y,w,h,z,o={}){return {...base(type,name,role,x,y,w,h,z),assetId,aspectLock:true,fit:o.fit||(type==='logo'?'contain':'cover'),cropX:0,cropY:0,zoom:1,loop:true,muted:true};}
  const toBlob=(c,type='image/png',q=.94)=>new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Canvas export failed')),type,q));
  async function makeBackdrop(){
    const c=document.createElement('canvas'); c.width=1080;c.height=1920; const g=c.getContext('2d');
    const bg=g.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,'#18130f');bg.addColorStop(.48,'#0c0907');bg.addColorStop(1,'#050403');g.fillStyle=bg;g.fillRect(0,0,1080,1920);
    const glow=g.createRadialGradient(840,320,20,840,320,720);glow.addColorStop(0,'rgba(199,167,103,.18)');glow.addColorStop(1,'rgba(199,167,103,0)');g.fillStyle=glow;g.fillRect(0,0,1080,1920);
    g.strokeStyle='rgba(199,167,103,.55)';g.lineWidth=2;g.strokeRect(56,54,968,1812);g.strokeStyle='rgba(199,167,103,.20)';g.lineWidth=1;g.strokeRect(72,70,936,1780);
    g.fillStyle='rgba(255,255,255,.018)';g.fillRect(78,255,924,420);g.strokeStyle='rgba(199,167,103,.34)';g.strokeRect(78,255,924,420);
    [738,1018,1300,1560,1740].forEach(y=>{g.beginPath();g.moveTo(82,y);g.lineTo(998,y);g.stroke();});
    for(let i=0;i<5200;i++){g.fillStyle=`rgba(240,231,214,${Math.random()*.025})`;const s=.35+Math.random();g.fillRect(Math.random()*1080,Math.random()*1920,s,s);}
    return toBlob(c,'image/webp',.92);
  }
  async function makeLogo(){
    const c=document.createElement('canvas');c.width=760;c.height=240;const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.strokeStyle=PALETTE.gold;g.lineWidth=8;g.beginPath();g.moveTo(42,120);g.lineTo(84,55);g.lineTo(126,120);g.lineTo(84,185);g.closePath();g.stroke();g.beginPath();g.moveTo(84,55);g.lineTo(84,185);g.moveTo(42,120);g.lineTo(126,120);g.stroke();g.fillStyle=PALETTE.ivory;g.font='600 112px Georgia';g.textBaseline='middle';g.fillText('LUME',174,121);g.fillStyle=PALETTE.gold;g.fillRect(176,183,478,3);return toBlob(c);
  }
  async function makeHeroFallback(){
    const c=document.createElement('canvas');c.width=1200;c.height=720;const g=c.getContext('2d');const bg=g.createRadialGradient(760,260,30,600,350,780);bg.addColorStop(0,'#5b3522');bg.addColorStop(.44,'#24150e');bg.addColorStop(1,'#070504');g.fillStyle=bg;g.fillRect(0,0,c.width,c.height);g.fillStyle='rgba(199,167,103,.16)';g.beginPath();g.ellipse(600,410,330,145,-.08,0,Math.PI*2);g.fill();g.strokeStyle='rgba(240,231,214,.45)';g.lineWidth=3;g.beginPath();g.ellipse(600,410,270,104,-.08,0,Math.PI*2);g.stroke();g.fillStyle='#7f3426';g.beginPath();g.ellipse(600,402,170,62,-.08,0,Math.PI*2);g.fill();return toBlob(c,'image/webp',.92);
  }
  async function register(assetId,blob,type){if(typeof putAsset==='function')await putAsset(assetId,blob);if(typeof loadRuntimeAsset==='function')await loadRuntimeAsset(assetId,blob,type==='video'?'video':'image');return assetId;}
  async function ensure(spec){
    const assetId=`builtin:${PRESET_ID}:${spec.key}`;
    if(typeof runtimeAssets!=='undefined'&&runtimeAssets.has(assetId))return {assetId,type:spec.type,ok:true};
    try{const r=await fetch(spec.url,{cache:'force-cache',mode:'cors'});if(!r.ok)throw new Error(`HTTP ${r.status}`);const b=await r.blob();if(!b.size)throw new Error('empty');await register(assetId,b,spec.type);return {assetId,type:spec.type,ok:true};}
    catch(error){console.warn('[Restaurant Menu Premium]',spec.key,error);if(spec.key==='hero'){const fallback=`builtin:${PRESET_ID}:hero-fallback`;await register(fallback,await makeHeroFallback(),'image');return {assetId:fallback,type:'image',ok:false,fallback:true};}return {assetId:null,type:spec.type,ok:false};}
  }
  function build(a){
    let z=0,o=[];const backdrop=`builtin:${PRESET_ID}:backdrop`,logo=`builtin:${PRESET_ID}:logo`;
    o.push(media('image','Editorial Dark Plate','menu-backdrop',backdrop,0,0,1,1,z++,{fit:'fill'}));
    o.push(media('logo','LUME · Brand Mark','logo',logo,.065,.026,.31,.075,z++));
    o.push(text('Menu Edition','menu-edition','RESTAURANT MENU · AUTUMN 2026',.57,.049,.36,.032,22,z++,{align:'right',font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:1.8}));
    o.push(text('Brand Statement','subheadline','COCINA DE PRODUCTO · FUEGO · TEMPORADA',.07,.112,.86,.036,25,z++,{align:'center',font:'Arial',weight:600,color:PALETTE.soft,letterSpacing:1.25}));
    if(a.hero?.assetId)o.push(media(a.hero.type,'Hero · Chef Film','hero',a.hero.assetId,.073,.145,.854,.213,z++));
    o.push(text('Hero Caption','caption','LUME / MENÚ DEGUSTACIÓN · COSTA MEDITERRÁNEA',.09,.335,.80,.025,18,z++,{font:'Arial',weight:700,letterSpacing:1.0}));
    o.push(text('Chef Note Title','menu-chef-title','NOTA DEL CHEF',.075,.383,.28,.027,24,z++,{font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:1.4}));
    o.push(text('Chef Note','body','Cocinamos desde el producto y su estación. Brasas, fondos largos y acidez limpia para que cada ingrediente conserve su identidad.',.075,.416,.85,.058,24,z++,{lineHeight:1.30}));
    o.push(text('Signature Title','menu-signature-title','PLATOS DE FIRMA',.075,.495,.40,.027,25,z++,{font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:1.5}));
    const xs=[.075,.356,.637];[a.signature1,a.signature2,a.signature3].forEach((m,i)=>{if(m?.assetId)o.push(media('image',MEDIA[i+1].name,`signature-media-${i+1}`,m.assetId,xs[i],.532,.255,.105,z++));});
    o.push(text('Signature Dishes','menu-signature','GAMBA ROJA SALVAJE · arroz tostado · hierbas                       24 €\nATÚN ROJO · naranja sanguina · aguacate                             26 €\nPRESA IBÉRICA · jugo de brasa · raíz                                  31 €',.075,.646,.85,.066,21,z++,{font:'Arial',weight:500,lineHeight:1.42}));
    o.push(text('Entrantes','menu-starters','ENTRANTES\nOstra · pepino · manzana verde ........................................ 6 €\nTomate antiguo · almendra · albahaca .............................. 16 €\nBrioche · anchoa · limón ................................................ 14 €',.075,.727,.85,.071,20,z++,{font:'Arial',weight:500,lineHeight:1.42}));
    o.push(text('Principales','menu-mains','PRINCIPALES\nRodaballo · pilpil ahumado · hinojo ................................. 32 €\nPresa ibérica · cebolla quemada · romero ......................... 31 €\nArroz meloso de gamba roja · azafrán ............................. 29 €',.075,.811,.85,.071,20,z++,{font:'Arial',weight:500,lineHeight:1.42}));
    o.push(text('Postres','menu-desserts','POSTRES\nChocolate 72% · AOVE · sal marina .................................. 12 €\nMilhojas · vainilla · cítricos ............................................ 11 €',.075,.895,.85,.054,19,z++,{font:'Arial',weight:500,lineHeight:1.40}));
    o.push(text('Bodega y Cócteles','menu-drinks','BODEGA · CÓCTELES\nCopa selección del sumiller .............................................. 9 €\nLUME Negroni · naranja tostada ..................................... 14 €',.075,.951,.85,.041,18,z++,{font:'Arial',weight:500,lineHeight:1.35}));
    o.push(text('Reservation Footer','cta','RESERVAS · lume.restaurant     +34 900 000 000     @lume.restaurant',.075,.982,.85,.015,15,z++,{align:'center',font:'Arial',weight:700,color:PALETTE.gold,letterSpacing:.7}));
    o.forEach((e,i)=>e.zIndex=i);return o;
  }
  function status(t,k=''){const n=$('#restaurant-menu-status');if(n){n.textContent=t;n.className='status'+(k?` ${k}`:'');}}
  async function apply(){
    if(typeof state==='undefined')throw new Error('Editor state unavailable');const b=$('#apply-restaurant-menu-premium');if(b){b.disabled=true;b.textContent='LOADING MENU…';}status('Preparando carta premium y assets gastronómicos…');
    const modeBefore=state.mode;
    const formatBefore=state.format;
    try{
      if(typeof pushHistory==='function')pushHistory();const backdrop=`builtin:${PRESET_ID}:backdrop`,logo=`builtin:${PRESET_ID}:logo`;
      if(!(typeof runtimeAssets!=='undefined'&&runtimeAssets.has(backdrop)))await register(backdrop,await makeBackdrop(),'image');
      if(!(typeof runtimeAssets!=='undefined'&&runtimeAssets.has(logo)))await register(logo,await makeLogo(),'image');
      const loaded=await Promise.all(MEDIA.map(ensure));const a=Object.fromEntries(MEDIA.map((m,i)=>[m.key,loaded[i]]));
      state.projectName='LUME · Restaurant Menu Premium';state.format='9:16';state.layout='free';state.mode=modeBefore;state.brand={...(state.brand||{}),name:'LUME',primary:PALETTE.gold,secondary:PALETTE.ivory,font:'Georgia'};state.elements=build(a);state.selectedId=state.elements.find(e=>e.role==='hero')?.id||null;state.needsTextureUpdate=true;
      if(typeof rebuildCompositor==='function')rebuildCompositor();if(formatBefore!==state.format&&typeof rebuildCloth==='function')rebuildCloth();if(typeof syncUI==='function')syncUI();if(typeof renderLayers==='function')renderLayers();if(typeof renderProperties==='function')renderProperties();state.needsTextureUpdate=true;
      status('CARTA PREMIUM ACTIVA · contenido actualizado · modo físico preservado.','ok');if(typeof toast==='function')toast('Restaurant Menu Premium aplicado');return {preset:PRESET_ID,assets:loaded,elements:state.elements.length,mode:state.mode};
    }finally{if(b){b.disabled=false;b.textContent='APPLY PREMIUM RESTAURANT MENU';}}
  }
  function inject(){
    if($('#restaurant-menu-premium-section'))return;const panel=$('#ui-panel');if(!panel)return;const add=[...panel.querySelectorAll('details')].find(d=>d.querySelector('summary')?.textContent.trim().toLowerCase()==='add');
    const d=document.createElement('details');d.id='restaurant-menu-premium-section';d.open=true;d.innerHTML=`<summary>Restaurant Menu Premium</summary><div class="section-body"><div style="padding:10px;border:1px solid rgba(199,167,103,.45);background:linear-gradient(135deg,rgba(199,167,103,.09),rgba(0,0,0,.1));margin-bottom:8px"><div class="micro-label">DOCUMENT PRESET · EDITORIAL / DARK FINE DINING</div><div style="font:700 13px Georgia;color:#f0e7d6;margin:5px 0 8px">LUME · Premium Restaurant Menu</div><button id="apply-restaurant-menu-premium" class="btn-solid">APPLY PREMIUM RESTAURANT MENU</button><div id="restaurant-menu-status" class="status" style="margin-top:8px">9:16 · vídeo hero · 3 fotografías gastronómicas · Chef Note · Entrantes · Principales · Postres · Bodega/Cócteles · Reservas.</div></div></div>`;
    panel.insertBefore(d,add||panel.querySelector('details:nth-of-type(3)')||null);$('#apply-restaurant-menu-premium').onclick=()=>apply().catch(e=>{console.error(e);status('ERROR · '+(e.message||e),'warn');});
    if(new URLSearchParams(location.search).get('demo')==='restaurant')setTimeout(()=>apply().catch(console.error),650);
  }
  window.BanderolasPresets=window.BanderolasPresets||{};window.BanderolasPresets[PRESET_ID]=Object.freeze({id:PRESET_ID,version:VERSION,apply,media:MEDIA});window.applyRestaurantMenuPremium=apply;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});else inject();
})();