'use strict';
(() => {
  const schema=window.BanderolasSurfaceSchema;
  const manager=window.surfaceManager;
  const foundation=window.BanderolasSurfaceFoundation;
  if(!schema || !manager || !foundation) throw new Error('Paper Studio load order invalid');

  const MATERIAL_PRESETS=Object.freeze({
    native:{label:'Native / Variant authored'},
    opaque:{label:'Opaque Paper',values:{opacity:1,transparency:0,translucency:0,roughness:.34,reflection:.25,depth:.55,clearcoat:.34,iridescence:0,ior:1.5,specular:.55,backlight:0,perspective:.5,lightIntensity:1,lightX:0,lightY:0}},
    transparent:{label:'Transparent Sheet',values:{opacity:.88,transparency:.48,translucency:.14,roughness:.16,reflection:.55,depth:.52,clearcoat:.82,iridescence:.08,ior:1.5,specular:.86,backlight:.18,perspective:.56,lightIntensity:1.12,lightX:0,lightY:0}},
    translucent:{label:'Translucent / Backlit',values:{opacity:.96,transparency:.10,translucency:.58,roughness:.42,reflection:.32,depth:.58,clearcoat:.28,iridescence:.05,ior:1.48,specular:.58,backlight:.72,perspective:.52,lightIntensity:1.18,lightX:-.12,lightY:.12}},
    glass:{label:'Glass Paper',values:{opacity:.94,transparency:.20,translucency:.78,roughness:.08,reflection:.78,depth:.50,clearcoat:1,iridescence:.12,ior:1.52,specular:1,backlight:.62,perspective:.62,lightIntensity:1.28,lightX:-.18,lightY:.15}},
    washi:{label:'Soft Washi',values:{opacity:.98,transparency:.04,translucency:.30,roughness:.88,reflection:.10,depth:.67,clearcoat:0,iridescence:0,ior:1.42,specular:.24,backlight:.46,perspective:.46,lightIntensity:.92,lightX:.10,lightY:.08}},
    iridescent:{label:'Iridescent Film',values:{opacity:.96,transparency:.12,translucency:.18,roughness:.18,reflection:.52,depth:.54,clearcoat:.84,iridescence:.94,ior:1.68,specular:.92,backlight:.20,perspective:.58,lightIntensity:1.16,lightX:-.08,lightY:.10}}
  });
  const MOTION_PRESETS=Object.freeze({
    native:{label:'Native ThreeUI',values:{profile:'native',intensity:1,idle:1,inertia:0,tilt:1,float:1}},
    calm:{label:'Calm',values:{profile:'calm',intensity:.42,idle:.38,inertia:.08,tilt:.55,float:.45}},
    float:{label:'Float',values:{profile:'float',intensity:1.12,idle:1.24,inertia:.12,tilt:.68,float:1.65}},
    tilt:{label:'Tilt / Hover',values:{profile:'tilt',intensity:.82,idle:.48,inertia:.18,tilt:1.62,float:.42}},
    inertial:{label:'Inertial Spin',values:{profile:'inertial',intensity:.82,idle:.35,inertia:.74,tilt:1.18,float:.34}},
    dynamic:{label:'Dynamic',values:{profile:'dynamic',intensity:1.55,idle:1.34,inertia:.48,tilt:1.42,float:1.30}}
  });

  const sliderDefs=[
    ['opacity','Opacity',.05,1,.01],['transparency','Transparency',0,1,.01],['translucency','Translucency',0,1,.01],
    ['backlight','Backlight',0,1,.01],['roughness','Roughness',.02,1,.01],['reflection','Reflection',0,1,.01],
    ['clearcoat','Clearcoat',0,1,.01],['iridescence','Iridescence',0,1,.01],['depth','3D Depth',0,1,.01],
    ['perspective','Perspective',0,1,.01],['lightIntensity','Light intensity',.2,2,.01],['lightX','Light X',-1,1,.01],['lightY','Light Y',-1,1,.01]
  ];
  const motionDefs=[
    ['intensity','Motion intensity',0,2,.01],['idle','Idle motion',0,2,.01],['inertia','Inertia',0,1,.01],
    ['tilt','Pointer tilt',0,2,.01],['float','Float',0,2,.01]
  ];

  let historyArmed=false;
  const armHistory=()=>{if(!historyArmed && typeof pushHistory==='function'){pushHistory();historyArmed=true;}};
  const disarmHistory=()=>{historyArmed=false;};
  const pct=(v,max=1)=>max===1?Math.round(Number(v)*100)+'%':Number(v).toFixed(2);
  const ctx=()=>foundation.context();

  function nativeMaterial(variant){
    const current=schema.defaultForEngine('paper3d',variant).material;
    return {...current,...schema.paperNative(variant),preset:'native'};
  }
  function applyMaterialPreset(name){
    if(state.surface?.engine!=='paper3d') return;
    armHistory();
    const variant=state.surface.variant||'original';
    const preset=MATERIAL_PRESETS[name]||MATERIAL_PRESETS.native;
    state.surface.material=name==='native' ? nativeMaterial(variant) : {...state.surface.material,...preset.values,preset:name};
    state.surface=schema.normalize(state.surface);
    manager.setMaterial(state.surface.material,ctx());
    disarmHistory(); syncUI();
  }
  function applyMotionPreset(name){
    if(state.surface?.engine!=='paper3d') return;
    armHistory();
    const preset=MOTION_PRESETS[name]||MOTION_PRESETS.native;
    state.surface.motion={...state.surface.motion,...preset.values};
    state.surface=schema.normalize(state.surface);
    manager.setMotion(state.surface.motion,ctx());
    disarmHistory(); syncUI();
  }

  function setMaterialValue(key,value){
    if(state.surface?.engine!=='paper3d') return;
    state.surface.material={...state.surface.material,[key]:Number(value),preset:'custom'};
    state.surface=schema.normalize(state.surface);
    manager.setMaterial(state.surface.material,ctx());
    syncUI(false);
  }
  function setMotionValue(key,value){
    if(state.surface?.engine!=='paper3d') return;
    state.surface.motion={...state.surface.motion,[key]:Number(value),profile:'custom'};
    state.surface=schema.normalize(state.surface);
    manager.setMotion(state.surface.motion,ctx());
    syncUI(false);
  }
  function setSensitivity(value){
    if(state.surface?.engine!=='paper3d') return;
    state.surface.interaction={...state.surface.interaction,sensitivity:Number(value)};
    state.surface=schema.normalize(state.surface);
    manager.setInteraction(state.surface.interaction,ctx());
    syncUI(false);
  }

  function sliderHTML(prefix,key,label,min,max,step){
    return `<div class="form-group bp-paper-row"><label>${label} <span id="${prefix}-${key}-v"></span></label><input id="${prefix}-${key}" type="range" min="${min}" max="${max}" step="${step}" class="form-control" style="padding:0"></div>`;
  }

  const root=document.querySelector('#surface-foundation-controls');
  if(root && !document.querySelector('#paper3d-studio')){
    const studio=document.createElement('div'); studio.id='paper3d-studio'; studio.style.display='none';
    studio.innerHTML=`
      <div style="border-top:1px solid #332a25;margin:10px 0 9px"></div>
      <div class="mono" style="margin-bottom:7px">PAPER STUDIO · MATERIAL</div>
      <div class="form-group"><label>Material preset</label><select id="paper-material-preset" class="form-control">${Object.entries(MATERIAL_PRESETS).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('')}</select></div>
      <div id="paper-material-sliders">${sliderDefs.map(d=>sliderHTML('paper-mat',...d)).join('')}</div>
      <div class="mono" style="margin:10px 0 7px">PAPER STUDIO · MOTION</div>
      <div class="form-group"><label>Motion preset</label><select id="paper-motion-preset" class="form-control">${Object.entries(MOTION_PRESETS).map(([k,p])=>`<option value="${k}">${p.label}</option>`).join('')}</select></div>
      ${motionDefs.map(d=>sliderHTML('paper-motion',...d)).join('')}
      ${sliderHTML('paper-interaction','sensitivity','Pointer sensitivity',.25,2,.01)}
      <div id="paper-studio-status" class="status ok">PAPER STUDIO · LIVE CONTROLS READY</div>`;
    root.appendChild(studio);

    studio.querySelector('#paper-material-preset').onchange=e=>applyMaterialPreset(e.target.value);
    studio.querySelector('#paper-motion-preset').onchange=e=>applyMotionPreset(e.target.value);
    for(const [key] of sliderDefs){
      const el=studio.querySelector('#paper-mat-'+key);
      el.onpointerdown=armHistory; el.oninput=e=>setMaterialValue(key,e.target.value); el.onchange=disarmHistory;
    }
    for(const [key] of motionDefs){
      const el=studio.querySelector('#paper-motion-'+key);
      el.onpointerdown=armHistory; el.oninput=e=>setMotionValue(key,e.target.value); el.onchange=disarmHistory;
    }
    const sens=studio.querySelector('#paper-interaction-sensitivity');
    sens.onpointerdown=armHistory; sens.oninput=e=>setSensitivity(e.target.value); sens.onchange=disarmHistory;
  }

  function syncUI(full=true){
    const studio=document.querySelector('#paper3d-studio'); if(!studio) return;
    const active=state.surface?.engine==='paper3d'; studio.style.display=active?'block':'none';
    if(!active) return;
    state.surface=schema.normalize(state.surface);
    const m=state.surface.material, mo=state.surface.motion;
    const mp=document.querySelector('#paper-material-preset');
    const mop=document.querySelector('#paper-motion-preset');
    if(mp) mp.value=MATERIAL_PRESETS[m.preset]?m.preset:'native';
    if(mop) mop.value=MOTION_PRESETS[mo.profile]?mo.profile:'native';
    for(const [key,,min,max] of sliderDefs){
      const el=document.querySelector('#paper-mat-'+key), out=document.querySelector('#paper-mat-'+key+'-v');
      if(el && full) el.value=m[key];
      if(out) out.textContent=(key==='lightIntensity'||key==='lightX'||key==='lightY')?Number(m[key]).toFixed(2):pct(m[key],max);
    }
    for(const [key,,min,max] of motionDefs){
      const el=document.querySelector('#paper-motion-'+key), out=document.querySelector('#paper-motion-'+key+'-v');
      if(el && full) el.value=mo[key]; if(out) out.textContent=pct(mo[key],max);
    }
    const sens=document.querySelector('#paper-interaction-sensitivity'), sensV=document.querySelector('#paper-interaction-sensitivity-v');
    if(sens && full) sens.value=state.surface.interaction.sensitivity;
    if(sensV) sensV.textContent=Number(state.surface.interaction.sensitivity).toFixed(2)+'×';
    const status=document.querySelector('#paper-studio-status');
    if(status) status.textContent=`${String(state.surface.variant||'original').toUpperCase()} · ${String(m.preset||'native').toUpperCase()} · ${String(mo.profile||'native').toUpperCase()} · LIVE`;
  }

  document.querySelector('#surface-engine')?.addEventListener('change',()=>setTimeout(()=>syncUI(),0));
  document.querySelector('#surface-variant')?.addEventListener('change',()=>setTimeout(()=>syncUI(),0));
  window.addEventListener('focus',()=>syncUI());

  window.BanderolasPaperStudio=Object.freeze({syncUI,applyMaterialPreset,applyMotionPreset,MATERIAL_PRESETS,MOTION_PRESETS});
  syncUI();
})();
