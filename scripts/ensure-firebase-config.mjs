import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// The original Firebase web config was copied from the CHRONIKA console into
// scripts/build.mjs. Read it back from that source-of-truth, so environment
// variables from an unfinished Vercel import cannot replace its API key.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = await readFile(path.join(root, 'scripts/build.mjs'), 'utf8');
const match = script.match(/const defaultFirebaseConfig\s*=\s*\{([\s\S]*?)\};/);
if (!match) throw new Error('Expected CHRONIKA default Firebase config was not found.');
const cfg = {};
for (const entry of match[1].matchAll(/^\s*(apiKey|authDomain|projectId|appId|storageBucket|messagingSenderId):\s*'([^']*)'\s*,?\s*$/gm)) {
  cfg[entry[1]] = entry[2];
}
const fields = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket', 'messagingSenderId'];
if (fields.some(field => !cfg[field]) || !/^AIza[\w-]{35}$/.test(cfg.apiKey)) {
  throw new Error('Invalid Firebase config in scripts/build.mjs.');
}
if (cfg.projectId !== 'chronika-2813f') {
  throw new Error('Refusing to deploy a Firebase config for a different project.');
}
await writeFile(path.join(root, 'dist', 'firebase-config.js'),
  'export const firebaseConfig = ' + JSON.stringify(cfg, null, 2) + ';\n');
console.log('Firebase client config: CHRONIKA project (stale Vercel overrides ignored).');
