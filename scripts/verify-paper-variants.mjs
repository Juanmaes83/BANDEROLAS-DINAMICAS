import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root),'utf8');
const manager = read('src/surfaces/surface-manager.js');
const classic = read('src/surfaces/classic-fabric-adapter.js');
const paper = read('src/surfaces/paper3d-adapter.js');
const bridge = read('src/surfaces/paper3d-runtime-bridge.js');
const lock = JSON.parse(read('vendor/threeui/3d-paper/SOURCE_LOCK.json'));

const fail=[];
const ok=(cond,msg)=>cond?console.log(`PASS ${msg}`):fail.push(msg);

for(const [name,src] of Object.entries({manager,classic,paper,bridge})){
  try{new vm.Script(src,{filename:name+'.js'});ok(true,`${name} parses`);}catch(error){fail.push(`${name} parse: ${error.message}`);}
}

ok(manager.includes('setVariant(variant') && manager.includes('this.setVariant(normalized.variant'), 'SurfaceEngineManager propagates variant');
ok(classic.includes("{value:'site-of-the-year',label:'Site of the Year'}"), 'UI includes Site of the Year');
ok(classic.includes("{value:'japanese',label:'Japanese'}"), 'UI includes Japanese');
ok(classic.includes("{value:'certificate',label:'Certificate'}"), 'UI includes Certificate');
ok(classic.includes('variant.disabled = false'), 'Paper Variant selector is enabled');
ok(classic.includes('variant.onchange'), 'Variant selector has a change handler');
ok(!paper.includes('variant.disabled = true'), 'Paper adapter no longer force-disables Variant');
ok(paper.includes('setVariant(value, context)'), 'Paper adapter can remount on variant changes');
ok(bridge.includes('stripAuthoredChrome'), 'runtime bridge strips authored demo chrome for every variant');

const sandbox={window:{}};
vm.runInNewContext(bridge,sandbox,{filename:'paper3d-runtime-bridge.js'});
const bridgeApi=sandbox.window.BanderolasPaper3DBridge;
ok(!!bridgeApi?.buildRuntimeSource,'bridge API initializes');

const variants = [
  ['original','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper.html','8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353',630847],
  ['site-of-the-year','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html','fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d',633404],
  ['japanese','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-japanese.html','4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738',633704],
  ['certificate','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-certificate.html','0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32',634005]
];

for(const [id,path,hash,bytes] of variants){
  const buf=fs.readFileSync(new URL(path,root));
  const text=buf.toString('utf8');
  const actual=crypto.createHash('sha256').update(buf).digest('hex');
  const lockPath=path.replace('vendor/threeui/3d-paper/','');
  const entry=lock.files.find(f=>f.path===lockPath);
  ok(buf.byteLength===bytes,`${id} byte lock`);
  ok(actual===hash,`${id} SHA-256 lock`);
  ok(entry?.sha256===hash && entry?.bytes===bytes,`${id} SOURCE_LOCK entry`);
  ok(text.includes('function makeCertTexture(){'),`${id} bridge texture marker`);
  ok(text.includes('\n\n/* ======================================================================'),`${id} bridge function boundary`);
  ok(/\bTW\b/.test(text) && /\bTH\b/.test(text),`${id} texture dimensions available`);
  try{
    const patched=bridgeApi.buildRuntimeSource(text);
    const d=bridgeApi.diagnostics(text,patched);
    ok(d.runtimeHasBridge,`${id} dynamic CanvasTexture bridge injected`);
    ok(!d.runtimeHasDemoBackground,`${id} authored demo background removed`);
    ok(!d.runtimeHasHint,`${id} authored hint removed`);
    ok(d.runtimeUsesCanvasTexture,`${id} remains CanvasTexture based`);
  }catch(error){
    fail.push(`${id} bridge execution: ${error.message}`);
  }
}

if(fail.length){
  console.error('\nPAPER VARIANT VERIFY FAILED');
  for(const item of fail) console.error(`FAIL ${item}`);
  process.exit(1);
}
console.log('\nPAPER VARIANT STATIC VERIFY: PASS');
