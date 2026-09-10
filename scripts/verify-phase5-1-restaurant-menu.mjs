import fs from 'node:fs';
import vm from 'node:vm';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const preset=fs.readFileSync(new URL('../src/presets/restaurant-menu-premium.js',import.meta.url),'utf8');

const fail=[];
const ok=(cond,msg)=>cond?console.log(`PASS ${msg}`):fail.push(msg);

ok(index.includes('src/presets/restaurant-menu-premium.js?build=5.1'),'index boots Restaurant Menu Premium v5.1');
ok(index.includes('src/surfaces/paper3d-adapter.js?build=5.1'),'existing surface bootstrap remains present');
ok(preset.includes("const PRESET_ID = 'restaurant-menu-premium'"),'stable preset id');
ok(preset.includes("state.format='9:16'"),'preset enforces 9:16');
ok(preset.includes("state.layout='free'"),'preset uses existing free layout');
ok(preset.includes("name:'LUME'"),'LUME brand kit applied');
ok(preset.includes("type:'video'") && preset.includes("role,'hero'") || preset.includes("'Hero · Chef Film','hero'"),'hero video layer configured');
for(const section of ['NOTA DEL CHEF','PLATOS DE FIRMA','ENTRANTES','PRINCIPALES','POSTRES','BODEGA · CÓCTELES','RESERVAS']) ok(preset.includes(section),`required section: ${section}`);
ok((preset.match(/signature-media-/g)||[]).length>=3,'three signature media slots');
ok(preset.includes('window.applyRestaurantMenuPremium'),'public QA apply hook');
ok(preset.includes("#template-select"),'preset UI attaches to the existing right-panel Templates section');
ok(!preset.includes('createElement(\'canvas\')') || !preset.includes('appendChild(c)'), 'no second visible canvas appended');
ok(!preset.includes('src/surfaces/'),'preset module does not patch surface engine files');
ok(!preset.includes('requestAnimationFrame('),'preset introduces no competing render loop');
ok(!/\bgl\.(draw|bind|tex|use|uniform)/.test(preset),'preset does not mutate WebGL renderer directly');

try{new vm.Script(preset,{filename:'restaurant-menu-premium.js'});ok(true,'preset JavaScript parses');}catch(error){fail.push(`JavaScript parse: ${error.message}`);}

if(fail.length){console.error('\nPHASE 5.1 VERIFY FAILED');for(const item of fail)console.error(`FAIL ${item}`);process.exit(1);}
console.log('\nPHASE 5.1 STATIC VERIFY: PASS');