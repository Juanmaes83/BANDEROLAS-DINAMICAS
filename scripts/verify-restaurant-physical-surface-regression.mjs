import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const premium=read('src/presets/restaurant-menu-premium.js');
const pages=read('src/presets/restaurant-menu-pages.js');
const classic=read('src/surfaces/classic-fabric-adapter.js');
const studio=read('src/surfaces/paper3d-studio.js');
const interaction=read('src/interaction-stable.js');
const editor=read('src/editor-base.html');
const fail=[];
const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);

for(const [name,src] of [['restaurant preset',premium],['pages',pages],['classic adapter',classic],['paper studio',studio],['interaction stable',interaction]]){
  try{new vm.Script(src,{filename:name+'.js'});ok(true,name+' parses');}catch(e){fail.push(name+' parse: '+e.message);}
}

ok(!premium.includes("state.mode='edit'"),'restaurant preset never forces edit mode');
ok(premium.includes('const modeBefore=state.mode'),'restaurant preset captures physical/edit mode');
ok(premium.includes('state.mode=modeBefore'),'restaurant preset restores the incoming mode');
ok(premium.includes('formatBefore!==state.format')&&premium.includes("typeof rebuildCloth==='function'"),'restaurant preset rebuilds cloth only when format changes');

ok(pages.includes('async function refreshEditorAfterPageSwap({rebuildPhysical=false}={})'),'page refresh defaults to preserving physical mesh');
ok(pages.includes("if(rebuildPhysical&&typeof rebuildCloth==='function')rebuildCloth()"),'cloth rebuild is explicitly conditional');
ok(pages.includes('const guardedMode=state.mode'),'page switch guards current interaction mode');
ok(pages.includes('state.mode=guardedMode'),'page switch restores interaction mode');
ok(pages.includes('const formatChanged=previousFormat!==nextFormat'),'page switch detects real aspect change');
ok(pages.includes('refreshEditorAfterPageSwap({rebuildPhysical:formatChanged})'),'same-format page switch preserves current deformation');
ok(pages.includes('refreshEditorAfterPageSwap({rebuildPhysical:true})'),'explicit page format change still rebuilds geometry');
ok(pages.includes("guardedSurface=typeof state.surface"),'page switch guards current physical/3D surface');
ok(pages.includes('if(guardedSurface!==undefined)state.surface=guardedSurface'),'page switch restores exact surface state/variant');

ok(!classic.includes("variant.innerHTML = state.surface.engine === 'paper3d'"),'Classic foundation no longer overwrites Paper variant options');
ok(classic.includes("if(state.surface.engine === 'paper3d')")&&classic.includes('variant.disabled = false'),'Paper variant selector is explicitly enabled');
ok(classic.includes("variant.innerHTML = '<option value=\"default\">Default</option>'")&&classic.includes('variant.disabled = true'),'Variant remains disabled only for Classic default');
ok(classic.includes('lastPaperVariant'),'last Paper variant survives Classic round-trip');
ok(classic.includes('BanderolasPaperStudio?.syncUI'),'Paper Studio owns Paper variant UI population');

for(const variant of ["original:'Original'","japanese:'Japanese'","certificate:'Certificate'","'site-of-the-year':'Site of the Year'"]){
  ok(studio.includes(variant),'Paper Studio exposes '+variant.split(':')[0]);
}
ok(studio.includes('select.disabled=false'),'Paper Studio authoritative sync unlocks Variant');
ok(studio.includes('changeVariant(e.target.value)'),'Variant selector changes the real Paper variant');

ok(interaction.includes("state.mode = 'interact'"),'stable interaction boot remains fabric-interact first');
ok(interaction.includes("btn.textContent = 'FABRIC / INTERACT'"),'physical interaction remains explicit in UI');
ok(editor.includes("state.mode==='interact'&&grabbedParticle"),'Verlet render path still follows grabbed particle in interact mode');
ok(editor.includes('grabbedParticle=findClosestParticle'),'pointer down still attaches to a physical cloth particle');
ok(editor.includes('cloth.constraints'),'Verlet constraint mesh remains present');

if(fail.length){
  console.error('\nRESTAURANT PHYSICAL SURFACE REGRESSION FAILED');
  fail.forEach(x=>console.error('FAIL '+x));
  process.exit(1);
}
console.log('\nRESTAURANT PHYSICAL SURFACE + PAPER VARIANT REGRESSION: PASS');
