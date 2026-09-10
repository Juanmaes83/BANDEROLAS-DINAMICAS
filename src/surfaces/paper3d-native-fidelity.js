'use strict';
(() => {
  const schema=window.BanderolasSurfaceSchema;
  const foundation=window.BanderolasSurfaceFoundation;
  const studio=window.BanderolasPaperStudio;
  const paper=window.BanderolasPaper3D?.adapter;
  if(!schema || !foundation || !paper) throw new Error('Paper Native Fidelity load order invalid');

  const canvas=document.createElement('canvas');
  canvas.id='paper3d-transparent-content-canvas';
  const c=canvas.getContext('2d',{alpha:true});
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

  function ensureSize(){
    const source=typeof texCanvas!=='undefined'?texCanvas:null;
    const w=source?.width||1080, h=source?.height||1920;
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
  }

  function drawMedia(el){
    if(typeof runtimeAssets==='undefined') return;
    const asset=runtimeAssets.get(el.assetId); if(!asset?.node) return;
    const n=asset.node;
    const sw=el.type==='video'?n.videoWidth:(n.naturalWidth||n.width);
    const sh=el.type==='video'?n.videoHeight:(n.naturalHeight||n.height);
    if(!sw||!sh) return;
    const W=canvas.width,H=canvas.height,x=el.x*W,y=el.y*H,w=el.w*W,h=el.h*H;
    const z=Math.max(1,Number(el.zoom)||1), cx=Number(el.cropX)||0, cy=Number(el.cropY)||0;
    c.save(); c.globalAlpha=el.opacity??1; c.translate(x+w/2,y+h/2); c.rotate((el.rotation||0)*Math.PI/180);
    c.beginPath(); c.rect(-w/2,-h/2,w,h); c.clip();
    let dw=w,dh=h,sx=0,sy=0,sww=sw,shh=sh,dx=0,dy=0;
    if(el.fit==='cover'){
      const br=w/h,sr=sw/sh;
      if(sr>br){sww=sh*br;sx=(sw-sww)/2}else{shh=sw/br;sy=(sh-shh)/2}
      const nw=sww/z,nh=shh/z;
      sx+=(sww-nw)/2+cx*Math.max(0,(sw-nw)/2);
      sy+=(shh-nh)/2+cy*Math.max(0,(sh-nh)/2);
      sww=nw;shh=nh;sx=clamp(sx,0,sw-sww);sy=clamp(sy,0,sh-shh);
    }else if(el.fit==='contain'){
      const sr=sw/sh,br=w/h;
      if(sr>br) dh=w/sr; else dw=h*sr;
      dw*=z;dh*=z;dx=cx*Math.max(0,(w-dw)/2);dy=cy*Math.max(0,(h-dh)/2);
    }else{
      dw=w*z;dh=h*z;dx=cx*(w*(z-1)/2);dy=cy*(h*(z-1)/2);
    }
    c.drawImage(n,sx,sy,sww,shh,-dw/2+dx,-dh/2+dy,dw,dh);
    c.restore();
  }

  function setFont(el,fs){c.font=`${el.fontStyle||'normal'} ${el.fontWeight||400} ${fs}px "${el.font||'Arial'}"`;}
  function measureTracked(text,spacing){
    if(!spacing) return c.measureText(text).width;
    let width=0; for(const ch of String(text)) width+=c.measureText(ch).width;
    return width+Math.max(0,String(text).length-1)*spacing;
  }
  function breakWord(word,maxW,spacing){
    const out=[];let line='';
    for(const ch of word){const test=line+ch;if(line&&measureTracked(test,spacing)>maxW){out.push(line);line=ch}else line=test;}
    if(line)out.push(line); return out;
  }
  function wrapTracked(text,maxW,spacing){
    const out=[];
    for(const para of String(text??'').split('\n')){
      if(!para){out.push('');continue;}
      let line='';
      for(const word of para.split(/\s+/)){
        if(measureTracked(word,spacing)>maxW){
          if(line){out.push(line);line='';}
          const chunks=breakWord(word,maxW,spacing);out.push(...chunks.slice(0,-1));line=chunks.at(-1)||'';continue;
        }
        const test=line?line+' '+word:word;
        if(line&&measureTracked(test,spacing)>maxW){out.push(line);line=word}else line=test;
      }
      out.push(line);
    }
    return out;
  }
  function drawTrackedLine(text,x,y,spacing,align){
    if(!spacing){c.textAlign=align;c.fillText(text,x,y);return;}
    c.textAlign='left'; const width=measureTracked(text,spacing);
    let xx=align==='center'?x-width/2:align==='right'?x-width:x;
    for(const ch of text){c.fillText(ch,xx,y);xx+=c.measureText(ch).width+spacing;}
  }
  function drawText(el){
    const W=canvas.width,H=canvas.height,x=el.x*W,y=el.y*H,w=el.w*W,h=el.h*H;
    const scale=Math.min(W,H)/1080,requested=Math.max(1,(el.fontSize||42)*scale),minFs=10*scale;
    const baseSpacing=(el.letterSpacing||0)*scale;
    c.save();c.globalAlpha=el.opacity??1;c.translate(x+w/2,y+h/2);c.rotate((el.rotation||0)*Math.PI/180);
    c.fillStyle=el.color||'#151515';c.textBaseline='top';
    let fs=requested,lines=[],lh=0,need=0,spacing=baseSpacing;
    const calc=()=>{setFont(el,fs);spacing=baseSpacing*(fs/requested||1);lines=wrapTracked(el.text,w*.98,spacing);lh=fs*(el.lineHeight||1.2);need=lines.length*lh;};
    calc();
    if((el.textMode||'autoFit')==='autoFit') while(need>h*.96&&fs>minFs){fs=Math.max(minFs,fs-2*scale);calc();}
    let yy=-Math.min(need,h)/2;
    const align=el.align||'left', ax=align==='center'?0:align==='right'?w/2:-w/2;
    setFont(el,fs);
    for(const line of lines){if(yy+lh>h/2+1)break;drawTrackedLine(line,ax,yy,spacing,align);yy+=lh;}
    c.restore();
  }

  function render(){
    ensureSize();
    c.clearRect(0,0,canvas.width,canvas.height);
    const elements=[...(state.elements||[])].sort((a,b)=>(a.zIndex||0)-(b.zIndex||0));
    for(const el of elements){
      if(el.visible===false) continue;
      if(el.type==='text') drawText(el); else if(['image','video','logo'].includes(el.type)) drawMedia(el);
    }
    return canvas;
  }

  const originalPushTexture=paper.pushTextureFrame;
  if(!paper.__nativeFidelityWrapped){
    paper.pushTextureFrame=async function(force=false){
      const normalized=schema.normalize(state.surface||{});
      const mode=normalized.content?.mode||'native-content';
      this.textureCanvas=mode==='full-bleed' ? foundation.context().texture : render();
      return originalPushTexture.call(this,force);
    };
    paper.__nativeFidelityWrapped=true;
  }

  function applyContentPatch(patch,history=true){
    if(state.surface?.engine!=='paper3d') return;
    if(history && typeof pushHistory==='function') pushHistory();
    state.surface=schema.normalize({...state.surface,content:{...(state.surface.content||{}),...patch}});
    paper.pushControls();
    paper.pushTextureFrame(true);
    syncUI();
  }

  const paperStudio=document.querySelector('#paper3d-studio');
  if(paperStudio && !document.querySelector('#paper-native-fidelity')){
    const box=document.createElement('div');
    box.id='paper-native-fidelity';
    box.innerHTML=`
      <div style="border-top:1px solid #332a25;margin:10px 0 9px"></div>
      <div class="mono" style="margin-bottom:7px">NATIVE FIDELITY · CONTENT</div>
      <div class="form-group"><label>Content mode</label><select id="paper-content-mode" class="form-control">
        <option value="native-content">Native + Content · recommended</option>
        <option value="native-layout">Native Safe Layout</option>
        <option value="full-bleed">Full Bleed · replace artwork</option>
      </select></div>
      <div class="form-group"><label>Content opacity <span id="paper-content-opacity-v"></span></label><input id="paper-content-opacity" type="range" min="0" max="1" step="0.01" class="form-control" style="padding:0"></div>
      <div class="form-group" id="paper-safe-inset-row"><label>Native safe inset <span id="paper-safe-inset-v"></span></label><input id="paper-safe-inset" type="range" min="0" max="0.24" step="0.01" class="form-control" style="padding:0"></div>
      <div id="paper-native-fidelity-status" class="status ok">NATIVE SHELL · exact ThreeUI design + BANDEROLAS content</div>`;
    paperStudio.insertBefore(box,paperStudio.firstChild);
    box.querySelector('#paper-content-mode').onchange=e=>applyContentPatch({mode:e.target.value});
    let armed=false;
    const arm=()=>{if(!armed&&typeof pushHistory==='function'){pushHistory();armed=true;}};
    const disarm=()=>{armed=false;};
    const opacity=box.querySelector('#paper-content-opacity');
    opacity.onpointerdown=arm;opacity.oninput=e=>applyContentPatch({opacity:Number(e.target.value)},false);opacity.onchange=disarm;
    const inset=box.querySelector('#paper-safe-inset');
    inset.onpointerdown=arm;inset.oninput=e=>applyContentPatch({safeInset:Number(e.target.value)},false);inset.onchange=disarm;
  }

  const nativeOption=document.querySelector('#paper-material-preset option[value="native"]');
  if(nativeOption) nativeOption.textContent='Native / EXACT ThreeUI · no overrides';

  function syncUI(){
    const active=state.surface?.engine==='paper3d';
    const box=document.querySelector('#paper-native-fidelity');if(!box)return;
    box.style.display=active?'block':'none';if(!active)return;
    state.surface=schema.normalize(state.surface);
    const cfg=state.surface.content;
    const mode=document.querySelector('#paper-content-mode'),opacity=document.querySelector('#paper-content-opacity'),inset=document.querySelector('#paper-safe-inset');
    if(mode)mode.value=cfg.mode;if(opacity)opacity.value=cfg.opacity;if(inset)inset.value=cfg.safeInset;
    const ov=document.querySelector('#paper-content-opacity-v'),iv=document.querySelector('#paper-safe-inset-v');
    if(ov)ov.textContent=Math.round(cfg.opacity*100)+'%';if(iv)iv.textContent=Math.round(cfg.safeInset*100)+'%';
    const insetRow=document.querySelector('#paper-safe-inset-row');if(insetRow)insetRow.style.display=cfg.mode==='native-layout'?'block':'none';
    const status=document.querySelector('#paper-native-fidelity-status');
    if(status){
      const variant=String(state.surface.variant||'original').toUpperCase();
      const modeLabel=cfg.mode==='full-bleed'?'FULL BLEED REPLACEMENT':cfg.mode==='native-layout'?'NATIVE SAFE LAYOUT':'NATIVE + CONTENT';
      status.textContent=`${variant} · ${modeLabel} · NON-TEXT THREEUI ART PRESERVED`;
    }
    if(studio?.syncUI) studio.syncUI();
  }

  document.querySelector('#surface-engine')?.addEventListener('change',()=>setTimeout(syncUI,0));
  document.querySelector('#surface-variant')?.addEventListener('change',()=>setTimeout(()=>{paper.pushTextureFrame(true);syncUI();},0));
  window.addEventListener('focus',syncUI);

  window.BanderolasPaperNativeFidelity=Object.freeze({canvas,render,applyContentPatch,syncUI});
  render();
  paper.pushControls();
  paper.pushTextureFrame(true);
  syncUI();
})();
