'use strict';
(() => {
  class SurfaceEngineManager {
    constructor(){
      this.registry = new Map();
      this.activeId = null;
      this.active = null;
      this.context = null;
      this.texture = null;
      this.format = null;
    }

    register(id, adapter){
      if(!id || !adapter) throw new Error('Surface engine requires id + adapter');
      if(this.registry.has(id)) throw new Error('Surface engine already registered: '+id);
      this.registry.set(id, adapter);
      return adapter;
    }

    has(id){ return this.registry.has(id); }

    list(){
      const flags = window.BanderolasSurfaceSchema?.FEATURE_FLAGS || {};
      return ['classic','paper3d','woven'].map(id => ({
        id,
        enabled: !!flags[id] && this.registry.has(id),
        registered: this.registry.has(id)
      }));
    }

    use(id, context = this.context || {}){
      const flags = window.BanderolasSurfaceSchema?.FEATURE_FLAGS || {};
      const nextId = flags[id] && this.registry.has(id) ? id : 'classic';
      const next = this.registry.get(nextId);
      if(!next) throw new Error('Classic surface adapter is not registered');

      if(this.active && this.activeId !== nextId && typeof this.active.unmount === 'function'){
        this.active.unmount(this.context || context);
      }

      this.context = context;
      this.activeId = nextId;
      this.active = next;
      if(typeof next.mount === 'function') next.mount(context);
      if(this.texture && typeof next.setTexture === 'function') next.setTexture(this.texture, context);
      if(this.format && typeof next.setFormat === 'function') next.setFormat(this.format, context);
      return nextId;
    }

    setTexture(texture, context = this.context || {}){
      this.texture = texture;
      if(this.active && typeof this.active.setTexture === 'function') this.active.setTexture(texture, context);
    }

    setFormat(format, context = this.context || {}){
      this.format = format;
      if(this.active && typeof this.active.setFormat === 'function') this.active.setFormat(format, context);
    }

    setMaterial(material, context = this.context || {}){
      if(this.active && typeof this.active.setMaterial === 'function') this.active.setMaterial(material, context);
    }

    setMotion(motion, context = this.context || {}){
      if(this.active && typeof this.active.setMotion === 'function') this.active.setMotion(motion, context);
    }

    setInteraction(interaction, context = this.context || {}){
      if(this.active && typeof this.active.setInteraction === 'function') this.active.setInteraction(interaction, context);
    }

    sync(surface, context = this.context || {}){
      const normalized = window.BanderolasSurfaceSchema.normalize(surface);
      const activeId = this.use(normalized.engine, context);
      normalized.engine = activeId;
      this.setFormat(context.state?.format || this.format, context);
      this.setTexture(context.texture || this.texture, context);
      this.setMaterial(normalized.material, context);
      this.setMotion(normalized.motion, context);
      this.setInteraction(normalized.interaction, context);
      return normalized;
    }

    diagnostics(){
      return {
        activeId: this.activeId,
        registered: [...this.registry.keys()],
        engines: this.list(),
        hasTexture: !!this.texture,
        format: this.format
      };
    }
  }

  window.surfaceManager = new SurfaceEngineManager();
  window.SurfaceEngineManager = SurfaceEngineManager;
})();
