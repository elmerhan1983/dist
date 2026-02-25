import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile, readFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'dist');
const port = Number(process.env.STATIC_EXPORT_PORT || 4173);
const origin = `http://127.0.0.1:${port}`;
const basePathInput = String(process.env.STATIC_BASE_PATH || '/').trim() || '/';
const basePath = (() => {
  if (basePathInput === '/' || basePathInput === '') return '';
  let p = basePathInput;
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/+$/, '');
  return p;
})();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Server did not become ready: ${url}`);
}

function extractLocs(xml = '') {
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  const urls = [];
  for (const m of matches) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

function toOutputFile(urlPathname) {
  if (urlPathname === '/' || urlPathname === '') return path.join(outDir, 'index.html');
  const clean = urlPathname.replace(/^\/+/, '');
  if (/\.[a-z0-9]+$/i.test(clean)) return path.join(outDir, clean);
  return path.join(outDir, clean, 'index.html');
}

async function savePage(urlPathname, html) {
  const file = toOutputFile(urlPathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html, 'utf-8');
}

function withBase(url = '') {
  if (!basePath) return url;
  if (!url.startsWith('/')) return url;
  if (url.startsWith('//')) return url;
  if (url.startsWith('/http://') || url.startsWith('/https://')) return url.slice(1);
  return `${basePath}${url}`;
}

function transformHtmlForStatic(html = '') {
  if (!html) return html;
  let out = html;

  // href/src/action="/..."
  out = out.replace(/\b(href|src|action)=(")\/(?!\/)([^"]*)"/gi, (m, attr, q, pathPart) => {
    const next = withBase(`/${pathPart}`);
    return `${attr}=${q}${next}"`;
  });

  // CSS url(/...)
  out = out.replace(/url\((['"]?)\/(?!\/)([^)'"]+)\1\)/gi, (m, quote, pathPart) => {
    const next = withBase(`/${pathPart}`);
    const q = quote || '';
    return `url(${q}${next}${q})`;
  });

  return out;
}

async function exportStatic() {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), SITE_URL: origin },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (buf) => process.stdout.write(String(buf)));
  child.stderr.on('data', (buf) => process.stderr.write(String(buf)));

  try {
    await waitForServer(`${origin}/health`);

    await rm(outDir, { recursive: true, force: true });
    await mkdir(outDir, { recursive: true });

    await cp(path.join(root, 'src', 'public'), outDir, { recursive: true });

    const brochureSrc = path.join(root, 'src', 'protected', 'sample-brochure.txt');
    const brochureDst = path.join(outDir, 'downloads', 'SJ-Brochure.txt');
    await mkdir(path.dirname(brochureDst), { recursive: true });
    await writeFile(brochureDst, await readFile(brochureSrc));

    const sitemapRes = await fetch(`${origin}/sitemap.xml`, { cache: 'no-store' });
    const sitemap = await sitemapRes.text();
    const urls = extractLocs(sitemap)
      .map((u) => {
        try {
          return new URL(u).pathname;
        } catch {
          return '/';
        }
      })
      .filter(Boolean);

    const staticPaths = Array.from(new Set(['/', '/404', '/robots.txt', '/sitemap.xml', ...urls]));

    for (const pathname of staticPaths) {
      if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
        const res = await fetch(`${origin}${pathname}`, { cache: 'no-store' });
        const text = await res.text();
        await savePage(pathname, text);
        continue;
      }
      const res = await fetch(`${origin}${pathname}`, {
        cache: 'no-store',
        headers: { Accept: 'text/html' }
      });
      const html = await res.text();
      await savePage(pathname, transformHtmlForStatic(html));
    }

    await writeFile(path.join(outDir, '.nojekyll'), '', 'utf-8');
    console.log(`Static export done: ${outDir}`);
    if (basePath) console.log(`Static base path: ${basePath}`);
  } finally {
    child.kill('SIGTERM');
  }
}

exportStatic().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
