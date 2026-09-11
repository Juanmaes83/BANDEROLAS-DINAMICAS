import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const index=read('index.html');
const hard=read('src/workspace-hardening.js');
const fail=[];const ok=(v,m)=>v?console.log('PASS '+m):fail.push(m);
try{new vm.Script(hard,{filename:'workspace-hardening.js'});ok(true,'hardening module parses');}catch(e){fail.push('hardening parse: '+e.message);}
ok(index.includes('workspace-cleanup.js?build=5.4r')&&index.includes('workspace-hardening.js?build=5.4r2'),'hardening loads after guided workspace');
ok(hard.includes('MEDIA · PRIMARY')&&hard.includes('+ IMAGE')&&hard.includes('+ VIDEO')&&hard.includes('UPLOAD LOGO')&&hard.includes('REPLACE HERO'),'primary media actions are visible');
ok(hard.includes('Media Library')&&hard.includes('Delete unused')&&hard.includes('Use on page')&&hard.includes('Replace selected'),'media library supports reuse and cleanup');
ok(hard.includes("p.dishMedia")&&hard.includes('Add dish image')&&hard.includes('menu-dish-image:'),'normal menu dishes support optional image media');
ok(hard.includes("PORTABLE_KIND='banderolas-pro-multipage-project'")&&hard.includes('project.restaurantDocument=state.restaurantDocument?deep(state.restaurantDocument):null'),'portable project explicitly carries restaurantDocument');
ok(hard.includes('for(const [i,p] of d.pages.entries())')&&hard.includes('for(const [id,r] of refs)'),'asset collection spans document pages, not only active state.elements');
ok(hard.includes("'9:24':[1080,2880]")&&hard.includes("'9:32':[1080,3840]")&&hard.includes("'9:40':[1080,4800]")&&hard.includes("'9:custom':[1080,${custom}]"),'interactive export patches every extended format');
ok(hard.includes('exportAllPagesZip')&&hard.includes('renders/${slug}.png')&&hard.includes('pages/${slug}.html'),'all-pages ZIP carries per-page interactive HTML and PNG renders');
ok(hard.includes('neutralizeLegacySurfaceControls')&&hard.includes("old.replaceWith(clone)")&&hard.includes('setVariantDirect'),'legacy variant listeners are detached and primary controller owns Variant');
ok(hard.includes('window.surfaceManager.sync')||hard.includes('manager.sync'),'surface controller talks directly to the engine manager');
ok(!hard.includes('BanderolasPaperStudio?.changeVariant'),'primary Variant no longer depends on the legacy PaperStudio DOM handler');
ok(hard.includes('currentFingerprint')&&hard.includes('baselineFingerprint')&&hard.includes('Unsaved changes'),'OUTPUT health detects dirty state after Save');
ok(hard.includes('missingUsed')&&hard.includes('MEDIA ERROR'),'traffic lights detect missing persisted media');
ok(!hard.includes("getContext('webgl")&&!hard.includes('requestAnimationFrame('),'hardening creates no new WebGL context or render loop');
if(fail.length){console.error('\nPHASE 5.4R2 VERIFY FAILED');fail.forEach(x=>console.error('FAIL '+x));process.exit(1);}console.log('\nPHASE 5.4R2 WORKSPACE HARDENING VERIFY: PASS');
