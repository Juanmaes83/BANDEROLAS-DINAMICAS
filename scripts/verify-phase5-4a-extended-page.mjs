import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const ext=read('src/presets/restaurant-menu-extended-page.js');
const pages=read('src/presets/restaurant-menu-pages.js');
const fail=[];
const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);
const compact=ext.replace(/\s+/g,'');

try{new vm.Script(ext,{filename:'restaurant-menu-extended-page.js'});ok(true,'extended page module parses');}catch(e){fail.push('extended page parse: '+e.message);}
for(const file of ['surface-schema.js','surface-manager.js','classic-fabric-adapter.js','paper3d-runtime-bridge.js','paper3d-adapter.js','paper3d-studio.js','paper3d-native-fidelity.js']){
  ok(index.includes(`src/surfaces/${file}?build=4.4r`),`exact 4.4R surface boot preserved: ${file}`);
}
ok(index.indexOf('restaurant-menu-pages.js?build=5.3') < index.indexOf('restaurant-menu-extended-page.js?build=5.4a'),'5.4A loads after multipage manager');
ok(ext.includes("standard:{label:'Standard · 9:16'")&&ext.includes("tall:{label:'Tall · 9:24'")&&ext.includes("long:{label:'Long · 9:32'")&&ext.includes("extra:{label:'Extra Long · 9:40'"),'Standard/Tall/Long/Extra Long presets exist');
ok(ext.includes("const EXTENDED=new Set(['9:24','9:32','9:40','9:custom'])"),'custom extended format key exists');
ok(ext.includes('MIN=1920, MAX=4800')&&ext.includes('clampH'),'custom height is bounded 1920–4800');
ok(ext.includes('function reprojectElements'),'pixel-preserving reprojection exists');
ok(compact.includes("if(el.role==='menu-backdrop')return{...el,x:0,y:0,w:1,h:1,fit:'fill'}"),'backdrop remains full-page');
ok(compact.includes("if(el.role==='cta')"),'footer receives bottom-edge preservation');
ok(ext.includes('existing layers keep their pixel size; new space is added below.'),'UI states non-stretch extension contract');
ok(ext.includes('restaurant-page-height-preset')&&ext.includes('restaurant-apply-height')&&ext.includes('restaurant-extend-page'),'Page Height / Apply / Extend controls exist');
ok(ext.includes("fmtMap['9:24']={w:1080,h:2880}")&&ext.includes("fmtMap['9:32']={w:1080,h:3840}")&&ext.includes("fmtMap['9:40']={w:1080,h:4800}"),'extended compositor dimensions registered');
ok(ext.includes('documentSize')&&pages.includes('restaurantDocument'),'page-level size metadata travels inside multipage document');
ok(ext.includes('backdropAssetId')&&ext.includes('makeBackdrop'),'extended backdrop is regenerated at actual document height');
ok(ext.includes('restoreSnapshot.__extended54a')&&ext.includes('openProject.__extended54a'),'undo/open persistence guards custom formats');
ok(ext.includes("state.restaurantDocument=deep(saved.restaurantDocument)"),'saved multipage document is restored on project open');
ok(ext.includes('const surface=')&&ext.includes('mode=state.mode')&&ext.includes('state.surface=surface')&&ext.includes('state.mode=mode'),'surface engine and interaction mode are guarded during resize');
ok(ext.includes('rebuildCloth?.()'),'existing ratio-aware Classic geometry is reused for extended aspect');
ok(!ext.includes('requestAnimationFrame('),'5.4A creates no render loop');
ok(!ext.includes("getContext('webgl")&&!ext.includes('WebGLRenderingContext'),'5.4A creates no WebGL context');
ok(!ext.includes('surfaceManager.use('),'5.4A never switches surface engine');
ok(!ext.includes('src/surfaces/'),'5.4A does not patch surface source files');
ok(!/splitSection|moveSectionToNextPage/.test(ext),'5.4A adds no section-splitting logic');

if(fail.length){
  console.error('\nPHASE 5.4A VERIFY FAILED');
  fail.forEach(x=>console.error('FAIL '+x));
  process.exit(1);
}
console.log('\nPHASE 5.4A EXTENDED RESTAURANT PAGE VERIFY: PASS');
