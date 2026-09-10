import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const controls=read('src/presets/restaurant-menu-controls.js');
const preset=read('src/presets/restaurant-menu-premium.js');
const fail=[];const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);

try{new vm.Script(controls,{filename:'restaurant-menu-controls.js'});ok(true,'controls parse');}catch(e){fail.push('controls parse: '+e.message);}
try{new vm.Script(preset,{filename:'restaurant-menu-premium.js'});ok(true,'5.1R preset still parses');}catch(e){fail.push('preset parse: '+e.message);}

for(const file of ['surface-schema.js','surface-manager.js','classic-fabric-adapter.js','paper3d-runtime-bridge.js','paper3d-adapter.js','paper3d-studio.js','paper3d-native-fidelity.js']){
  ok(index.includes(`src/surfaces/${file}?build=4.4r`),`validated 4.4R boot preserved: ${file}`);
}
ok(index.indexOf('restaurant-menu-premium.js?build=5.2') < index.indexOf('restaurant-menu-controls.js?build=5.2'),'controls load after restaurant preset');
ok(controls.includes("PANEL_ID='restaurant-menu-controls-section'"),'single contextual Restaurant Menu panel');
ok(controls.includes('LIVE DOCUMENT CONTROLS'),'live document controls visible');
for(const style of ['Dark Fine Dining','Elegant Ivory','Mediterranean Premium'])ok(controls.includes(style),`style preset ${style}`);
for(const field of ['Restaurant name','Claim','Location','Edition','Chef Note','Signature Dishes','Menu Sections','Reservations'])ok(controls.includes(field),`panel exposes ${field}`);
for(const hero of ['Replace media','Hero opacity','Hero zoom','Overlay'])ok(controls.includes(hero),`hero control ${hero}`);
for(const dish of ['+ Add dish','data-dish-delete','data-dish-up','data-dish-down'])ok(controls.includes(dish),`dish management ${dish}`);
for(const media of ['data-replace-signature','rm-hero-file'])ok(controls.includes(media),`media replacement ${media}`);
for(const section of ['menu-starters','menu-mains','menu-desserts','menu-drinks'])ok(controls.includes(section),`menu section bound ${section}`);
ok(controls.includes('snapshot.__restaurant52')&&controls.includes('restoreSnapshot.__restaurant52'),'restaurant model persistence wraps existing project history');
ok(controls.includes("closest?.('#properties')"),'generic Selected Element changes can resync menu controls');
ok(!controls.includes('requestAnimationFrame('),'controls add no render loop');
ok(!controls.includes("getContext('webgl")&&!controls.includes('WebGLRenderingContext'),'controls add no WebGL context');
ok(!controls.includes('src/surfaces/'),'controls do not patch surface files');
ok(controls.includes('state.needsTextureUpdate=true'),'edits feed existing compositor');
ok(controls.includes("setSelected==='function'"),'menu edits can select corresponding existing layer');

if(fail.length){console.error('\nPHASE 5.2 VERIFY FAILED');fail.forEach(x=>console.error('FAIL '+x));process.exit(1);}console.log('\nPHASE 5.2 RESTAURANT CONTROLS VERIFY: PASS');
