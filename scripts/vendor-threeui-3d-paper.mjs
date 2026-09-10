import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SOURCE_URL = 'https://threeui.com/source-code/3d-paper.json';
const ROOT = path.resolve('vendor/threeui/3d-paper');
const REQUIRED = new Map([
  ['src/shaders/3d-paper/sources/3d-paper.html','8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353'],
  ['src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html','fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d'],
  ['src/shaders/3d-paper/sources/3d-paper-japanese.html','4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738'],
  ['src/shaders/3d-paper/sources/3d-paper-certificate.html','0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32'],
  ['src/shaders/3d-paper/ThreeDPaper.tsx','c2c8d1e9a0baf69c9e477e270ccde0254d6270918c106b62dffb5c7931223b20'],
  ['src/shaders/threeui.css','efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf']
]);

const res = await fetch(SOURCE_URL, {headers:{'user-agent':'BANDEROLAS-PRO-source-lock/4.2'}});
if (!res.ok) throw new Error(`ThreeUI source fetch failed: ${res.status}`);
const bundle = await res.json();
if (bundle?.id !== '3d-paper' || !Array.isArray(bundle.files)) throw new Error('Unexpected ThreeUI bundle schema');

const byPath = new Map(bundle.files.map(file => [file.path, file]));
const verified = [];
for (const [filePath, expected] of REQUIRED) {
  const file = byPath.get(filePath);
  if (!file || typeof file.code !== 'string') throw new Error(`Missing registered source: ${filePath}`);
  const bytes = Buffer.from(file.code, 'utf8');
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (file.sha256 !== expected) throw new Error(`Registry hash drift for ${filePath}: ${file.sha256} != ${expected}`);
  if (actual !== expected) throw new Error(`Content hash mismatch for ${filePath}: ${actual} != ${expected}`);
  const out = path.join(ROOT, filePath);
  await fs.mkdir(path.dirname(out), {recursive:true});
  await fs.writeFile(out, bytes);
  verified.push({path:filePath, bytes:bytes.length, sha256:actual, role:file.role || null});
}

const lock = {
  schemaVersion: 1,
  component: 'ThreeDPaper',
  sourceBundle: SOURCE_URL,
  sourceRevision: 'SHA-256 8ec1b71c0dbc',
  verifiedAt: new Date().toISOString(),
  files: verified,
  policy: 'Immutable vendor source. BANDEROLAS adaptations must live outside vendor/.'
};
await fs.writeFile(path.join(ROOT,'SOURCE_LOCK.json'), JSON.stringify(lock,null,2)+'\n');
console.log(`Verified and vendored ${verified.length} ThreeUI files.`);
