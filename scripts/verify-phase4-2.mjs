import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const files = [
  'src/surfaces/surface-schema.js',
  'src/surfaces/surface-manager.js',
  'src/surfaces/classic-fabric-adapter.js',
  'src/surfaces/paper3d-adapter.js'
];

for (const file of files) {
  const text = await fs.readFile(file, 'utf8');
  if (!text.trim()) throw new Error(`Empty implementation file: ${file}`);
}

const lock = JSON.parse(await fs.readFile('vendor/threeui/3d-paper/SOURCE_LOCK.json','utf8'));
const required = new Map([
  ['src/shaders/3d-paper/sources/3d-paper.html','8ec1b71c0dbcafbadf908100ae2a08045d0a1087c00a09d28245ef19366c7353'],
  ['src/shaders/3d-paper/sources/3d-paper-site-of-the-year.html','fdef93fa96a3927430ef35411af70568c56b9488921aead8f36be36800689b7d'],
  ['src/shaders/3d-paper/sources/3d-paper-japanese.html','4e929b9c3feaa635c6bc45e5c556243395318d4d7feb4d6a85190768b3b9f738'],
  ['src/shaders/3d-paper/sources/3d-paper-certificate.html','0cb83da723e1a54f1a2e1124bc26a27d608afc3ba42ec0b116807e2e2ae5fb32'],
  ['src/shaders/3d-paper/ThreeDPaper.tsx','c2c8d1e9a0baf69c9e477e270ccde0254d6270918c106b62dffb5c7931223b20'],
  ['src/shaders/threeui.css','efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf']
]);

for (const [relative, expected] of required) {
  const entry = lock.files.find(f => f.path === relative);
  if (!entry || entry.sha256 !== expected) throw new Error(`SOURCE_LOCK mismatch: ${relative}`);
  const full = `vendor/threeui/3d-paper/${relative}`;
  const bytes = await fs.readFile(full);
  const actual = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actual !== expected) throw new Error(`Vendored file hash mismatch: ${relative}`);
}

const schema = await fs.readFile('src/surfaces/surface-schema.js','utf8');
if (!/paper3d:\s*true/.test(schema)) throw new Error('paper3d feature flag is not enabled');
const adapter = await fs.readFile('src/surfaces/paper3d-adapter.js','utf8');
if (!adapter.includes("manager.register('paper3d'")) throw new Error('paper3d adapter is not registered');
if (!adapter.includes('srcdoc = html')) throw new Error('exact vendored source is not mounted with srcdoc');

console.log('PHASE 4.2 STATIC VERIFY PASS');
console.log('6/6 exact source hashes verified; paper3d registered; source mount path present.');
