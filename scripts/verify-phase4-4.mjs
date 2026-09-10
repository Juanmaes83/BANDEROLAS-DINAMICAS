import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const variants = [
  ['original','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper.html','8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353'],
  ['japanese','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-japanese.html','4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738'],
  ['certificate','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-certificate.html','0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32'],
  ['site-of-the-year','vendor/threeui/3d-paper/src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html','fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d']
];

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceLock = JSON.parse(await fs.readFile('vendor/threeui/3d-paper/SOURCE_LOCK.json','utf8'));

for (const [name,path,expected] of variants) {
  const bytes = await fs.readFile(path);
  const actual = sha256(bytes);
  if (actual !== expected) throw new Error(`${name}: immutable source hash mismatch`);
  const lockEntry = sourceLock.files.find(f => `vendor/threeui/3d-paper/${f.path}` === path);
  if (!lockEntry || lockEntry.sha256 !== expected || lockEntry.bytes !== bytes.length) {
    throw new Error(`${name}: SOURCE_LOCK metadata mismatch`);
  }
}

const bridgeText = await fs.readFile('src/surfaces/paper3d-runtime-bridge.js','utf8');
globalThis.window = {};
Function(bridgeText)();
if (!window.BanderolasPaper3DBridge?.buildRuntimeSource) throw new Error('Paper runtime bridge did not register');

for (const [name,path] of variants) {
  const source = await fs.readFile(path,'utf8');
  if (source.includes('BANDEROLAS')) throw new Error(`${name}: vendor source was mutated with BANDEROLAS code`);
  const runtime = window.BanderolasPaper3DBridge.buildRuntimeSource(source,{variant:name});
  const d = window.BanderolasPaper3DBridge.diagnostics(source,runtime);
  if (!d.runtimeHasBridge || !d.runtimeHasControls || d.runtimeHasVisibleDemoBackground ||
      !d.runtimePreservesNativeTexture || !d.runtimeSuppressesOnlyText || !d.runtimeHasNativeBase ||
      !d.runtimeHasContentModes || !d.runtimeHasExactNativeRestore ||
      !d.pointerSensitivityPatched || !d.inertiaPatched) {
    throw new Error(`${name}: native-fidelity runtime gate failed ${JSON.stringify(d)}`);
  }
  if (!runtime.includes('const __bpNativeMakeCertTexture = makeCertTexture')) {
    throw new Error(`${name}: original makeCertTexture is not wrapped/preserved`);
  }
  if (!runtime.includes("if(m.preset==='native')")) throw new Error(`${name}: exact Native material bypass missing`);
  for (const marker of ['nativeBase','native-content','native-layout','full-bleed','banderolas:paper-texture','banderolas:paper-controls']) {
    if (!runtime.includes(marker)) throw new Error(`${name}: missing native-fidelity marker ${marker}`);
  }
}

const schema = await fs.readFile('src/surfaces/surface-schema.js','utf8');
const adapter = await fs.readFile('src/surfaces/paper3d-adapter.js','utf8');
const studio = await fs.readFile('src/surfaces/paper3d-studio.js','utf8');
const fidelity = await fs.readFile('src/surfaces/paper3d-native-fidelity.js','utf8');
const index = await fs.readFile('index.html','utf8');

for (const v of ['original','japanese','certificate','site-of-the-year']) {
  if (!schema.includes(v) || !adapter.includes(v) || !studio.includes(v)) throw new Error(`variant not wired end-to-end: ${v}`);
}
for (const preset of ['opaque','transparent','translucent','glass','washi','iridescent']) {
  if (!studio.includes(`${preset}:`)) throw new Error(`material preset missing: ${preset}`);
}
for (const preset of ['calm','float','tilt','inertial','dynamic']) {
  if (!studio.includes(`${preset}:`)) throw new Error(`motion preset missing: ${preset}`);
}
if (!schema.includes('const VERSION = 4')) throw new Error('surface schema v4 not active');
for (const mode of ['native-content','native-layout','full-bleed']) {
  if (!schema.includes(mode) || !fidelity.includes(mode)) throw new Error(`content mode missing: ${mode}`);
}
if (!fidelity.includes("getContext('2d',{alpha:true})")) throw new Error('transparent BANDEROLAS content compositor missing');
if (!fidelity.includes('originalPushTexture.call(this,force)')) throw new Error('Paper texture pump is not wrapped by Native Fidelity');
if (!adapter.includes("manager.register('paper3d'")) throw new Error('paper3d adapter not registered');
if (!index.includes('paper3d-native-fidelity.js?build=4.4r')) throw new Error('Native Fidelity script not loaded by production entry');
if (index.indexOf('paper3d-native-fidelity.js') < index.indexOf('paper3d-adapter.js')) throw new Error('Native Fidelity load order invalid');

console.log('PHASE 4.4R NATIVE FIDELITY STATIC VERIFY PASS');
console.log('4/4 exact vendor hashes; exact makeCertTexture preserved; demo text suppressed only; native artwork/material retained; transparent BANDEROLAS overlay + 3 content modes; schema v4.');
