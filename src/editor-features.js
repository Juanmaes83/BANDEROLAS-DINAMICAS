'use strict';
(() => {
  const FIX_VERSION = '3.1';
  const AUTOSAVE_KEY = 'banderolas-pro-autosave-v3';
  const ASSET_META_KEY = 'banderolas-pro-asset-meta-v3';
  const textMetrics = new Map();
  let patchedVideoTextureAt = 0;
  let rotationAction = null;
  let bgColorHistoryArmed = false;

  const fmt = typeof fmtMap !== 'undefined' ? fmtMap : {'9:16':{w:1080,h:1920},'1:1':{w:1080,h:1080},'16:9':{w:1920,h:1080}};
  const roles = {
    text:['headline','subheadline','body','price','cta','signature','caption'],
    image:['hero','media1','media2','media3','media4','media5'],
    video:['hero','media1','media2','media3','media4','media5'],
    logo:['logo','logo2','logo3']
  };

  function rolePool(type){ return roles[type] || []; }
  function nextRole(type){
    const used = new Set(state.elements.filter(e => type==='image'||type==='video' ? ['image','video'].includes(e.type) : e.type===type).map(e => e.role));
    return rolePool(type).find(r => !used.has(r)) || rolePool(type).at(-1) || type;
  }
  function ensureRoles(){
    const used = new Set();
    for(const el of state.elements){
      if(el.role && !used.has(el.role)){ used.add(el.role); continue; }
      const pool = rolePool(el.type);
      el.role = pool.find(r => !used.has(r)) || el.role || pool[0] || el.type;
      used.add(el.role);
    }
  }
  function overlapArea(a,b){
    const ox = Math.max(0, Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
    const oy = Math.max(0, Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    return ox*oy;
  }
  function smartSpawn(w,h,ignoreId=null){
    const m=.045, candidates=[];
    for(let y=m; y<=1-h-m+.001; y+=.055) for(let x=m; x<=1-w-m+.001; x+=.055) candidates.push({x,y,w,h});
    if(!candidates.length) return {x:Math.max(0,(1-w)/2),y:Math.max(0,(1-h)/2)};
    let best=candidates[0], score=Infinity;
    for(const c of candidates){
      let s=0;
      for(const e of state.elements){ if(e.id===ignoreId || !e.visible) continue; s += overlapArea(c,e)*40; }
      if(c.x<.03 || c.y<.03 || c.x+c.w>.97 || c.y+c.h>.97) s+=1;
      if(s<score){ score=s; best=c; if(score===0) break; }
    }
    return {x:best.x,y:best.y};
  }

  function normalizeZFixed(){ state.elements.forEach((e,i)=>e.zIndex=i); }
  function byRole(r){ return state.elements.find(e=>e.role===r); }
  function mediaElements(){ return state.elements.filter(e=>['image','video'].includes(e.type)); }
  function logoElements(){ return state.elements.filter(e=>e.type==='logo'); }
  function textElements(){ return state.elements.filter(e=>e.type==='text'); }
  function place(el,x,y,w,h){ if(!el) return; Object.assign(el,{x,y,w,h}); }
  function placeText(map){ for(const [r,v] of Object.entries(map)){ const el=byRole(r); if(el) place(el,...v); } }

  const builtInLapd = {
    id:'builtin:lapd',
    name:'Built-in · L.A.P.D. Evidence',
    format:state.format || '9:16',
    layout:'free',
    elements:deepClone(state.elements || []),
    brand:deepClone(state.brand || {}),
    fabric:deepClone(state.fabric || {})
  };
  builtInLapd.elements.forEach((e,i)=>{
    const map=['headline','subheadline','caption','body','signature'];
    e.role = map[i] || e.role || 'body';
    if(e.type==='text' && !e.textMode) e.textMode='autoFit';
  });

  snapshot = function(){
    return deepClone({
      projectId:state.projectId, projectName:state.projectName, format:state.format, layout:state.layout,
      brand:state.brand, background:state.background, fabric:state.fabric, elements:state.elements,
      selectedId:state.selectedId, mode:state.mode
    });
  };

  function migrateElement(el,i){
    const e={...el};
    e.id=e.id||uid(e.type||'layer'); e.type=e.type||'text'; e.name=e.name||e.type;
    e.x=Number.isFinite(e.x)?e.x:.1; e.y=Number.isFinite(e.y)?e.y:.1; e.w=Number.isFinite(e.w)?e.w:.5; e.h=Number.isFinite(e.h)?e.h:.1;
    e.rotation=Number.isFinite(e.rotation)?e.rotation:0; e.opacity=Number.isFinite(e.opacity)?e.opacity:1; e.visible=e.visible!==false; e.locked=!!e.locked; e.zIndex=i;
    e.role=e.role||nextRole(e.type);
    if(e.type==='text'){
      e.font=e.font||state.brand?.font||'Arial'; e.fontSize=e.fontSize||42; e.fontWeight=e.fontWeight||400; e.fontStyle=e.fontStyle||'normal';
      e.color=e.color||'#151515'; e.align=e.align||'left'; e.lineHeight=e.lineHeight||1.2; e.letterSpacing=e.letterSpacing||0; e.textMode=e.textMode||'autoFit'; e.text=String(e.text??'Text');
    }else{
      e.fit=e.fit||(e.type==='logo'?'contain':'cover'); e.cropX=e.cropX||0; e.cropY=e.cropY||0; e.zoom=e.zoom||1; e.aspectLock=e.aspectLock!==false;
      if(e.type==='video'){ e.loop=e.loop!==false; e.muted=e.muted!==false; }
    }
    return e;
  }
  function migrateElements(arr){
    const old=state.elements, out=[]; state.elements=[];
    (arr||[]).forEach((x,i)=>{ const e=migrateElement(x,i); out.push(e); state.elements.push(e); });
    state.elements=old; return out;
  }

  restoreSnapshot = async function(s){
    if(!s) return;
    Object.assign(state, deepClone(s));
    state.elements=migrateElements(state.elements||[]);
    ensureRoles();
    if(typeof rebuildCompositor==='function') rebuildCompositor();
    if(typeof hydrateAssets==='function') await hydrateAssets();
    if(typeof rebuildCloth==='function') rebuildCloth();
    syncUI(); renderLayers(); renderProperties();
    state.needsTextureUpdate=true;
  };

  function getAssetMeta(){ try{return JSON.parse(localStorage.getItem(ASSET_META_KEY)||'[]')}catch{return[]} }
  function setAssetMeta(a){ localStorage.setItem(ASSET_META_KEY,JSON.stringify(a.slice(0,250))); }
  function rememberAsset(id,file,type){
    const a=getAssetMeta().filter(x=>x.id!==id);
    a.unshift({id,name:file.name||type,type,size:file.size||0,createdAt:new Date().toISOString()});
    setAssetMeta(a); renderAssetLibrary();
  }
  function runtimeRelease(id){
    const a=runtimeAssets.get(id); if(a?.node?.pause) a.node.pause(); if(a?.url) URL.revokeObjectURL(a.url); runtimeAssets.delete(id);
  }
  function allReferencedAssetIds(){
    const ids=new Set(state.elements.map(e=>e.assetId).filter(Boolean));
    for(const st of [undoStack,redoStack]) for(const snap of st||[]) for(const e of snap.elements||[]) if(e.assetId) ids.add(e.assetId);
    try{
      for(const key of [PROJ_KEY,TEMPLATE_KEY,BRAND_KEY]) for(const item of loadArr(key)||[]){
        for(const e of item.elements||[]) if(e.assetId) ids.add(e.assetId);
        for(const id of item.logoAssetIds||[]) ids.add(id);
        if(item.logoAssetId) ids.add(item.logoAssetId);
      }
    }catch{}
    return ids;
  }
  async function deleteBlob(id){
    try{ const db=await openDB(); await new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)}); db.close(); }catch{}
  }
  async function releaseIfOrphan(id){
    if(!id || allReferencedAssetIds().has(id)) return;
    runtimeRelease(id); await deleteBlob(id); setAssetMeta(getAssetMeta().filter(x=>x.id!==id)); renderAssetLibrary();
  }

  addText = function(){
    pushHistory();
    const w=.52,h=.095,pos=smartSpawn(w,h),role=nextRole('text');
    const el=textEl(role==='headline'?'Headline':'Text','NEW TEXT',pos.x,pos.y,w,h,52,{align:'center',font:state.brand?.font||'Arial',color:state.brand?.secondary||'#111111'});
    el.role=role; el.textMode='autoFit'; el.letterSpacing=0;
    state.elements.push(el); normalizeZFixed(); setSelected(el.id); state.needsTextureUpdate=true;
  };
  addFile = async function(file,type,replaceId=null){
    const assetId=uid('asset'); await putAsset(assetId,file); await loadRuntimeAsset(assetId,file,type==='video'?'video':'image'); rememberAsset(assetId,file,type);
    if(replaceId){
      const el=state.elements.find(e=>e.id===replaceId); if(!el) return;
      const old=el.assetId; pushHistory(); el.assetId=assetId; el.name=file.name||el.name; state.needsTextureUpdate=true; renderLayers(); renderProperties(); await releaseIfOrphan(old); return;
    }
    pushHistory();
    const role=nextRole(type), d=type==='logo'?{w:.24,h:.12}:role==='hero'?{w:.72,h:.45}:{w:.38,h:.24}, pos=smartSpawn(d.w,d.h);
    const el={id:uid(type),type,name:file.name||type,role,assetId,x:pos.x,y:pos.y,w:d.w,h:d.h,rotation:0,opacity:1,zIndex:state.elements.length,visible:true,locked:false,aspectLock:true,fit:type==='logo'?'contain':'cover',cropX:0,cropY:0,zoom:1,loop:true,muted:true};
    state.elements.push(el); normalizeZFixed(); setSelected(el.id); state.needsTextureUpdate=true; renderAssetLibrary();
  };
  $$('.add-btn').forEach(b=>b.onclick=()=>{const t=b.dataset.add;if(t==='text')return addText();pendingAddType=t;$('#media-upload').accept=t==='video'?'video/*':'image/*';$('#media-upload').click()});
  $('#media-upload').onchange=async e=>{const file=e.target.files[0];if(!file)return;const p=pendingAddType;if(p?.startsWith('replace:')){const id=p.split(':')[1],el=state.elements.find(x=>x.id===id);await addFile(file,el?.type||'image',id)}else await addFile(file,p||'image');e.target.value='';pendingAddType=null};

  duplicateSelected = function(){
    const el=selected(); if(!el) return; pushHistory(); const c=deepClone(el); c.id=uid(el.type); c.name=(el.name||el.type)+' Copy'; const p=smartSpawn(c.w,c.h); c.x=p.x;c.y=p.y;state.elements.push(c);normalizeZFixed();setSelected(c.id);state.needsTextureUpdate=true;
  };
  deleteSelected = async function(){
    const i=state.elements.findIndex(e=>e.id===state.selectedId); if(i<0) return; pushHistory(); const [gone]=state.elements.splice(i,1);normalizeZFixed();state.selectedId=null;state.needsTextureUpdate=true;renderLayers();renderProperties();if(gone.assetId)await releaseIfOrphan(gone.assetId);
  };
  $('#layer-delete').onclick=deleteSelected; $('#layer-duplicate').onclick=duplicateSelected;

  renderLayers = function(){
    const list=$('#layer-list'); if(!list) return; list.innerHTML='';
    [...state.elements].slice().reverse().forEach(el=>{
      const a=runtimeAssets.get(el.assetId); const d=document.createElement('div'); d.className='layer'+(el.id===state.selectedId?' selected':'');d.draggable=!el.locked;d.dataset.id=el.id;
      const thumb=a?.url&&el.type!=='video'?`style="width:28px;height:22px;background:url('${a.url}') center/cover;border:1px solid #332a25"`:'style="width:28px;height:22px;border:1px solid #332a25;display:grid;place-items:center"';
      d.style.gridTemplateColumns='18px 28px 1fr 26px 26px';
      d.innerHTML=`<div class="drag">⠿</div><div ${thumb}>${el.type==='text'?'T':el.type==='video'?'▶':el.type==='logo'?'◆':'▣'}</div><div class="name" title="${escapeHtml(el.name||el.type)}">${escapeHtml(el.name||el.type)} · ${escapeHtml(el.role||'')}</div><button class="icon-btn vis">${el.visible?'◉':'○'}</button><button class="icon-btn lock">${el.locked?'🔒':'◇'}</button>`;
      d.onclick=e=>{if(!e.target.closest('button'))setSelected(el.id)};
      d.querySelector('.vis').onclick=e=>{e.stopPropagation();pushHistory();el.visible=!el.visible;state.needsTextureUpdate=true;renderLayers()};
      d.querySelector('.lock').onclick=e=>{e.stopPropagation();pushHistory();el.locked=!el.locked;renderLayers();renderProperties()};
      d.ondragstart=e=>{if(el.locked){e.preventDefault();return}e.dataTransfer.setData('text/plain',el.id)};d.ondragover=e=>e.preventDefault();d.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData('text/plain');if(!from||from===el.id)return;const a=state.elements.findIndex(x=>x.id===from),b=state.elements.findIndex(x=>x.id===el.id);if(a<0||b<0)return;pushHistory();const [m]=state.elements.splice(a,1);state.elements.splice(b,0,m);normalizeZFixed();state.needsTextureUpdate=true;renderLayers()};
      list.appendChild(d);
    });
  };

  function setTextFont(el,fs){ ctx.font=`${el.fontStyle||'normal'} ${el.fontWeight||400} ${fs}px "${el.font||'Arial'}"`; }
  function measureTracked(str,spacing){ if(!spacing)return ctx.measureText(str).width; let n=0;for(const ch of str)n+=ctx.measureText(ch).width;return n+Math.max(0,str.length-1)*spacing; }
  function breakWord(word,maxW,spacing){const out=[];let line='';for(const ch of word){const t=line+ch;if(line&&measureTracked(t,spacing)>maxW){out.push(line);line=ch}else line=t}if(line)out.push(line);return out}
  function wrapTracked(text,maxW,spacing){
    const out=[]; for(const para of String(text).split('\n')){if(!para){out.push('');continue}let line='';for(const word of para.split(/\s+/)){if(measureTracked(word,spacing)>maxW){if(line){out.push(line);line=''}const chunks=breakWord(word,maxW,spacing);out.push(...chunks.slice(0,-1));line=chunks.at(-1)||'';continue}const test=line?line+' '+word:word;if(line&&measureTracked(test,spacing)>maxW){out.push(line);line=word}else line=test}out.push(line)}return out;
  }
  function drawTrackedLine(text,x,y,spacing,align){if(!spacing){ctx.fillText(text,x,y);return}const width=measureTracked(text,spacing);let xx=align==='center'?x-width/2:align==='right'?x-width:x;for(const ch of text){ctx.fillText(ch,xx,y);xx+=ctx.measureText(ch).width+spacing}}
  drawText = function(el){
    const W=texCanvas.width,H=texCanvas.height,x=el.x*W,y=el.y*H,w=el.w*W,h=el.h*H,scale=Math.min(W,H)/1080,requested=(el.fontSize||42)*scale,minFs=10*scale,baseSpacing=(el.letterSpacing||0)*scale;
    ctx.save();ctx.globalAlpha=el.opacity??1;ctx.translate(x+w/2,y+h/2);ctx.rotate((el.rotation||0)*Math.PI/180);ctx.fillStyle=el.color||'#151515';ctx.textBaseline='top';ctx.textAlign='left';
    let fs=requested,lines=[],lh=0,need=0,spacing=baseSpacing;const calc=()=>{setTextFont(el,fs);spacing=baseSpacing*(fs/requested||1);lines=wrapTracked(el.text,w*.98,spacing);lh=fs*(el.lineHeight||1.2);need=lines.length*lh};calc();
    if((el.textMode||'autoFit')==='autoFit'){while(need>h*.96&&fs>minFs){fs=Math.max(minFs,fs-2*scale);calc()}}
    if(el.textMode==='autoHeight'){const nh=clamp((need*1.08)/H,.025,.95);if(Math.abs(nh-el.h)>.002)el.h=nh}
    const overflow=need>h*.98+1;textMetrics.set(el.id,{overflow,effectiveFontSize:Math.round(fs/scale),lines:lines.length});
    let yy=-Math.min(need,h)/2,ax=el.align==='center'?0:el.align==='right'?w/2:-w/2;setTextFont(el,fs);for(const line of lines){if(yy+lh>h/2+1)break;drawTrackedLine(line,ax,yy,spacing,el.align||'left');yy+=lh}ctx.restore();
    const badge=$('#bp-overflow');if(state.selectedId===el.id&&badge)badge.style.display=overflow?'block':'none';
  };

  drawMedia = function(el){
    const a=runtimeAssets.get(el.assetId);if(!a?.node)return;const n=a.node,sw=el.type==='video'?n.videoWidth:(n.naturalWidth||n.width),sh=el.type==='video'?n.videoHeight:(n.naturalHeight||n.height);if(!sw||!sh)return;
    const W=texCanvas.width,H=texCanvas.height,x=el.x*W,y=el.y*H,w=el.w*W,h=el.h*H,z=Math.max(1,el.zoom||1),cx=el.cropX||0,cy=el.cropY||0;ctx.save();ctx.globalAlpha=el.opacity??1;ctx.translate(x+w/2,y+h/2);ctx.rotate((el.rotation||0)*Math.PI/180);ctx.beginPath();ctx.rect(-w/2,-h/2,w,h);ctx.clip();let dw=w,dh=h,sx=0,sy=0,sww=sw,shh=sh,dx=0,dy=0;
    if(el.fit==='cover'){const br=w/h,sr=sw/sh;if(sr>br){sww=sh*br;sx=(sw-sww)/2}else{shh=sw/br;sy=(sh-shh)/2}const nw=sww/z,nh=shh/z;sx+=(sww-nw)/2+cx*Math.max(0,(sw-nw)/2);sy+=(shh-nh)/2+cy*Math.max(0,(sh-nh)/2);sww=nw;shh=nh;sx=clamp(sx,0,sw-sww);sy=clamp(sy,0,sh-shh)}else if(el.fit==='contain'){const sr=sw/sh,br=w/h;if(sr>br)dh=w/sr;else dw=h*sr;dw*=z;dh*=z;dx=cx*Math.max(0,(w-dw)/2);dy=cy*Math.max(0,(h-dh)/2)}else{dw=w*z;dh=h*z;dx=cx*(w*(z-1)/2);dy=cy*(h*(z-1)/2)}ctx.drawImage(n,sx,sy,sww,shh,-dw/2+dx,-dh/2+dy,dw,dh);ctx.restore();
  };

  const baseRenderProperties=renderProperties;
  renderProperties = function(){
    baseRenderProperties(); const box=$('#properties'),el=selected();if(!box||!el)return;
    const roleRow=document.createElement('div');roleRow.className='form-group';roleRow.innerHTML=`<label>Layout role</label><select id="bp-role" class="form-control">${rolePool(el.type).map(r=>`<option value="${r}" ${r===el.role?'selected':''}>${r}</option>`).join('')}</select>`;box.insertBefore(roleRow,box.firstChild);
    $('#bp-role').onchange=()=>{if(el.locked)return;pushHistory();el.role=$('#bp-role').value;renderLayers();state.needsTextureUpdate=true};
    if(el.type==='text'){
      const wrap=document.createElement('div');wrap.innerHTML=`<div class="grid2"><div class="form-group"><label>Text sizing</label><select id="bp-textmode" class="form-control"><option value="fixed" ${el.textMode==='fixed'?'selected':''}>Fixed frame</option><option value="autoHeight" ${el.textMode==='autoHeight'?'selected':''}>Auto height</option><option value="autoFit" ${!el.textMode||el.textMode==='autoFit'?'selected':''}>Auto fit</option></select></div><div class="form-group"><label>Tracking</label><input id="bp-track" class="form-control" type="number" step="0.5" min="-5" max="30" value="${el.letterSpacing||0}"></div></div><div id="bp-overflow" class="status warn" style="display:${textMetrics.get(el.id)?.overflow?'block':'none'}">⚠ TEXT OVERFLOW · enlarge frame, reduce font size or use Auto Fit.</div>`;
      box.appendChild(wrap);$('#bp-textmode').onchange=()=>{if(el.locked)return;pushHistory();el.textMode=$('#bp-textmode').value;state.needsTextureUpdate=true};$('#bp-track').onchange=()=>{if(el.locked)return;pushHistory();el.letterSpacing=parseFloat($('#bp-track').value)||0;state.needsTextureUpdate=true};
      const ta=$('#p-text');if(ta){let armed=false;ta.onfocus=()=>armed=false;ta.oninput=()=>{if(el.locked)return;if(!armed){pushHistory();armed=true}el.text=ta.value;state.needsTextureUpdate=true};ta.onblur=()=>armed=false}
      const col=$('#p-color');if(col){let armed=false;col.onpointerdown=()=>{if(!armed&&!el.locked){pushHistory();armed=true}};col.oninput=()=>{if(!el.locked){el.color=col.value;state.needsTextureUpdate=true}};col.onchange=()=>armed=false}
    }else{
      const row=document.createElement('label');row.className='small-check';row.innerHTML=`<input id="bp-aspect" type="checkbox" ${el.aspectLock!==false?'checked':''}> Lock aspect ratio while resizing`;box.appendChild(row);$('#bp-aspect').onchange=()=>{if(el.locked)return;pushHistory();el.aspectLock=$('#bp-aspect').checked};
    }
    if(el.locked){const n=document.createElement('div');n.className='status warn';n.textContent='🔒 Layer locked. Unlock it from Layers to edit.';box.insertBefore(n,box.firstChild);box.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true)}
  };

  applyLayout = function(name=state.layout,push=true){
    if(push)pushHistory(); state.layout=name; ensureRoles(); const hero=byRole('hero')||mediaElements()[0],m1=byRole('media1'),m2=byRole('media2'),m3=byRole('media3'),logo=byRole('logo')||logoElements()[0],portrait=fmt[state.format].w<fmt[state.format].h;
    if(name==='full'){place(hero,0,0,1,1);place(logo,.05,.045,.22,.10);placeText({headline:[.07,.72,.86,.09],subheadline:[.07,.81,.86,.055],body:[.07,.865,.60,.08],price:[.07,.94,.28,.045],cta:[.62,.93,.31,.05],signature:[.70,.88,.22,.05]})}
    else if(name==='twoThird'){if(portrait){place(hero,0,0,1,.66);place(logo,.055,.035,.24,.095);placeText({headline:[.07,.70,.86,.065],subheadline:[.07,.765,.86,.045],body:[.07,.815,.86,.075],price:[.07,.905,.30,.05],cta:[.55,.90,.38,.055],signature:[.66,.83,.27,.045]})}else{place(hero,0,0,.66,1);place(logo,.04,.05,.20,.11);placeText({headline:[.70,.09,.26,.13],subheadline:[.70,.235,.26,.08],body:[.70,.34,.26,.24],price:[.70,.64,.26,.09],cta:[.70,.78,.26,.10],signature:[.70,.90,.26,.06]})}}
    else if(name==='hero3'){if(portrait){place(hero,0,0,1,.58);place(m1,0,.58,1/3,.20);place(m2,1/3,.58,1/3,.20);place(m3,2/3,.58,1/3,.20);place(logo,.055,.035,.24,.095);placeText({headline:[.07,.80,.86,.06],subheadline:[.07,.86,.86,.04],body:[.07,.90,.45,.055],price:[.07,.955,.25,.035],cta:[.58,.93,.35,.045],signature:[.68,.88,.25,.04]})}else{place(hero,0,0,.70,1);place(m1,.70,0,.30,1/3);place(m2,.70,1/3,.30,1/3);place(m3,.70,2/3,.30,1/3);place(logo,.04,.045,.20,.11);placeText({headline:[.05,.69,.56,.08],subheadline:[.05,.78,.56,.05],body:[.05,.835,.36,.09],price:[.05,.93,.20,.05],cta:[.39,.91,.24,.06],signature:[.48,.84,.15,.04]})}}
    else if(name==='fiftyV'){place(hero,0,0,.5,1);place(m1,.5,0,.5,1);place(logo,.04,.04,.20,.10);placeText({headline:[.07,.74,.36,.08],subheadline:[.07,.83,.36,.05],cta:[.07,.90,.28,.06]})}
    else if(name==='fiftyH'){place(hero,0,0,1,.5);place(m1,0,.5,1,.5);place(logo,.05,.035,.22,.10);placeText({headline:[.07,.72,.86,.07],subheadline:[.07,.80,.86,.05],cta:[.60,.90,.33,.055]})}
    else if(name==='grid2'){place(hero,0,0,.5,.5);place(m1,.5,0,.5,.5);place(m2,0,.5,.5,.5);place(m3,.5,.5,.5,.5);place(logo,.04,.04,.19,.09);placeText({headline:[.08,.82,.84,.07],cta:[.64,.91,.28,.05]})}
    else if(name==='editorialL'){place(hero,.42,0,.58,1);place(logo,.05,.06,.24,.10);placeText({headline:[.05,.22,.32,.12],subheadline:[.05,.36,.32,.08],body:[.05,.48,.32,.25],price:[.05,.77,.30,.08],cta:[.05,.88,.30,.07],signature:[.05,.95,.30,.035]})}
    else if(name==='editorialR'){place(hero,0,0,.58,1);place(logo,.66,.06,.24,.10);placeText({headline:[.63,.22,.32,.12],subheadline:[.63,.36,.32,.08],body:[.63,.48,.32,.25],price:[.63,.77,.30,.08],cta:[.63,.88,.30,.07],signature:[.63,.95,.30,.035]})}
    state.needsTextureUpdate=true;$('#layout-select').value=name;renderLayers();renderProperties();
  };
  $('#apply-layout').onclick=()=>applyLayout($('#layout-select').value,true);

  async function applyProjectFixed(p,{newId=false,history=false}={}){
    if(history)pushHistory(); state.projectId=newId?uid('project'):(p.id||uid('project'));state.projectName=p.name||'Untitled Project';state.format=fmt[p.format]?p.format:'9:16';state.layout=p.layout||'free';
    state.brand={...state.brand,...(p.brand||{})};state.fabric={...state.fabric,...(p.fabric||{})};state.elements=migrateElements(deepClone(p.elements||[]));state.selectedId=null;ensureRoles();
    if(typeof rebuildCompositor==='function')rebuildCompositor();if(typeof hydrateAssets==='function')await hydrateAssets();if(typeof rebuildCloth==='function')rebuildCloth();syncUI();renderLayers();renderProperties();state.needsTextureUpdate=true;
  }
  newProject = async function(){pushHistory();state.projectId=uid('project');state.projectName='Untitled Project';state.format='9:16';state.layout='free';state.elements=[];state.selectedId=null;if(typeof rebuildCompositor==='function')rebuildCompositor();if(typeof rebuildCloth==='function')rebuildCloth();syncUI();renderLayers();renderProperties();state.needsTextureUpdate=true;toast('Blank project')};
  openProject = async function(){const id=$('#project-select').value,p=loadArr(PROJ_KEY).find(x=>x.id===id);if(!p)return;await applyProjectFixed(p,{history:true});toast('Project opened')};
  $('#new-project').onclick=newProject;$('#open-project').onclick=openProject;

  refreshTemplates = function(){const arr=loadArr(TEMPLATE_KEY),s=$('#template-select');s.innerHTML=`<option value="builtin:lapd">Built-in · L.A.P.D. Evidence</option>`+(arr.length?arr.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join(''):'')};
  applyTemplate = async function(){const id=$('#template-select').value,t=id==='builtin:lapd'?builtInLapd:loadArr(TEMPLATE_KEY).find(x=>x.id===id);if(!t)return;await applyProjectFixed({...t,name:(t.name||'Template')+' Copy'},{newId:true,history:true});toast('Template applied')};
  $('#apply-template').onclick=applyTemplate;refreshTemplates();

  function worldFromLocal(el,u,v){const cx=el.x+el.w/2,cy=el.y+el.h/2,dx=u-cx,dy=v-cy,a=(el.rotation||0)*Math.PI/180;return{x:dx*Math.cos(a)-dy*Math.sin(a)+cx,y:dx*Math.sin(a)+dy*Math.cos(a)+cy}}
  const oldDrawSelection=drawSelection;
  drawSelection = function(){
    oldDrawSelection();if(state.mode!=='edit'||state.suppressGuides)return;const el=selected();if(!el)return;const W=texCanvas.width,H=texCanvas.height,p=worldFromLocal(el,el.x+el.w/2,el.y-.055);ctx.save();ctx.fillStyle='#0a0806';ctx.strokeStyle=state.brand?.primary||'#d4af37';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x*W,p.y*H,Math.max(8,Math.min(W,H)/120),0,Math.PI*2);ctx.fill();ctx.stroke();if(pointerAction){ctx.setLineDash([8,8]);ctx.strokeStyle='rgba(212,175,55,.4)';ctx.strokeRect(W*.04,H*.04,W*.92,H*.92)}ctx.restore();
  };
  function localPt(el,u,v){const cx=el.x+el.w/2,cy=el.y+el.h/2,dx=u-cx,dy=v-cy,a=-(el.rotation||0)*Math.PI/180;return{x:dx*Math.cos(a)-dy*Math.sin(a)+cx,y:dx*Math.sin(a)+dy*Math.cos(a)+cy}}
  nearestCorner = function(el,u,v){const p=localPt(el,u,v),cs=[['nw',el.x,el.y],['ne',el.x+el.w,el.y],['sw',el.x,el.y+el.h],['se',el.x+el.w,el.y+el.h]];let best=null,d=.0028;for(const c of cs){const dd=(p.x-c[1])**2+(p.y-c[2])**2;if(dd<d){d=dd;best=c[0]}}return best};
  function rotHit(el,u,v){const p=worldFromLocal(el,el.x+el.w/2,el.y-.055);return (u-p.x)**2+(v-p.y)**2<.0032}
  function resizeFixed(el,o,corner,uv){const p=localPt(o,uv.u,uv.v),right=o.x+o.w,bottom=o.y+o.h;let x=o.x,y=o.y,w=o.w,h=o.h;if(corner.includes('e'))w=Math.max(.03,p.x-o.x);if(corner.includes('s'))h=Math.max(.03,p.y-o.y);if(corner.includes('w')){x=Math.min(p.x,right-.03);w=right-x}if(corner.includes('n')){y=Math.min(p.y,bottom-.03);h=bottom-y}if(el.aspectLock!==false&&['image','video','logo'].includes(el.type)){const r=o.w/o.h||1,dw=Math.abs(w-o.w)/Math.max(o.w,.001),dh=Math.abs(h-o.h)/Math.max(o.h,.001);if(dw>=dh){h=w/r;if(corner.includes('n'))y=bottom-h}else{w=h*r;if(corner.includes('w'))x=right-w}}Object.assign(el,{x,y,w:Math.max(.03,w),h:Math.max(.03,h)})}

  try{container.removeEventListener('mousedown',handleDown);window.removeEventListener('mousemove',handleMove);window.removeEventListener('mouseup',handleUp);container.removeEventListener('touchstart',handleDown);window.removeEventListener('touchmove',handleMove);window.removeEventListener('touchend',handleUp)}catch{}
  handleDown = function(e){const p=posFromEvent(e);mouseX=p.x;mouseY=p.y;if(state.mode==='edit'){const uv=screenToUV(mouseX,mouseY);if(!uv)return;const cur=selected();if(cur&&!cur.locked&&rotHit(cur,uv.u,uv.v)){pushHistory();const cx=cur.x+cur.w/2,cy=cur.y+cur.h/2;pointerAction={kind:'rotate',id:cur.id,cx,cy,startAngle:Math.atan2(uv.v-cy,uv.u-cx),origRotation:cur.rotation||0};return}const corner=cur&&!cur.locked?nearestCorner(cur,uv.u,uv.v):null;if(corner){pushHistory();pointerAction={kind:'resize',id:cur.id,corner,orig:deepClone(cur)};return}const hit=hitElement(uv.u,uv.v);if(hit){setSelected(hit.id);pushHistory();pointerAction={kind:'move',id:hit.id,du:uv.u-hit.x,dv:uv.v-hit.y}}else setSelected(null)}else{grabbedParticle=findClosestParticle(mouseX,mouseY);if(grabbedParticle){cursorUI.classList.add('active');cursorUI.style.left=mouseX+'px';cursorUI.style.top=mouseY+'px'}}};
  handleMove = function(e){const p=posFromEvent(e);mouseX=p.x;mouseY=p.y;if(state.mode==='edit'&&pointerAction){if(e.cancelable)e.preventDefault();const uv=screenToUV(mouseX,mouseY),el=state.elements.find(x=>x.id===pointerAction.id);if(!uv||!el||el.locked)return;if(pointerAction.kind==='move'){el.x=uv.u-pointerAction.du;el.y=uv.v-pointerAction.dv;snapElement(el)}else if(pointerAction.kind==='resize')resizeFixed(el,pointerAction.orig,pointerAction.corner,uv);else if(pointerAction.kind==='rotate'){const a=Math.atan2(uv.v-pointerAction.cy,uv.u-pointerAction.cx);el.rotation=pointerAction.origRotation+(a-pointerAction.startAngle)*180/Math.PI}state.needsTextureUpdate=true;renderProperties()}else if(state.mode==='interact'&&grabbedParticle){if(e.cancelable)e.preventDefault()}};
  handleUp = function(){pointerAction=null;grabbedParticle=null;cursorUI.classList.remove('active');state.needsTextureUpdate=true};
  container.addEventListener('mousedown',handleDown);window.addEventListener('mousemove',handleMove,{passive:false});window.addEventListener('mouseup',handleUp);container.addEventListener('touchstart',handleDown,{passive:false});window.addEventListener('touchmove',handleMove,{passive:false});window.addEventListener('touchend',handleUp);

  $$('.mode-btn').forEach(b=>b.onclick=()=>{if(state.mode===b.dataset.mode)return;state.mode=b.dataset.mode;if(state.mode==='edit'&&typeof rebuildCloth==='function')rebuildCloth();syncUI();state.needsTextureUpdate=true});
  render = function patchedRender(){
    requestAnimationFrame(render);if(!canvas.width||!canvas.height)return;time+=.016;const anyVideo=state.elements.some(e=>e.type==='video'&&e.visible&&runtimeAssets.get(e.assetId)?.node?.readyState>=2),now=performance.now();if(state.needsTextureUpdate||(anyVideo&&now-patchedVideoTextureAt>33)){updateTexture();if(anyVideo)patchedVideoTextureAt=now}
    const aspect=canvas.width/canvas.height,proj=m4.perspective(fov,aspect,.1,100),view=m4.translation(0,0,-cameraZ);viewProj=m4.multiply(proj,view);
    if(state.mode==='interact'){
      const damp=state.fabric.damping,gravity=-.010*state.fabric.gravity*state.fabric.weight,windAmp=.00105*state.fabric.wind;for(const p of cloth.particles){if(p.pinned)continue;const wind=Math.sin(time*2.1+p.x*3.1+p.y*1.7)*windAmp;p.z+=wind;let vx=(p.x-p.oldX)*damp,vy=(p.y-p.oldY)*damp,vz=(p.z-p.oldZ)*damp;p.oldX=p.x;p.oldY=p.y;p.oldZ=p.z;p.x+=vx;p.y+=vy+gravity;p.z+=vz;if(p.z>2.5)p.z=2.5;if(p.z<-1.5)p.z=-1.5}if(grabbedParticle){const ndcX=mouseX/canvas.width*2-1,dx=ndcX*aspect*(cameraZ*Math.tan(fov/2)),dy=-(mouseY/canvas.height*2-1)*2.5;grabbedParticle.x+=(dx-grabbedParticle.x)*.22;grabbedParticle.y+=(dy-grabbedParticle.y)*.22;grabbedParticle.z+=(1.25-grabbedParticle.z)*.22}const iterations=Math.round(18+state.fabric.stiffness*20);for(let it=0;it<iterations;it++){for(const c of cloth.constraints){let dx=c.p1.x-c.p2.x,dy=c.p1.y-c.p2.y,dz=c.p1.z-c.p2.z,dist=Math.hypot(dx,dy,dz);if(!dist)continue;const stiff=clamp(c.stiffness*state.fabric.stiffness*(.55+.45*state.fabric.elasticity),.1,1),diff=((dist-c.rest)/dist)*.5*stiff,ox=dx*diff,oy=dy*diff,oz=dz*diff;if(!c.p1.pinned&&c.p1!==grabbedParticle){c.p1.x-=ox;c.p1.y-=oy;c.p1.z-=oz}if(!c.p2.pinned&&c.p2!==grabbedParticle){c.p2.x+=ox;c.p2.y+=oy;c.p2.z+=oz}}for(let x=0;x<cloth.cols;x++){const p=cloth.particles[x];p.x=cloth.startX+x*cloth.spacingX;p.y=cloth.startY;p.z=0}}}
    cloth.vNormals.forEach(n=>{n.x=n.y=n.z=0});for(let i=0;i<cloth.indices.length;i+=3){const i0=cloth.indices[i],i1=cloth.indices[i+1],i2=cloth.indices[i+2],p0=cloth.particles[i0],p1=cloth.particles[i1],p2=cloth.particles[i2],ux=p1.x-p0.x,uy=p1.y-p0.y,uz=p1.z-p0.z,vx=p2.x-p0.x,vy=p2.y-p0.y,vz=p2.z-p0.z,nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const j of [i0,i1,i2]){cloth.vNormals[j].x+=nx;cloth.vNormals[j].y+=ny;cloth.vNormals[j].z+=nz}}cloth.particles.forEach((p,i)=>{cloth.pos[i*3]=p.x;cloth.pos[i*3+1]=p.y;cloth.pos[i*3+2]=p.z;const n=cloth.vNormals[i],l=Math.hypot(n.x,n.y,n.z)||1;cloth.norm[i*3]=n.x/l;cloth.norm[i*3+1]=n.y/l;cloth.norm[i*3+2]=n.z/l});gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);gl.bufferData(gl.ARRAY_BUFFER,cloth.pos,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.normal);gl.bufferData(gl.ARRAY_BUFFER,cloth.norm,gl.DYNAMIC_DRAW);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);gl.uniformMatrix4fv(loc.matrix,false,viewProj);let lx=.45,ly=.82,lz=1,ll=Math.hypot(lx,ly,lz);gl.uniform3f(loc.light,lx/ll,ly/ll,lz/ll);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);gl.enableVertexAttribArray(loc.position);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.normal);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,buffers.texcoord);gl.enableVertexAttribArray(loc.texcoord);gl.vertexAttribPointer(loc.texcoord,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,paperTexture);gl.uniform1i(loc.texture,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.index);gl.drawElements(gl.TRIANGLES,cloth.indices.length,gl.UNSIGNED_SHORT,0);if(grabbedParticle){const sp=project3DTo2D(grabbedParticle,viewProj,canvas.width,canvas.height);if(sp){cursorUI.style.left=sp.x+'px';cursorUI.style.top=sp.y+'px'}}
  };

  state.background=state.background||{type:'solid',color:'#d1c099'};
  const bgDetails=document.createElement('details');bgDetails.innerHTML='<summary>Background</summary><div class="section-body"><div class="form-group"><label>Surface</label><select id="bp-bg-type" class="form-control"><option value="solid">Solid color</option><option value="paper">Paper preset</option><option value="transparent">Transparent</option></select></div><div class="form-group"><label>Color</label><input id="bp-bg-color" type="color" class="color-input" value="#d1c099"></div></div>';
  const brandDetails=[...document.querySelectorAll('#ui-panel details')].find(d=>d.querySelector('summary')?.textContent.trim()==='Brand Kit');if(brandDetails)brandDetails.before(bgDetails);
  const originalBasePaper=generateBasePaper;
  generateBasePaper = function(){const w=baseCanvas.width,h=baseCanvas.height;baseCtx.clearRect(0,0,w,h);if(state.background.type==='transparent')return;if(state.background.type==='solid'){baseCtx.fillStyle=state.background.color||'#d1c099';baseCtx.fillRect(0,0,w,h);return}originalBasePaper()};
  $('#bp-bg-type').value=state.background.type;$('#bp-bg-color').value=state.background.color;$('#bp-bg-type').onchange=e=>{pushHistory();state.background.type=e.target.value;generateBasePaper();state.needsTextureUpdate=true};$('#bp-bg-color').onpointerdown=()=>{if(!bgColorHistoryArmed){pushHistory();bgColorHistoryArmed=true}};$('#bp-bg-color').oninput=e=>{state.background.color=e.target.value;generateBasePaper();state.needsTextureUpdate=true};$('#bp-bg-color').onchange=()=>bgColorHistoryArmed=false;

  const brandBody=brandDetails?.querySelector('.section-body');if(brandBody){const more=document.createElement('div');more.innerHTML='<div class="grid2"><div class="form-group"><label>Accent</label><input id="bp-brand-accent" type="color" class="color-input" value="#ffffff"></div><div class="form-group"><label>Background</label><input id="bp-brand-bg" type="color" class="color-input" value="#d1c099"></div></div><div class="grid2"><div class="form-group"><label>Heading font</label><select id="bp-heading-font" class="form-control"></select></div><div class="form-group"><label>Body font</label><select id="bp-body-font" class="form-control"></select></div></div>';brandBody.insertBefore(more,brandBody.querySelector('.status.warn'));const fonts=['Arial','Georgia','Courier New','Trebuchet MS','Verdana','Times New Roman','Impact'];$('#bp-heading-font').innerHTML=fonts.map(f=>`<option>${f}</option>`).join('');$('#bp-body-font').innerHTML=fonts.map(f=>`<option>${f}</option>`).join('')}
  saveBrand = function(){const b={id:uid('brand'),name:$('#brand-name').value||'Client',primary:$('#brand-primary').value,secondary:$('#brand-secondary').value,accent:$('#bp-brand-accent')?.value||'#fff',background:$('#bp-brand-bg')?.value||'#d1c099',headingFont:$('#bp-heading-font')?.value||$('#brand-font').value,bodyFont:$('#bp-body-font')?.value||$('#brand-font').value,logoAssetIds:logoElements().map(x=>x.assetId).filter(Boolean)};const arr=loadArr(BRAND_KEY);arr.unshift(b);saveArr(BRAND_KEY,arr);refreshBrands();$('#brand-select').value=b.id;toast('Brand Kit saved · '+b.logoAssetIds.length+' logo(s)')};
  applyBrand = async function(){const b=loadArr(BRAND_KEY).find(x=>x.id===$('#brand-select').value);if(!b)return;pushHistory();state.brand={...state.brand,name:b.name,primary:b.primary,secondary:b.secondary,font:b.bodyFont||state.brand.font};state.background.color=b.background||state.background.color;textElements().forEach(t=>t.font=['headline','subheadline','price','cta'].includes(t.role)?(b.headingFont||state.brand.font):(b.bodyFont||state.brand.font));for(const aid of b.logoAssetIds||[]){if(state.elements.some(e=>e.type==='logo'&&e.assetId===aid))continue;const p=smartSpawn(.22,.10);state.elements.push({id:uid('logo'),type:'logo',name:b.name+' Logo',role:nextRole('logo'),assetId:aid,x:p.x,y:p.y,w:.22,h:.10,rotation:0,opacity:1,zIndex:state.elements.length,visible:true,locked:false,aspectLock:true,fit:'contain',cropX:0,cropY:0,zoom:1})}normalizeZFixed();await hydrateAssets();renderLayers();renderProperties();state.needsTextureUpdate=true;toast('Brand applied')};
  $('#save-brand').onclick=saveBrand;$('#apply-brand').onclick=applyBrand;

  const assetDetails=document.createElement('details');assetDetails.innerHTML='<summary>Asset Library</summary><div class="section-body"><div id="bp-assets" style="display:flex;flex-direction:column;gap:5px;max-height:170px;overflow:auto"></div><div class="status" style="margin-top:7px">Reusable IndexedDB media. Add without uploading again.</div></div>';if(brandDetails)brandDetails.after(assetDetails);
  function renderAssetLibrary(){const c=$('#bp-assets');if(!c)return;const a=getAssetMeta();c.innerHTML=a.length?a.map(m=>`<div style="display:grid;grid-template-columns:1fr auto auto;gap:5px;align-items:center;border:1px solid #2e2825;padding:5px"><div style="font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.type==='video'?'▶':m.type==='logo'?'◆':'▣'} ${escapeHtml(m.name)}</div><button class="mini-btn bp-asset-add" data-id="${m.id}" data-type="${m.type}">Add</button><button class="mini-btn danger bp-asset-del" data-id="${m.id}">×</button></div>`).join(''):'<div class="status">No reusable assets yet.</div>';$$('.bp-asset-add').forEach(b=>b.onclick=async()=>{const m=getAssetMeta().find(x=>x.id===b.dataset.id);if(!m)return;const type=m.type||'image',d=type==='logo'?{w:.22,h:.10}:{w:.38,h:.24},p=smartSpawn(d.w,d.h);pushHistory();const el={id:uid(type),type,name:m.name,role:nextRole(type),assetId:m.id,x:p.x,y:p.y,w:d.w,h:d.h,rotation:0,opacity:1,zIndex:state.elements.length,visible:true,locked:false,aspectLock:true,fit:type==='logo'?'contain':'cover',cropX:0,cropY:0,zoom:1,loop:true,muted:true};state.elements.push(el);normalizeZFixed();await hydrateAssets();setSelected(el.id);state.needsTextureUpdate=true});$$('.bp-asset-del').forEach(b=>b.onclick=async()=>{if(allReferencedAssetIds().has(b.dataset.id)){toast('Asset is still in use');return}runtimeRelease(b.dataset.id);await deleteBlob(b.dataset.id);setAssetMeta(getAssetMeta().filter(x=>x.id!==b.dataset.id));renderAssetLibrary()})}
  renderAssetLibrary();

  const exp=$('#export-png');if(exp){exp.textContent='FABRIC PNG · VIEW';const design=document.createElement('button');design.id='bp-export-design';design.className='btn-solid';design.textContent='DESIGN PNG · EXACT';exp.parentElement.insertBefore(design,exp);design.onclick=()=>{state.suppressGuides=true;state.needsTextureUpdate=true;updateTexture();const a=document.createElement('a');a.href=texCanvas.toDataURL('image/png');a.download='BANDEROLAS_PRO_DESIGN_'+state.format.replace(':','x')+'_'+Date.now()+'.png';a.click();state.suppressGuides=false;state.needsTextureUpdate=true;toast('Exact '+fmt[state.format].w+'×'+fmt[state.format].h+' PNG exported')}}
  const jsonBtn=$('#export-json');if(jsonBtn){const imp=document.createElement('button');imp.className='btn-outline';imp.textContent='IMPORT JSON';jsonBtn.parentElement.appendChild(imp);const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.style.display='none';document.body.appendChild(input);imp.onclick=()=>input.click();input.onchange=async()=>{try{const p=JSON.parse(await input.files[0].text());if(!Array.isArray(p.elements))throw new Error();await applyProjectFixed({...p,id:uid('project'),name:(p.name||'Imported')+' · Imported'},{history:true});toast('Project JSON imported')}catch{toast('Invalid project JSON')}finally{input.value=''}}}
  setInterval(()=>{try{localStorage.setItem(AUTOSAVE_KEY,JSON.stringify({...serializableProject(),projectId:state.projectId,background:state.background}))}catch{}},1800);

  (async()=>{
    let auto=null;try{auto=JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||'null')}catch{}
    if(auto&&Array.isArray(auto.elements)){await applyProjectFixed(auto);toast('Autosave recovered')}else{await newProject();undoStack=[];redoStack=[]}
    syncUI();renderLayers();renderProperties();state.needsTextureUpdate=true;
    const v=document.querySelector('.panel-header .version');if(v)v.textContent='PHASE 1 + 2 · FIX '+FIX_VERSION;
  })();
})();
