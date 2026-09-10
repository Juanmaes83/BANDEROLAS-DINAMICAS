import fs from 'node:fs';
import crypto from 'node:crypto';

const read = p => fs.readFileSync(p);
const text = p => fs.readFileSync(p,'utf8');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const assert = (ok,msg) => { if(!ok) throw new Error(msg); };

const root='vendor/threeui/3d-paper';
const lock=JSON.parse(text(`${root}/SOURCE_LOCK.json`));
assert(Array.isArray(lock.files) && lock.files.length===6,'SOURCE_LOCK must contain 6 registered files');

for(const f of lock.files){
  const path=`${root}/${f.path}`;
  const bytes=read(path);
  assert(bytes.byteLength===f.bytes,`byte mismatch: ${f.path}`);
  assert(sha(bytes)===f.sha256,`SHA-256 mismatch: ${f.path}`);
}

const canonicalPath=`${root}/src/shaders/3d-paper/sources/3d-paper.html`;
const canonical=text(canonicalPath);
assert(sha(read(canonicalPath))==='8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353','canonical ThreeDPaper source changed');
assert(canonical.includes('function makeCertTexture(){'),'canonical makeCertTexture missing');
assert(canonical.includes('Studio of the Week.'),'expected authored demo source no longer present in immutable vendor');
assert(!canonical.includes('banderolas:paper-texture'),'vendor was mutated with BANDEROLAS bridge');

const bridge=text('src/surfaces/paper3d-runtime-bridge.js');
const adapter=text('src/surfaces/paper3d-adapter.js');
const index=text('index.html');

assert(bridge.includes('BanderolasPaper3DBridge'),'runtime bridge export missing');
assert(bridge.includes('banderolas:paper-texture'),'runtime bridge message protocol missing');
assert(bridge.includes('new T.CanvasTexture(c)'),'derived runtime CanvasTexture missing');
assert(bridge.includes('display:none!important'),'demo background suppression missing');
assert(adapter.includes('BanderolasPaper3DBridge'),'Paper adapter does not require runtime bridge');
assert(adapter.includes('createImageBitmap'),'live compositor ImageBitmap transfer missing');
assert(adapter.includes("postMessage({type:'banderolas:paper-texture'"),'live texture postMessage missing');
assert(adapter.includes('VIDEO_FPS = 24'),'video texture throttle contract missing');
assert(adapter.includes('STATIC_FPS = 8'),'static texture throttle contract missing');
assert(adapter.includes('setTexture(texture)'),'Paper setTexture contract missing');
assert(adapter.includes("contentMode:'BANDEROLAS live compositor CanvasTexture'"),'Paper diagnostics content mode missing');

const bridgeAt=index.indexOf('paper3d-runtime-bridge.js');
const adapterAt=index.indexOf('paper3d-adapter.js');
assert(bridgeAt>=0 && adapterAt>bridgeAt,'index must load runtime bridge before Paper adapter');
assert(index.includes('build=4.3'),'index build marker is not 4.3');

console.log('PHASE 4.3 VERIFY PASS');
console.log('- 6/6 immutable ThreeUI vendor hashes verified');
console.log('- canonical vendor contains authored demo and contains no BANDEROLAS mutation');
console.log('- derived runtime bridge replaces content path in memory');
console.log('- Paper adapter receives live compositor frames via transferable ImageBitmap');
console.log('- bridge load order before adapter verified');
