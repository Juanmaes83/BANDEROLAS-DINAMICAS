'use strict';
(() => {
  const FIX_VERSION='5.0';
  let lastVideoTextureAt=0;

  const previousSyncUI=syncUI;
  syncUI=function(){
    previousSyncUI();
    const hint=document.querySelector('#mode-hint');
    if(hint) hint.textContent=state.mode==='edit'
      ? 'EDIT CONTENT · edita capas · cambia a FABRIC / INTERACT para agarrar cualquier punto'
      : 'FABRIC / INTERACT · agarra, arrastra y estira cualquier punto de la tela';
    const version=document.querySelector('.panel-header .version');
    if(version) version.textContent='FIX '+FIX_VERSION+' · PHYSICS RESTORED';
  };

  findClosestParticle=function(sx,sy){
    let best=null,d=6400;
    for(const p of cloth.particles){
      if(p.pinned) continue;
      const q=project3DTo2D(p,viewProj,canvas.width,canvas.height);
      if(!q) continue;
      const dd=(q.x-sx)**2+(q.y-sy)**2;
      if(dd<d){d=dd;best=p}
    }
    return best;
  };

  $$('.mode-btn').forEach(b=>b.onclick=()=>{
    if(state.mode===b.dataset.mode) return;
    state.mode=b.dataset.mode;
    pointerAction=null;
    grabbedParticle=null;
    guideLines=[];
    cursorUI.classList.remove('active');
    syncUI();
    state.needsTextureUpdate=true;
  });

  const priorHandleDown=handleDown;
  try{
    container.removeEventListener('mousedown',handleDown);
    container.removeEventListener('touchstart',handleDown);
  }catch{}
  handleDown=function(e){
    const p=posFromEvent(e); mouseX=p.x; mouseY=p.y;
    if(state.mode!=='edit'){
      grabbedParticle=findClosestParticle(mouseX,mouseY);
      if(grabbedParticle){cursorUI.classList.add('active');cursorUI.style.left=mouseX+'px';cursorUI.style.top=mouseY+'px'}
      return;
    }
    priorHandleDown(e);
    if(pointerAction) return;
    const uv=screenToUV(mouseX,mouseY);
    if(!uv) return;
    const hit=hitElement(uv.u,uv.v);
    if(hit) return;
    grabbedParticle=findClosestParticle(mouseX,mouseY);
    if(grabbedParticle){cursorUI.classList.add('active');cursorUI.style.left=mouseX+'px';cursorUI.style.top=mouseY+'px'}
  };
  container.addEventListener('mousedown',handleDown);
  container.addEventListener('touchstart',handleDown,{passive:false});

  const priorHandleMove=handleMove;
  try{
    window.removeEventListener('mousemove',handleMove);
    window.removeEventListener('touchmove',handleMove);
  }catch{}
  handleMove=function(e){
    const p=posFromEvent(e); mouseX=p.x; mouseY=p.y;
    if(state.mode==='edit'&&pointerAction){
      priorHandleMove(e);
      return;
    }
    if(grabbedParticle&&e.cancelable) e.preventDefault();
  };
  window.addEventListener('mousemove',handleMove,{passive:false});
  window.addEventListener('touchmove',handleMove,{passive:false});

  render=function fix5Render(){
    requestAnimationFrame(render);
    if(!canvas.width||!canvas.height) return;
    time+=.016;

    const anyVideo=state.elements.some(e=>e.type==='video'&&e.visible&&runtimeAssets.get(e.assetId)?.node?.readyState>=2);
    const now=performance.now();
    if(state.needsTextureUpdate||(anyVideo&&now-lastVideoTextureAt>33)){
      updateTexture();
      if(anyVideo) lastVideoTextureAt=now;
    }

    const aspect=canvas.width/canvas.height;
    const proj=m4.perspective(fov,aspect,.1,100);
    const view=m4.translation(0,0,-cameraZ);
    viewProj=m4.multiply(proj,view);

    const editIdle=state.mode==='edit'&&!grabbedParticle;
    const motionScale=editIdle?.28:1;
    const damp=state.fabric.damping;
    const gravity=-.010*state.fabric.gravity*state.fabric.weight*motionScale;
    const windAmp=.00105*state.fabric.wind*motionScale;

    for(const p of cloth.particles){
      if(p.pinned) continue;
      const wind=Math.sin(time*2.1+p.x*3.1+p.y*1.7)*windAmp;
      p.z+=wind;
      const vx=(p.x-p.oldX)*damp,vy=(p.y-p.oldY)*damp,vz=(p.z-p.oldZ)*damp;
      p.oldX=p.x;p.oldY=p.y;p.oldZ=p.z;
      p.x+=vx;p.y+=vy+gravity;p.z+=vz;
      if(p.z>2.5)p.z=2.5;
      if(p.z<-1.5)p.z=-1.5;
    }

    if(grabbedParticle){
      const ndcX=mouseX/canvas.width*2-1;
      const dx=ndcX*aspect*(cameraZ*Math.tan(fov/2));
      const dy=-(mouseY/canvas.height*2-1)*2.5;
      grabbedParticle.x+=(dx-grabbedParticle.x)*.22;
      grabbedParticle.y+=(dy-grabbedParticle.y)*.22;
      grabbedParticle.z+=(1.25-grabbedParticle.z)*.22;
    }

    const iterations=Math.round(18+state.fabric.stiffness*20);
    for(let it=0;it<iterations;it++){
      for(const c of cloth.constraints){
        const dx=c.p1.x-c.p2.x,dy=c.p1.y-c.p2.y,dz=c.p1.z-c.p2.z;
        const dist=Math.hypot(dx,dy,dz);
        if(!dist) continue;
        const stiff=clamp(c.stiffness*state.fabric.stiffness*(.55+.45*state.fabric.elasticity),.1,1);
        const diff=((dist-c.rest)/dist)*.5*stiff;
        const ox=dx*diff,oy=dy*diff,oz=dz*diff;
        if(!c.p1.pinned&&c.p1!==grabbedParticle){c.p1.x-=ox;c.p1.y-=oy;c.p1.z-=oz}
        if(!c.p2.pinned&&c.p2!==grabbedParticle){c.p2.x+=ox;c.p2.y+=oy;c.p2.z+=oz}
      }
      for(let x=0;x<cloth.cols;x++){
        const p=cloth.particles[x];
        p.x=cloth.startX+x*cloth.spacingX;p.y=cloth.startY;p.z=0;
      }
    }

    cloth.vNormals.forEach(n=>{n.x=n.y=n.z=0});
    for(let i=0;i<cloth.indices.length;i+=3){
      const i0=cloth.indices[i],i1=cloth.indices[i+1],i2=cloth.indices[i+2];
      const p0=cloth.particles[i0],p1=cloth.particles[i1],p2=cloth.particles[i2];
      const ux=p1.x-p0.x,uy=p1.y-p0.y,uz=p1.z-p0.z;
      const vx=p2.x-p0.x,vy=p2.y-p0.y,vz=p2.z-p0.z;
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      for(const j of [i0,i1,i2]){cloth.vNormals[j].x+=nx;cloth.vNormals[j].y+=ny;cloth.vNormals[j].z+=nz}
    }
    cloth.particles.forEach((p,i)=>{
      cloth.pos[i*3]=p.x;cloth.pos[i*3+1]=p.y;cloth.pos[i*3+2]=p.z;
      const n=cloth.vNormals[i],l=Math.hypot(n.x,n.y,n.z)||1;
      cloth.norm[i*3]=n.x/l;cloth.norm[i*3+1]=n.y/l;cloth.norm[i*3+2]=n.z/l;
    });

    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);gl.bufferData(gl.ARRAY_BUFFER,cloth.pos,gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.normal);gl.bufferData(gl.ARRAY_BUFFER,cloth.norm,gl.DYNAMIC_DRAW);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);
    gl.uniformMatrix4fv(loc.matrix,false,viewProj);
    let lx=.45,ly=.82,lz=1,ll=Math.hypot(lx,ly,lz);gl.uniform3f(loc.light,lx/ll,ly/ll,lz/ll);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.position);gl.enableVertexAttribArray(loc.position);gl.vertexAttribPointer(loc.position,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.normal);gl.enableVertexAttribArray(loc.normal);gl.vertexAttribPointer(loc.normal,3,gl.FLOAT,false,0,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffers.texcoord);gl.enableVertexAttribArray(loc.texcoord);gl.vertexAttribPointer(loc.texcoord,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,paperTexture);gl.uniform1i(loc.texture,0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers.index);gl.drawElements(gl.TRIANGLES,cloth.indices.length,gl.UNSIGNED_SHORT,0);

    if(grabbedParticle){
      const sp=project3DTo2D(grabbedParticle,viewProj,canvas.width,canvas.height);
      if(sp){cursorUI.style.left=sp.x+'px';cursorUI.style.top=sp.y+'px'}
    }
  };

  state.mode='interact';
  state.selectedId=null;
  pointerAction=null;
  grabbedParticle=null;
  syncUI();
  state.needsTextureUpdate=true;
})();
