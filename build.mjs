// FlowMelon static site builder.
// - src/pages/**/*.html  -> dist/**/*.html (wrapped in src/partials/layout.html)
// - <!-- @include name {"key":"value"} --> pulls in src/partials/name.html
// - {{key}} / {{key|fallback}} interpolate page meta + include args; {{root}} is the relative path to the site root
// - public/** is copied as-is
// Usage: node build.mjs [--watch] [--serve] [--port=4321]

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, 'src');
const PAGES = path.join(SRC, 'pages');
const PARTIALS = path.join(SRC, 'partials');
const PUBLIC = path.join(ROOT, 'public');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const DIST = outArg ? path.resolve(outArg.split('=')[1]) : path.join(ROOT, 'dist');
const args = process.argv.slice(2);
const SITE_URL = 'https://www.flowmelon.com';

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });

function parseMeta(src) {
  const m = src.match(/^<!--\s*\n([\s\S]*?)\n-->\s*\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

function interpolate(str, vars) {
  return str.replace(/\{\{\s*([\w.-]+)(?:\|([^}]*))?\s*\}\}/g, (_, k, fb) =>
    vars[k] !== undefined && vars[k] !== '' ? vars[k] : fb !== undefined ? fb : ''
  );
}

function render(str, vars, depth = 0) {
  if (depth > 12) throw new Error('Include depth exceeded');
  const withIncludes = str.replace(/<!--\s*@include\s+([\w/-]+)\s*(\{[\s\S]*?\})?\s*-->/g, (_, name, json) => {
    const file = path.join(PARTIALS, name + '.html');
    if (!fs.existsSync(file)) throw new Error(`Missing partial: ${name}`);
    const local = json ? { ...vars, ...JSON.parse(interpolate(json, vars)) } : vars;
    return render(fs.readFileSync(file, 'utf8'), local, depth + 1);
  });
  return interpolate(withIncludes, vars);
}

function build() {
  const t0 = Date.now();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.cpSync(PUBLIC, DIST, { recursive: true });
  const layout = fs.readFileSync(path.join(PARTIALS, 'layout.html'), 'utf8');
  const urls = [];
  for (const file of walk(PAGES).filter((f) => f.endsWith('.html'))) {
    const rel = path.relative(PAGES, file);
    const depth = rel.split(path.sep).length - 1;
    const root = depth ? '../'.repeat(depth) : './';
    const { meta, body } = parseMeta(fs.readFileSync(file, 'utf8'));
    const slug = rel.replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
    const vars = { root, slug, canonical: `${SITE_URL}/${slug}`, year: String(new Date().getFullYear()), ...meta };
    vars.pageJs = meta.js ? meta.js.split(',').map((c) => `  <script src="${root}assets/js/pages/${c.trim()}.js" defer></script>`).join('\n') : '';
    vars.pageCss = meta.css ? meta.css.split(',').map((c) => `  <link rel="stylesheet" href="${root}assets/css/pages/${c.trim()}.css">`).join('\n') : '';
    const content = render(body, vars);
    const html = render(layout, { ...vars, content });
    const out = path.join(DIST, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    if (rel !== '404.html') urls.push(vars.canonical);
  }
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url><loc>${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );
  console.log(`Built ${urls.length + 1} pages in ${Date.now() - t0}ms`);
}

build();

if (args.includes('--watch')) {
  let timer;
  for (const dir of [SRC, PUBLIC]) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { build(); } catch (e) { console.error(e.message); }
      }, 80);
    });
  }
}

if (args.includes('--serve')) {
  const port = Number((args.find((a) => a.startsWith('--port=')) || '--port=4321').split('=')[1]);
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
  http
    .createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(DIST, p);
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
      if (!fs.existsSync(file)) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(DIST, '404.html'))); }
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    })
    .listen(port, () => console.log(`Serving dist/ on http://localhost:${port}`));
}
