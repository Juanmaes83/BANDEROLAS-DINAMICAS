import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const src=read('src/workspace-single-control-surface.js');
const fail=[];const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);
try{new vm.Script(src,{filename:'workspace-single-control-surface.js'});ok(true,'single control surface parses');}catch(e){fail.push('parse: '+e.message);}
ok(index.includes('workspace-single-control-surface.js?build=5.4r6'),'R6 module loads last');
ok(src.includes("const VERSION='5.4R6'"),'module identifies R6');
ok(src.includes('EDIT CONTENT')&&src.includes('FABRIC / INTERACT'),'primary modes use clear labels');
ok(src.includes('position:sticky')&&src.includes('#ws-sticky-controlbar'),'mode/save control bar is sticky on desktop');
ok(src.includes('#ws-media-core{display:none!important}')&&src.includes('#ws-page-media{display:none!important}'),'duplicated media panels are removed from primary view');
ok(src.includes('#restaurant-menu-premium-section{display:none!important}')&&src.includes('#ws-content-host{display:none!important}'),'legacy content/preset surfaces are hidden from primary workflow');
ok(src.includes("summary.textContent='ASSETS / MEDIA'")&&src.includes("summary.textContent='RESTAURANT CONTENT'"),'secondary content is grouped into clear collapsed sections');
ok(src.includes("title.textContent='CONTENT EDITOR'")&&src.includes('Click any visible element on the document'),'universal inspector remains the primary content editor');
ok(src.includes("$('#ws-save')||$('#save-project')")&&src.includes('#ws-sticky-status'),'save action and project state stay visible');
ok(src.includes("state.mode==='edit'&&state.selectedId")&&src.includes('openContent()'),'selection in edit mode opens the content workspace');
ok(!src.includes("getContext('webgl")&&!src.includes('requestAnimationFrame('),'no new WebGL context or RAF loop');
if(fail.length){console.error('\nPHASE 5.4R6 VERIFY FAILED');fail.forEach(x=>console.error('FAIL '+x));process.exit(1);}console.log('\nPHASE 5.4R6 SINGLE CONTROL SURFACE VERIFY: PASS');
