// Exports every page as ONE self-contained .html file (CSS, JS, three.js, fonts and images inlined)
// so each page opens straight from disk in Chrome (file://), no server needed.
// Usage: npm run export   →  export/flowmelon-single-pages/*.html  +  export/flowmelon-single-pages.zip
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const OUT_BASE = path.join(ROOT, 'export');
const OUT = path.join(OUT_BASE, 'flowmelon-single-pages');

execSync('node build.mjs', { cwd: ROOT, stdio: 'inherit' });

// gl.js + three.js as a classic script exposing window.FMGL (ES modules can't load from file://)
const glBundle = (await build({
  entryPoints: [path.join(DIST, 'assets/js/gl.js')], bundle: true, format: 'iife', globalName: 'FMGL',
  minify: true, legalComments: 'inline', write: false, logLevel: 'warning',
})).outputFiles[0].text;

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.gif': 'image/gif' };
const cache = new Map();
const dataUri = (abs) => {
  if (!cache.has(abs)) cache.set(abs, `data:${MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(abs).toString('base64')}`);
  return cache.get(abs);
};
const safeJs = (js) => js.replace(/<\/script/gi, '<\\/script');

// flat file names: services/x.html → x.html, blog/x.html → blog-x.html, work/x.html → case-study-x.html
const flatName = (rel) => {
  const r = rel.replace(/\\/g, '/');
  if (r.startsWith('services/')) return r.slice(9);
  if (r.startsWith('blog/')) return 'blog-' + r.slice(5);
  if (r.startsWith('work/')) return 'case-study-' + r.slice(5);
  return r;
};

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
fs.rmSync(OUT_BASE, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const rel = path.relative(DIST, file);
  const dir = path.dirname(file);
  let html = fs.readFileSync(file, 'utf8');

  // stylesheets → <style>, resolving url() relative to the css file
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
    const cssPath = path.resolve(dir, href);
    const css = fs.readFileSync(cssPath, 'utf8').replace(/url\((['"]?)(?!data:|https?:|#)([^'")]+\.(?:woff2|webp|png|jpe?g|svg|gif))\1\)/g, (m, q, u) => `url('${dataUri(path.resolve(path.dirname(cssPath), u))}')`);
    return `<style>\n${css}\n</style>`;
  });
  html = html.replace(/\s*<link rel="preload"[^>]*>/g, '');
  html = html.replace(/<link rel="icon" href="([^"]+)"/, (_, h) => `<link rel="icon" href="${dataUri(path.resolve(dir, h))}"`);

  // extra libraries only where the page needs them
  const extras = [];
  if (/data-physics/.test(html)) extras.push(fs.readFileSync(path.join(DIST, 'assets/vendor/matter.min.js'), 'utf8'));
  if (/data-gl=/.test(html)) extras.push(glBundle);

  // scripts → inline (vendor first, then app.js, then page scripts — same order as before)
  let injectedExtras = false;
  html = html.replace(/<script src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
    const js = fs.readFileSync(path.resolve(dir, src), 'utf8');
    let out = `<script>\n${safeJs(js)}\n</script>`;
    if (!injectedExtras && /assets\/js\/app\.js$/.test(src)) { out = extras.map((e) => `<script>\n${safeJs(e)}\n</script>`).join('\n') + '\n' + out; injectedExtras = true; }
    return out;
  });

  // images & fonts referenced anywhere in markup (src, inline styles, data-* attributes)
  html = html.replace(/(?:\.\.?\/)+assets\/(?:img|fonts)\/[\w./-]+\.(?:webp|png|jpe?g|svg|woff2|gif)/g, (p) => dataUri(path.resolve(dir, p)));

  // internal links → flat file names
  html = html.replace(/href="((?:\.\.?\/)+[^"#?]*\.html)(#[^"]*)?"/g, (m, h, hash = '') => {
    const target = path.relative(DIST, path.resolve(dir, h));
    return `href="${flatName(target)}${hash}"`;
  });

  const name = flatName(rel);
  fs.writeFileSync(path.join(OUT, name), html);
  report.push([name, (Buffer.byteLength(html) / 1024 / 1024).toFixed(2) + ' MB']);
}

fs.writeFileSync(path.join(OUT, 'README.txt'), `FlowMelon — single-file pages\n\nEvery .html file here is fully self-contained (HTML + CSS + JS + GSAP + three.js + fonts + images).\nDouble-click any file (start with index.html) to open it in Chrome. No internet or server needed.\nLinks between pages work as long as the files stay together in this folder.\n\nPages:\n${report.map(([n, s]) => `  ${n.padEnd(42)} ${s}`).join('\n')}\n`);
execSync(`cd "${OUT_BASE}" && zip -qr -9 flowmelon-single-pages.zip flowmelon-single-pages`);
console.table(report);
console.log('Zip:', path.join(OUT_BASE, 'flowmelon-single-pages.zip'), (fs.statSync(path.join(OUT_BASE, 'flowmelon-single-pages.zip')).size / 1024 / 1024).toFixed(1) + ' MB');
