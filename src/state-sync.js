'use strict';
(() => {
  const oldSerializableProject = serializableProject;
  serializableProject = function(){
    const p = oldSerializableProject();
    p.schemaVersion = 3;
    p.id = state.projectId;
    p.background = deepClone(state.background || {type:'solid',color:'#d1c099'});
    p.updatedAt = new Date().toISOString();
    return p;
  };

  const oldSyncUI = syncUI;
  syncUI = function(){
    oldSyncUI();
    if(document.querySelector('#bp-bg-type')) $('#bp-bg-type').value = state.background?.type || 'solid';
    if(document.querySelector('#bp-bg-color')) $('#bp-bg-color').value = state.background?.color || '#d1c099';
    const version=document.querySelector('.panel-header .version');if(version)version.textContent='PHASE 1 + 2 · FIX 3.3';
  };

  const oldOpenProject = openProject;
  openProject = async function(){
    const id=$('#project-select').value, p=loadArr(PROJ_KEY).find(x=>x.id===id);
    await oldOpenProject();
    if(p?.background){state.background=deepClone(p.background);generateBasePaper();state.needsTextureUpdate=true;syncUI()}
  };
  $('#open-project').onclick=openProject;

  const oldApplyTemplate = applyTemplate;
  applyTemplate = async function(){
    const id=$('#template-select').value;
    const saved=id==='builtin:lapd'?null:loadArr(TEMPLATE_KEY).find(x=>x.id===id);
    await oldApplyTemplate();
    if(id==='builtin:lapd') state.background={type:'paper',color:'#d1c099'};
    else if(saved?.background) state.background=deepClone(saved.background);
    generateBasePaper();state.needsTextureUpdate=true;syncUI();
  };
  $('#apply-template').onclick=applyTemplate;

  const oldApplyBrand = applyBrand;
  applyBrand = async function(){
    const b=loadArr(BRAND_KEY).find(x=>x.id===$('#brand-select').value);
    await oldApplyBrand();
    if(!b)return;
    if($('#bp-brand-accent'))$('#bp-brand-accent').value=b.accent||'#ffffff';
    if($('#bp-brand-bg'))$('#bp-brand-bg').value=b.background||'#d1c099';
    if($('#bp-heading-font'))$('#bp-heading-font').value=b.headingFont||b.font||'Arial';
    if($('#bp-body-font'))$('#bp-body-font').value=b.bodyFont||b.font||'Arial';
    syncUI();
  };
  $('#apply-brand').onclick=applyBrand;

  try{
    const auto=JSON.parse(localStorage.getItem('banderolas-pro-autosave-v3')||'null');
    if(auto?.background){state.background=deepClone(auto.background);generateBasePaper();state.needsTextureUpdate=true}
  }catch{}
  window.addEventListener('beforeunload',()=>{try{localStorage.setItem('banderolas-pro-autosave-v3',JSON.stringify(serializableProject()))}catch{}});
  syncUI();
})();
