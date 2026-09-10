'use strict';
(() => {
  const FIX_VERSION = '6.0';

  // FIX 6 deliberately DOES NOT replace the render loop.
  // It restores the already-working Phase 1+2 interact path and removes
  // the broken FIX 5 render override from the review build.

  function mark(){ state.needsTextureUpdate = true; }

  // Restore a generous particle hit radius. The original implementation used
  // a direct nearest-particle grab; keep that behavior in FABRIC / INTERACT.
  findClosestParticle = function(sx, sy){
    let best = null;
    let minDistSq = 6400; // 80 px radius; easier on mouse and touch.
    for(const p of cloth.particles){
      if(p.pinned) continue;
      const q = project3DTo2D(p, viewProj, canvas.width, canvas.height);
      if(!q) continue;
      const dx = q.x - sx, dy = q.y - sy;
      const d = dx*dx + dy*dy;
      if(d < minDistSq){ minDistSq = d; best = p; }
    }
    return best;
  };

  // Keep the existing Phase 1+2 pointer handlers. They already contain the
  // correct split: edit manipulates layers; interact grabs cloth particles.
  // Only redefine mode switching so it never rebuilds the cloth on toggle.
  $$('.mode-btn').forEach(btn => {
    btn.onclick = () => {
      const next = btn.dataset.mode;
      if(next !== 'edit' && next !== 'interact') return;
      state.mode = next;
      pointerAction = null;
      grabbedParticle = null;
      guideLines = [];
      cursorUI.classList.remove('active');
      syncUI();
      mark();
    };
  });

  // Make FABRIC / INTERACT the default review state, matching the original
  // product's immediate grab-and-stretch behavior.
  state.mode = 'interact';
  state.selectedId = null;
  pointerAction = null;
  grabbedParticle = null;
  guideLines = [];
  syncUI();
  mark();

  const hint = document.querySelector('#mode-hint');
  if(hint) hint.textContent = 'FABRIC / INTERACT · mantén pulsado sobre la tela y arrastra para estirar';

  const buttons = $$('.mode-btn');
  buttons.forEach(b => {
    if(b.dataset.mode === 'edit') b.textContent = 'EDIT CONTENT';
    if(b.dataset.mode === 'interact') b.textContent = 'FABRIC / INTERACT';
  });

  const version = document.querySelector('.panel-header .version');
  if(version) version.textContent = 'FIX ' + FIX_VERSION + ' · ORIGINAL GRAB PATH';

  // Small diagnostic badge for human validation. It is removed after the first
  // successful grab so it cannot become part of exports or the final product.
  const diagnostic = document.createElement('div');
  diagnostic.id = 'fix6-diagnostic';
  diagnostic.style.cssText = 'position:absolute;left:24px;bottom:54px;z-index:8;padding:7px 9px;background:rgba(0,0,0,.72);border:1px solid rgba(212,175,55,.38);color:#d7c58e;font:9px ui-monospace,monospace;letter-spacing:.8px;pointer-events:none';
  diagnostic.textContent = 'GRAB READY · pulsa y arrastra cualquier zona de la tela';
  container.appendChild(diagnostic);

  // Observe the shared grabbedParticle state without adding another pointer
  // handler. This proves the existing handler is actually acquiring a particle.
  let seenGrab = false;
  function watchGrab(){
    if(!seenGrab && grabbedParticle){
      seenGrab = true;
      diagnostic.textContent = 'GRAB OK · partícula capturada';
      diagnostic.style.borderColor = 'rgba(106,182,122,.8)';
      setTimeout(() => diagnostic.remove(), 1200);
    }
    requestAnimationFrame(watchGrab);
  }
  requestAnimationFrame(watchGrab);
})();
