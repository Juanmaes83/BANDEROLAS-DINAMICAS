import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const preset=read('src/presets/restaurant-menu-premium.js');
const fail=[]; const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);

try{new vm.Script(preset);ok(true,'restaurant preset parses');}catch(e){fail.push('restaurant preset parse: '+e.message);}
for(const file of ['paper3d-runtime-bridge.js','paper3d-adapter.js','paper3d-studio.js','paper3d-native-fidelity.js']) ok(index.includes(`src/surfaces/${file}?build=4.4r`),`exact 4.4R boot keeps ${file}`);
ok(index.indexOf('paper3d-native-fidelity.js?build=4.4r') < index.indexOf('restaurant-menu-premium.js?build=5.1r'),'restaurant preset loads after complete 4.4R surface stack');
ok(preset.includes("id='restaurant-menu-premium-section'") || preset.includes("id=\'restaurant-menu-premium-section\'") || preset.includes("d.id='restaurant-menu-premium-section'"),'restaurant section is explicit and visible');
ok(preset.includes('d.open=true'),'restaurant section opens by default');
ok(preset.includes('APPLY PREMIUM RESTAURANT MENU'),'prominent apply action');
ok(preset.includes("get('demo')==='restaurant'"),'restaurant visual review query auto-applies preset');
ok(preset.includes('Grabaci%C3%B3n%20de%20pantalla%202026-09-04%20085412.mp4'),'known owned restaurant video asset');
for(const img of ['scene-01-gamba-roja.webp','scene-02-atun-rojo.webp','scene-05-presa-iberica.webp']) ok(preset.includes(img),`owned food asset ${img}`);
for(const section of ['NOTA DEL CHEF','PLATOS DE FIRMA','ENTRANTES','PRINCIPALES','POSTRES','BODEGA · CÓCTELES','RESERVAS']) ok(preset.includes(section),`menu section ${section}`);
ok(!preset.includes('requestAnimationFrame('),'preset adds no render loop');
ok(!preset.includes('src/surfaces/'),'preset does not patch surface source files');

if(fail.length){console.error('\nPHASE 5.1R VERIFY FAILED');fail.forEach(x=>console.error('FAIL '+x));process.exit(1);}console.log('\nPHASE 5.1R VERIFY: PASS');
