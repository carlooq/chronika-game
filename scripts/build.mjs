import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
let env = {};
try {
  const content = await readFile(path.join(root, '.env.local'), 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z_0-9]*)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
} catch { /* optional local environment */ }
env = { ...env, ...process.env };
// Firebase Web config is public client-side project identification, not a secret.
// Access control is enforced by Firebase Authentication and Firestore Rules.
// By default CHRONIKA connects to its OWN Firebase project (never HITSTERIADA).
const defaultFirebaseConfig = {
  apiKey: 'AIzaSyBqia8RAKtdt0OW0cGUaXzwcj9xYxygrs4',
  authDomain: 'chronika-2813f.firebaseapp.com',
  projectId: 'chronika-2813f',
  appId: '1:153413927646:web:4dccbcc539a4b5c078b84f',
  storageBucket: 'chronika-2813f.firebasestorage.app',
  messagingSenderId: '153413927646',
};
const keys = ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'APP_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID'];
const cfg = Object.fromEntries(keys.map(key => {
  const firebaseKey = key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return [firebaseKey, env[`VITE_FIREBASE_${key}`] || defaultFirebaseConfig[firebaseKey] || ''];
}));
await rm(out, { recursive:true, force:true });
await mkdir(out, { recursive:true });
await cp(path.join(root, 'src'), out, { recursive:true });
await cp(path.join(root, 'index.html'), path.join(out, 'index.html'));
await writeFile(path.join(out, 'firebase-config.js'), `export const firebaseConfig = ${JSON.stringify(cfg, null, 2)};\n`);
console.log(`Built ${out} (${cfg.apiKey && cfg.projectId ? 'Firebase configured' : 'local demo — no Firebase config'})`);
