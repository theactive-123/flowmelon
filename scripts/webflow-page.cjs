// Prepares one page for native Webflow insertion.
// Usage: node webflow-page.cjs <page.html> <assets.json> <outDir> <registry.json>
// Writes outDir/blocks/NN.json ({name,parent,html,css}), xxl.json, fixes.json, imgattrs.json and updates the registry
// (selectors whose CSS has already been sent to Webflow, so later blocks/pages only reference the class).
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const [, , PAGE, ASSETS, OUT, REG] = process.argv;
fs.mkdirSync(path.join(OUT, 'blocks'), { recursive: true });
const raw = path.join(OUT, 'converted.json');
execFileSync('node', [path.join(__dirname, 'webflow-native.cjs'), PAGE, ASSETS, raw], { stdio: 'inherit' });
const d = JSON.parse(fs.readFileSync(raw, 'utf8'));
const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : {};
const split = (css) => { const o = []; let dp = 0, s = 0; for (let i = 0; i < css.length; i++) { if (css[i] === '{') dp++; else if (css[i] === '}') { dp--; if (!dp) { o.push(css.slice(s, i + 1)); s = i + 1; } } } return o; };
const MQ = { 991: 'medium', 767: 'small', 479: 'tiny' };
const xxl = {}; const fixes = []; const imgattrs = [];
const sty = (sel, bp, pseudo, props) => { const parts = sel.slice(1).split('.'); const u = { style_name: parts[parts.length - 1], properties: props }; if (parts.length > 1) u.parent_style_names = parts.slice(0, -1); if (bp && bp !== 'main') u.breakpoint_id = bp; if (pseudo) u.pseudo = pseudo; return { label: sel + (pseudo ? ':' + pseudo : '') + (bp ? '@' + bp : ''), update_style: u }; };
const expand = (p, v) => {
  if (p === 'border') { const [w, s, ...c] = v.split(' '); return ['top', 'right', 'bottom', 'left'].flatMap((x) => [[`border-${x}-width`, w], [`border-${x}-style`, s], [`border-${x}-color`, c.join(' ')]]); }
  if (p === 'padding' || p === 'margin') { const t = v.match(/calc\([^)]*\)|\S+/g); const [a, b = a, c = a, e = b] = t; return [[`${p}-top`, a], [`${p}-right`, b], [`${p}-bottom`, c], [`${p}-left`, e]]; }
  if (p === 'background') { const m = v.match(/^(.*gradient\(.*\)),\s*(#[0-9a-f]+|rgba?\([^)]*\))$/i); if (m) return [['background-image', m[1]], ['background-color', m[2]]]; if (/gradient\(/.test(v)) return [['background-image', v]]; return [['background-color', v]]; }
  return [[p, v]];
};
const rulesOf = (r) => { // -> [{bp, sel, pseudo, decls:[[p,v]]}]
  let bp = 'main', body = r;
  if (r.startsWith('@media')) { const w = r.match(/(max|min)-width:\s*(\d+)/); bp = w[1] === 'min' ? 'xxl' : MQ[w[2]]; body = r.slice(r.indexOf('{') + 1, -1); }
  return split(body).map((x) => { let sel = x.slice(0, x.indexOf('{')).trim(); let pseudo = null; if (sel.endsWith(':hover')) { pseudo = 'hover'; sel = sel.slice(0, -6); } const decls = x.slice(x.indexOf('{') + 1, -1).split(';').filter(Boolean).map((dc) => { const i = dc.indexOf(':'); return [dc.slice(0, i).trim(), dc.slice(i + 1).trim()]; }); return { bp, sel, pseudo, decls, raw: x }; });
};
// button fill/hover colours per variant (the converter resolves the ::before fill once for every button)
const FILL = [[/is-white/, 'is-lime-fill', null], [/is-lime/, 'is-white-fill', null], [/is-ghost-light/, 'is-white-fill', '#03011d'], [/is-secondary/, null, '#fff'], [/is-blue/, null, null]];
const FILL_CSS = { 'is-blue-fill': '#146ef5', 'is-lime-fill': '#c6f43c', 'is-white-fill': '#ffffff' };
function fixButtons(b) {
  const extra = new Set();
  b.html = b.html.replace(/<a ([^>]*?)class="button( [^"]*)?"([^>]*)><div class="(button_before-[\w-]+)"/g, (m, pre, combo = '', post, before) => {
    const c = combo.trim(); const hit = FILL.find(([re]) => re.test(c));
    const fill = hit ? hit[1] : 'is-blue-fill';
    if (hit && hit[2] && c) extra.add(`.button.${c}:hover{color:${hit[2]}}`);
    if (fill) extra.add(`.${before}.${fill}{background:${FILL_CSS[fill]}}`);
    return `<a ${pre}class="button${combo}"${post}><div class="${before}${fill ? ' ' + fill : ''}"`;
  });
  b.css += [...extra].join('');
}
let n = 0;
const newAll = new Set();
for (const b of d.blocks) {
  fixButtons(b);
  const keep = [];
  for (const r of split(b.css)) {
    const sub = rulesOf(r); const sel = sub[0].sel;
    if (reg[sel]) continue; // class already exists in Webflow with its full CSS
    if (sub[0].bp === 'xxl') { for (const s of sub) (xxl[s.sel + '|' + (s.pseudo || '')] ||= []).push(...s.decls); continue; }
    keep.push(r);
    for (const s of sub) { // properties the WHTML builder silently drops
      const bad = s.decls.filter(([p, v]) => (/^background/.test(p) && (/currentcolor/i.test(v) || (v.match(/gradient\(/g) || []).length > 1)));
      if (bad.length) fixes.push(sty(s.sel, s.bp, s.pseudo, bad.flatMap(([p, v]) => expand(p, v)).map(([p, v]) => ({ property_name: p, property_value: v }))));
    }
  }
  const newSel = new Set(keep.flatMap((r) => rulesOf(r).map((s) => s.sel)));
  for (const s of newSel) { reg[s] = 1; newAll.add(s); }
  // images lose data-* attributes on insert: record them in document order per block
  let i = 0; for (const m of b.html.matchAll(/<img\b([^>]*)>/g)) { const attrs = [...m[1].matchAll(/\s(data-[\w-]+)="([^"]*)"/g)].map((a) => ({ name: a[1], value: a[2] })); if (attrs.length) imgattrs.push({ block: n, img: i, attrs }); i++; }
  fs.writeFileSync(path.join(OUT, 'blocks', String(n).padStart(2, '0') + '.json'), JSON.stringify({ name: b.name, parent: b.parent, html: b.html, css: keep.join('') }));
  n++;
}
// 1920px values only for selectors this page created (existing classes already carry theirs)
const xxlActs = Object.entries(xxl).filter(([k]) => newAll.has(k.split('|')[0])).map(([k, decls]) => { const [sel, ps] = k.split('|'); return sty(sel, 'xxl', ps || null, decls.flatMap(([p, v]) => expand(p, v)).map(([p, v]) => ({ property_name: p, property_value: v }))); });
fs.writeFileSync(path.join(OUT, 'xxl.json'), JSON.stringify(xxlActs));
fs.writeFileSync(path.join(OUT, 'fixes.json'), JSON.stringify(fixes));
fs.writeFileSync(path.join(OUT, 'imgattrs.json'), JSON.stringify(imgattrs));
fs.writeFileSync(REG, JSON.stringify(reg));
console.log(JSON.stringify({ blocks: n, sizes: fs.readdirSync(path.join(OUT, 'blocks')).map((f) => f + ':' + fs.statSync(path.join(OUT, 'blocks', f)).size), xxl: xxlActs.length, fixes: fixes.length, imgattrs: imgattrs.length }));
