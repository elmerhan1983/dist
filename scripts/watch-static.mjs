import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const targets = ['src/data', 'src/views', 'src/public'];
let timer = null;
let running = false;
let pending = false;

function runExport() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  const child = spawn(process.execPath, ['scripts/export-static.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });
  child.on('exit', () => {
    running = false;
    if (pending) {
      pending = false;
      runExport();
    }
  });
}

function trigger() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => runExport(), 900);
}

console.log('Watching for changes to auto export static site...');
console.log(`Targets: ${targets.join(', ')}`);
runExport();

for (const rel of targets) {
  const dir = path.join(root, rel);
  watch(dir, { recursive: true }, () => trigger());
}
