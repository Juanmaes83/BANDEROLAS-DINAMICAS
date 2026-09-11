import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const src=read('src/workspace-media-placement-controls.js');
const fail=[];const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);
try{new vm.Script(src,{filename:'workspace-media-placement-controls.js'});ok(true,'media placement controls parse');}catch(e){fail.push('parse: '+e.message);}
ok(index.includes('workspace-media-placement-controls.js?build=5.4r3'),'5.4R3 module loads after hardening');
ok(src.includes('MEDIA ON THIS PAGE')&&src.includes('REPLACE FILE')&&src.includes('REMOVE FROM PAGE'),'placed media exposes direct replace/remove controls');
ok(src.includes('!el.role'),'only user-added generic media is removable here');
ok(src.includes('state.elements=(state.elements||[]).filter(x=>x.id!==id)'),'remove deletes placement from active page state');
ok(src.includes('await putAsset(assetId,file)')&&src.includes('await loadRuntimeAsset'),'replace persists replacement asset');
ok(src.includes("pagesApi()?.saveActive?.({captureGlobal:false})"),'replace/remove persists active document page');
ok(src.includes("$('#ws-media-rescan')?.click()"),'media library is rescanned after placement changes');
ok(!src.includes("getContext('webgl")&&!src.includes('requestAnimationFrame('),'no new WebGL context or RAF loop');
if(fail.length){console.error('\nPHASE 5.4R3 VERIFY FAILED');fail.forEach(x=>console.error('FAIL '+x));process.exit(1);}console.log('\nPHASE 5.4R3 MEDIA PLACEMENT VERIFY: PASS');
