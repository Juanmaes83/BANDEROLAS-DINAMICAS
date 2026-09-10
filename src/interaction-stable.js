'use strict';
(() => {
  const DEFAULT_GRIP_RADIUS = 80;
  const mark = () => { state.needsTextureUpdate = true; };

  // Stable production grab path. Do not replace render() or the Verlet integrator here.
  findClosestParticle = function(sx, sy){
    let best = null;
    let minDistSq = DEFAULT_GRIP_RADIUS * DEFAULT_GRIP_RADIUS;
    for(const p of cloth.particles){
      if(p.pinned) continue;
      const q = project3DTo2D(p, viewProj, canvas.width, canvas.height);
      if(!q) continue;
      const dx = q.x - sx, dy = q.y - sy, d = dx*dx + dy*dy;
      if(d < minDistSq){ minDistSq = d; best = p; }
    }
    return best;
  };

  // Mode switching only changes pointer intent/UI. It never rebuilds or replaces cloth physics.
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
    if(btn.dataset.mode === 'edit') btn.textContent = 'EDIT CONTENT';
    if(btn.dataset.mode === 'interact') btn.textContent = 'FABRIC / INTERACT';
  });

  // Production opens ready to grab/stretch, matching the original product behavior.
  state.mode = 'interact';
  state.selectedId = null;
  pointerAction = null;
  grabbedParticle = null;
  guideLines = [];
  syncUI();
  mark();

  const hint = document.querySelector('#mode-hint');
  if(hint) hint.textContent = 'FABRIC / INTERACT · mantén pulsado sobre la tela y arrastra para estirar';
})();