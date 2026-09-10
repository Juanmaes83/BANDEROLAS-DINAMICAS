import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const pages=read('src/presets/restaurant-menu-pages.js');
const fail=[];const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);
const compact=pages.replace(/\s+/g,'');

try{new vm.Script(pages,{filename:'restaurant-menu-pages.js'});ok(true,'pages module parses');}catch(e){fail.push('pages parse: '+e.message);}
for(const file of ['surface-schema.js','surface-manager.js','classic-fabric-adapter.js','paper3d-runtime-bridge.js','paper3d-adapter.js','paper3d-studio.js','paper3d-native-fidelity.js']){
  ok(index.includes(`src/surfaces/${file}?build=4.4r`),`exact 4.4R surface boot preserved: ${file}`);
}
ok(index.indexOf('restaurant-menu-controls.js?build=5.2') < index.indexOf('restaurant-menu-pages.js?build=5.3'),'page manager loads after restaurant controls');
ok(pages.includes("mode:'single-physical-sheet'"),'document mode is one physical sheet with swappable pages');
ok(compact.includes('state.elements=deep(target.elements||[])'),'page activation swaps content through the existing state.elements compositor');
ok(compact.includes('state.restaurantMenu=deep(target.restaurantMenu||{})'),'restaurant controls follow active page model');
ok(compact.includes("guardedSurface=typeofstate.surface"),'active surface state is explicitly guarded during page switch');
ok(compact.includes('if(guardedSurface!==undefined)state.surface=guardedSurface'),'page switch restores untouched surface state');
ok(pages.includes("Duplicate Full")&&pages.includes("Duplicate Layout"),'full and layout-only duplication controls exist');
ok(pages.includes("+ Add Page")&&pages.includes("Delete Page"),'page add/delete controls exist');
ok(pages.includes("Move Up")&&pages.includes("Move Down"),'page ordering controls exist');
ok(pages.includes('restaurant-page-prev')&&pages.includes('restaurant-page-next'),'page navigation controls exist');
ok(pages.includes('GLOBAL across pages'),'global/page-specific ownership is exposed in UI');
ok(pages.includes('brandAssetIds'),'logo and editorial plate can remain global across pages');
ok(pages.includes('serializableProject.__restaurantPages53'),'project serialization includes document pages');
ok(pages.includes('snapshot.__restaurantPages53')&&pages.includes('restoreSnapshot.__restaurantPages53'),'undo/redo snapshots include document pages');
ok(pages.includes('hydrateAssets'),'page activation hydrates page-specific media through existing asset pipeline');
ok(!pages.includes('requestAnimationFrame('),'page manager creates no render loop');
ok(!pages.includes("getContext('webgl")&&!pages.includes('WebGLRenderingContext'),'page manager creates no WebGL context');
ok(!pages.includes('surfaceManager.use('),'page navigation never switches/recreates a surface engine');
ok(!pages.includes('src/surfaces/'),'page manager does not patch surface implementation files');

if(fail.length){console.error('\nPHASE 5.3 VERIFY FAILED');fail.forEach(x=>console.error('FAIL '+x));process.exit(1);}console.log('\nPHASE 5.3 RESTAURANT MULTIPAGE VERIFY: PASS');
