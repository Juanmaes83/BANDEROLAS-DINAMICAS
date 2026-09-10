'use strict';
(() => {
  const schema = window.BanderolasSurfaceSchema;
  const manager = window.surfaceManager;
  if(!schema || !manager) throw new Error('Surface foundation load order invalid');

  const DEFAULT = () => schema.normalize({
    engine: 'classic',
    variant: 'default',
    interaction: {gripRadius: Number(state.interaction?.gripRadius || 80), sensitivity: 1}
  });

  const context = () => ({
    state,
    canvas,
    cloth,
    texture: typeof texCanvas !== 'undefined' ? texCanvas : null,
    format: state.format
  });

  function ensureSurface(value = state.surface){
    state.surface = schema.normalize(value || DEFAULT());
    state.surface.engine = 'classic';
    state.surface.variant = 'default';
    return state.surface;
  }

  const classicFabricAdapter = {
    id: 'classic',
    label: 'Classic Fabric / Verlet',
    mounted: false,
    mount(){
      // Deliberately non-destructive: do not touch render(), constraints,
      // requestAnimationFrame, pointer listeners or grabbedParticle.
      this.mounted = true;
    },
    unmount(){
      // Classic remains the protected fallback. No renderer teardown in 4.1.
      this.mounted = false;
    },
    setTexture(){ /* existing WebGL texture upload path remains authoritative */ },
    setFormat(){ /* existing rebuildCompositor/rebuildCloth path remains authoritative */ },
    setMaterial(){ /* Classic appearance remains governed by the validated shader */ },
    setMotion(){ /* Classic wind/gravity/stiffness remain governed by state.fabric */ },
    setInteraction(value){
      const grip = Math.max(40, Math.min(140, Number(value?.gripRadius || 80)));
      state.interaction = state.interaction || {};
      state.interaction.gripRadius = grip;
      if(state.surface?.interaction) state.surface.interaction.gripRadius = grip;
    },
    diagnostics(){
      return {mounted:this.mounted, renderer:'existing-webgl-verlet', destructiveOverrides:false};
    }
  };

  manager.register('classic', classicFabricAdapter);
  ensureSurface();
  state.surface = manager.sync(state.surface, context());

  // ---- Persistence bridge -------------------------------------------------
  // Save/Template/JSON call serializableProject dynamically, so adding surface
  // here automatically propagates to those outputs without modifying the core.
  if(!window.__bpSurfaceSerializableWrapped){
    const baseSerializableProject = serializableProject;
    serializableProject = function(){
      const p = baseSerializableProject();
      p.surface = schema.clone(ensureSurface());
      p.surfaceSchemaVersion = schema.VERSION;
      return p;
    };
    window.__bpSurfaceSerializableWrapped = true;
  }

  if(!window.__bpSurfaceHistoryWrapped){
    const baseSnapshot = snapshot;
    snapshot = function(){
      const s = baseSnapshot();
      s.surface = schema.clone(ensureSurface());
      return s;
    };

    const baseRestoreSnapshot = restoreSnapshot;
    restoreSnapshot = async function(s){
      await baseRestoreSnapshot(s);
      state.surface = schema.normalize(s?.surface || state.surface || DEFAULT());
      state.surface = manager.sync(state.surface, context());
      syncSurfaceUI();
    };
    window.__bpSurfaceHistoryWrapped = true;
  }

  const readLocal = key => {
    try{return JSON.parse(localStorage.getItem(key) || '[]')}catch{return []}
  };

  if(!window.__bpSurfaceProjectWrapped){
    const baseOpenProject = openProject;
    openProject = async function(){
      const id = document.querySelector('#project-select')?.value;
      const p = readLocal('banderolas-pro-projects-v2').find(x => x.id === id);
      await baseOpenProject();
      state.surface = schema.normalize(p?.surface || DEFAULT());
      state.surface = manager.sync(state.surface, context());
      syncSurfaceUI();
    };
    const openBtn = document.querySelector('#open-project');
    if(openBtn) openBtn.onclick = openProject;

    const baseApplyTemplate = applyTemplate;
    applyTemplate = async function(){
      const id = document.querySelector('#template-select')?.value;
      const t = id === 'builtin:lapd' ? null : readLocal('banderolas-pro-templates-v2').find(x => x.id === id);
      await baseApplyTemplate();
      state.surface = schema.normalize(t?.surface || DEFAULT());
      state.surface = manager.sync(state.surface, context());
      syncSurfaceUI();
    };
    const templateBtn = document.querySelector('#apply-template');
    if(templateBtn) templateBtn.onclick = applyTemplate;

    const baseNewProject = newProject;
    newProject = async function(){
      await baseNewProject();
      state.surface = DEFAULT();
      state.surface = manager.sync(state.surface, context());
      syncSurfaceUI();
    };
    const newBtn = document.querySelector('#new-project');
    if(newBtn) newBtn.onclick = newProject;

    window.__bpSurfaceProjectWrapped = true;
  }

  // Portable JSON import is implemented inside production.js' closure. Wrap
  // its input handler so the original import completes first, then restore the
  // surface block from the same file.
  const jsonInput = document.querySelector('#p3-json-input');
  if(jsonInput && jsonInput.onchange && !jsonInput.dataset.surfaceWrapped){
    const baseImport = jsonInput.onchange;
    jsonInput.onchange = async function(ev){
      const file = this.files?.[0];
      let importedSurface = null;
      if(file){
        try{
          const payload = JSON.parse(await file.text());
          importedSurface = payload?.project?.surface || payload?.surface || null;
        }catch{}
      }
      await baseImport.call(this, ev);
      state.surface = schema.normalize(importedSurface || state.surface || DEFAULT());
      state.surface = manager.sync(state.surface, context());
      syncSurfaceUI();
    };
    jsonInput.dataset.surfaceWrapped = '1';
  }

  const recover = document.querySelector('#fix4-recover');
  if(recover?.onclick && !recover.dataset.surfaceWrapped){
    const baseRecover = recover.onclick;
    recover.onclick = async function(ev){
      let recovered = null;
      try{recovered = JSON.parse(localStorage.getItem('banderolas-pro-autosave-v3') || 'null')?.surface || null}catch{}
      await baseRecover.call(this, ev);
      state.surface = schema.normalize(recovered || state.surface || DEFAULT());
      state.surface = manager.sync(state.surface, context());
      syncSurfaceUI();
    };
    recover.dataset.surfaceWrapped = '1';
  }

  // ---- Single-panel Surface / 3D UI --------------------------------------
  let surfaceDetails = [...document.querySelectorAll('#ui-panel details')].find(d =>
    d.querySelector('summary')?.textContent.trim().toLowerCase().startsWith('premium interaction')
  );

  if(surfaceDetails){
    surfaceDetails.open = true;
    const summary = surfaceDetails.querySelector('summary');
    if(summary) summary.textContent = 'Surface / 3D';
    const body = surfaceDetails.querySelector('.section-body');
    if(body && !document.querySelector('#surface-foundation-controls')){
      const controls = document.createElement('div');
      controls.id = 'surface-foundation-controls';
      controls.innerHTML = `
        <div class="form-group">
          <label>Surface Engine</label>
          <select id="surface-engine" class="form-control">
            <option value="classic">Classic Fabric / Verlet</option>
            <option value="paper3d" disabled>3D Paper · next</option>
            <option value="woven" disabled>Woven Cloth · source lock pending</option>
          </select>
        </div>
        <div class="form-group">
          <label>Variant</label>
          <select id="surface-variant" class="form-control" disabled><option value="default">Default</option></select>
        </div>
        <div id="surface-foundation-status" class="status ok">FOUNDATION 4.1 · Classic adapter active · renderer protected</div>
        <div style="height:8px"></div>`;
      body.insertBefore(controls, body.firstChild);

      const engine = controls.querySelector('#surface-engine');
      engine.onchange = () => {
        const requested = engine.value;
        const normalized = schema.normalize({...state.surface, engine: requested});
        state.surface = manager.sync(normalized, context());
        engine.value = state.surface.engine;
        syncSurfaceUI();
      };
    }
  }

  const grip = document.querySelector('#p8-grip');
  if(grip && !grip.dataset.surfaceWrapped){
    const baseGrip = grip.oninput;
    grip.oninput = ev => {
      if(baseGrip) baseGrip.call(grip, ev);
      ensureSurface();
      state.surface.interaction.gripRadius = Math.max(40, Math.min(140, Number(ev.target.value || 80)));
      manager.setInteraction(state.surface.interaction, context());
      const v = document.querySelector('#p8-grip-v');
      if(v) v.textContent = state.surface.interaction.gripRadius + 'px';
    };
    grip.dataset.surfaceWrapped = '1';
  }

  function syncSurfaceUI(){
    ensureSurface();
    const engine = document.querySelector('#surface-engine');
    const variant = document.querySelector('#surface-variant');
    const gripInput = document.querySelector('#p8-grip');
    const gripValue = document.querySelector('#p8-grip-v');
    if(engine) engine.value = state.surface.engine;
    if(variant) variant.value = state.surface.variant || 'default';
    if(gripInput) gripInput.value = state.surface.interaction.gripRadius;
    if(gripValue) gripValue.textContent = state.surface.interaction.gripRadius + 'px';
    const status = document.querySelector('#surface-foundation-status');
    if(status) status.textContent = `FOUNDATION 4.1 · ${manager.activeId === 'classic' ? 'Classic adapter active' : manager.activeId} · renderer protected`;
  }

  function runFoundationCheck(){
    const beforeCanvas = document.querySelectorAll('#glcanvas').length;
    const beforePanel = document.querySelectorAll('#ui-panel').length;
    for(let i=0;i<20;i++) manager.use('classic', context());
    state.surface = manager.sync(state.surface, context());
    const serialized = serializableProject();
    const result = {
      pass: manager.activeId === 'classic' &&
        manager.has('classic') &&
        beforeCanvas === 1 && document.querySelectorAll('#glcanvas').length === 1 &&
        beforePanel === 1 && document.querySelectorAll('#ui-panel').length === 1 &&
        serialized?.surface?.engine === 'classic',
      engine: manager.activeId,
      serializedSurface: serialized?.surface || null,
      canvasCount: document.querySelectorAll('#glcanvas').length,
      panelCount: document.querySelectorAll('#ui-panel').length,
      manager: manager.diagnostics(),
      adapter: classicFabricAdapter.diagnostics()
    };
    const status = document.querySelector('#surface-foundation-status');
    if(status){
      status.classList.toggle('ok', result.pass);
      status.classList.toggle('warn', !result.pass);
      status.textContent = result.pass ? 'FOUNDATION 4.1 PASS · 20× engine cycle · one canvas · one panel · surface serializes' : 'FOUNDATION 4.1 CHECK FAILED · inspect console';
    }
    console.info('[BANDEROLAS] Surface Foundation 4.1', result);
    return result;
  }

  window.BanderolasSurfaceFoundation = Object.freeze({
    ensureSurface,
    sync: () => { state.surface = manager.sync(ensureSurface(), context()); syncSurfaceUI(); return state.surface; },
    check: runFoundationCheck
  });

  syncSurfaceUI();
  const initialCheck = runFoundationCheck();
  const version = document.querySelector('.panel-header .version');
  if(version) version.textContent = 'PHASE 4.1 · SURFACE FOUNDATION';
  try{toast(initialCheck.pass ? 'PHASE 4.1 loaded · Classic physics protected' : 'PHASE 4.1 needs inspection')}catch{}
})();
