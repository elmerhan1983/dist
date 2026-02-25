import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const intervalMs = Number(process.env.AUTO_SYNC_INTERVAL_MS || 120000);

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function runGit(args) {
  return exec('git', args, { cwd: root });
}

async function syncOnce() {
  try {
    const { stdout } = await runGit(['status', '--porcelain']);
    if (!stdout.trim()) {
      console.log(`[auto-sync] clean @ ${nowStamp()}`);
      return;
    }
    await runGit(['add', '-A']);
    await runGit(['commit', '-m', `chore: auto sync ${nowStamp()}`]).catch(() => null);
    await runGit(['push']);
    console.log(`[auto-sync] pushed @ ${nowStamp()}`);
  } catch (error) {
    console.error('[auto-sync] failed:', error?.message || error);
  }
}

console.log(`[auto-sync] running every ${Math.round(intervalMs / 1000)}s in ${root}`);
await syncOnce();
setInterval(syncOnce, intervalMs);
