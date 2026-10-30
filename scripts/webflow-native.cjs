// Converts a built page (dist/) into Webflow-native WHTML insert payloads:
// - only class / combo selectors with :hover/:focus/:active (Webflow StyleParser rules)
// - complex selectors, tag resets, element-scoped CSS variables and inline styles are folded
//   into one generated combo class per distinct element signature (fx-xxxxxx)
// - ::before/::after become real child elements
// - rem → px per breakpoint (base 12.5px, ≤991 14px, ≤767 14.5px) matching the fluid site at 1366–1440
// - <use href="#icon"> SVGs are inlined; images point at Webflow asset URLs; links become Webflow paths
// Usage: node scripts/webflow-native.cjs <page.html> <assets.json> <out.json> [port]
const { chromium } = require('playwright');
const fs = require('fs');

const [, , PAGE, ASSETS, OUT, PORT = '4321'] = process.argv;
const assets = JSON.parse(fs.readFileSync(ASSETS, 'utf8'));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/*.js', (r) => r.abort());
  await page.goto(`http://localhost:${PORT}/${PAGE}`, { waitUntil: 'load' });
  const result = await page.evaluate(({ assets }) => {
    document.documentElement.className = '';
    const FACT = { main: 12.5, medium: 14, small: 14.5, xxl: 16 };
    const MEDIA = { '(max-width: 991px)': 'medium', '(max-width: 767px)': 'small', '(max-width: 479px)': 'tiny', '(min-width: 992px)': 'main' };
    const DROP = /^(font|will-change|animation.*|font-kerning|text-rendering|-webkit-.*|-moz-.*|cursor|isolation|contain|scroll-behavior|font-variation-settings|content|speak|touch-action|user-select|pointer-events|caret-color|text-wrap|overscroll-behavior.*)$/;
    const rootCS = getComputedStyle(document.documentElement);

    // ---------- helpers
    const splitDecls = (txt) => {
      const out = []; let depth = 0, cur = '';
      for (const ch of txt) {
        if (ch === '(') depth++; if (ch === ')') depth--;
        if (ch === ';' && depth === 0) { if (cur.trim()) out.push(cur); cur = ''; } else cur += ch;
      }
      if (cur.trim()) out.push(cur);
      return out.map((d) => { const i = d.indexOf(':'); const v = d.slice(i + 1).trim(); return [d.slice(0, i).trim(), v.replace(/\s*!important$/, ''), /!important$/.test(v)]; }).filter(([p]) => p);
    };
    const splitSel = (s) => { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
    const resolveVars = (val, cs) => {
      let guard = 0;
      while (/var\(/.test(val) && guard++ < 10) {
        val = val.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (m, name, fb) => {
          const v = (cs || rootCS).getPropertyValue(name).trim();
          return v || (fb !== undefined ? fb.trim() : '');
        });
      }
      return val;
    };
    const usesLocalVar = (val) => (val.match(/var\(\s*(--[\w-]+)/g) || []).some((m) => { const n = m.replace(/var\(\s*/, ''); return !rootCS.getPropertyValue(n).trim(); });
    const px = (val, bp) => val.replace(/(-?\d*\.?\d+)rem\b/g, (m, n) => `${+(parseFloat(n) * FACT[bp]).toFixed(2)}px`);
    const specificity = (sel) => { const s = sel.replace(/::?[\w-]+(\([^)]*\))?/g, (m) => (m.startsWith('::') ? ' ' : ' .p ')); return (s.match(/[.#\[]/g) || []).length * 10 + (s.match(/(^|[\s>+~])[a-z]/gi) || []).length; };
    const SIMPLE = /^(\.[A-Za-z_][\w-]*)+$/;

    // ---------- collect rules (base + allowed media), in source order
    const rules = []; let order = 0;
    const walk = (list, bp) => {
      for (const r of list) {
        if (r instanceof CSSStyleRule) rules.push({ sel: r.selectorText, decls: splitDecls(r.style.cssText), bp, order: order++ });
        else if (r instanceof CSSMediaRule) { const m = MEDIA[r.conditionText.trim()]; if (m) walk(r.cssRules, m); }
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, 'main'); } catch (e) {} }
    const rootVars = { main: {}, medium: {}, small: {}, tiny: {} };
    for (const r of rules) if (splitSel(r.sel).includes(':root')) for (const [p, v] of r.decls) if (p.startsWith('--')) rootVars[r.bp][p] = v;
    rootVars.medium = { ...rootVars.main, ...rootVars.medium }; rootVars.small = { ...rootVars.medium, ...rootVars.small }; rootVars.tiny = { ...rootVars.small, ...rootVars.tiny };
    const resolveRoot = (val, bp) => { let g = 0; while (/var\(/.test(val) && g++ < 10) val = val.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (m, n, fb) => rootVars[bp][n] ?? (fb !== undefined ? fb.trim() : m)); return val; };

    // ---------- prepare DOM: inline <use> icons, drop JS-only chrome
    const sprite = {};
    document.querySelectorAll('svg symbol').forEach((s) => (sprite[s.id] = s));
    document.querySelectorAll('svg use').forEach((u) => {
      const id = (u.getAttribute('href') || '').slice(1); const sym = sprite[id]; const svg = u.closest('svg');
      if (!sym || !svg) return;
      svg.setAttribute('viewBox', sym.getAttribute('viewBox'));
      u.replaceWith(...[...sym.childNodes].map((n) => n.cloneNode(true)));
    });
    document.querySelectorAll('.preloader,.transition,.cursor,.skip-link,body > svg,script,noscript,.gl-canvas canvas').forEach((n) => n.remove());
    // ---------- bake JS-filled content into static markup (Webflow has no runtime for these)
    document.querySelectorAll('[data-count]').forEach((el) => { const end = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.decimals || (String(end).split('.')[1] || '').length, 10); el.textContent = (el.dataset.prefix || '') + end.toFixed(dec) + (el.dataset.suffix || ''); });
    const TZ = { 'Asia/Karachi': 'PKT', 'America/New_York': 'EST', 'America/Los_Angeles': 'PST', 'Europe/London': 'GMT' };
    document.querySelectorAll('[data-clock]').forEach((el) => { el.textContent = TZ[el.dataset.clock] || el.dataset.clock; });
    document.querySelectorAll('[data-testimonials-nav]').forEach((nav) => { const n = nav.parentElement.querySelectorAll('.testimonial-card').length; nav.innerHTML = Array.from({ length: n }, (_, i) => `<span class="testimonials_dot${i === 0 ? ' is-active' : ''}"></span>`).join(''); });
    document.querySelectorAll('[data-hero] [data-sticker]').forEach((el) => el.setAttribute('data-hero-sticker', ''));
    document.querySelectorAll('[data-marquee] .marquee_group:only-child').forEach((g) => { const c = g.cloneNode(true); c.setAttribute('aria-hidden', 'true'); g.after(c); });

    // ---------- per element extra declarations
    const all = [...document.body.querySelectorAll('*')].filter((el) => !el.closest('svg') || el.tagName.toLowerCase() === 'svg');
    const extra = new Map(); // el -> [{bp,state,prop,val,spec,order}]
    const pseudo = new Map(); // el -> {before:[...], after:[...]}
    const add = (map, el, item) => { if (!map.has(el)) map.set(el, []); map.get(el).push(item); };
    const simpleOut = []; // {key, state, bp, prop, val, order}
    const hoverDesc = []; // skipped selectors needing runtime state
    const STATE_RX = /:(hover|focus|active)$/;
    const HTML_STATE = /\.(is-menu-open|has-cursor|js-ready|no-motion|is-returning|app-failed|app-ready|gl-ready|lenis|lenis-smooth|lenis-stopped|is-scrolled|is-hidden|is-split|split-line|word|is-loading|is-done|is-label|is-light|is-down)\b|:focus-visible|::selection|::placeholder|\[data-split\]|\[data-reveal\]|\[data-hero-item\]|\[data-lenis/;

    for (const r of rules) {
      for (let sel of splitSel(r.sel)) {
        if (HTML_STATE.test(sel)) continue;
        let pe = null; const peM = sel.match(/::?(before|after)$/); if (peM) { pe = peM[1]; sel = sel.slice(0, -peM[0].length); }
        let state = null; const st = sel.match(STATE_RX); if (st) { state = st[1]; sel = sel.slice(0, -st[0].length); }
        if (/:(hover|focus|active)/.test(sel) || (pe && state)) { hoverDesc.push(r.sel); continue; } // needs parent/runtime state → IX
        if (/^(html|body|:root|\*)$/.test(sel) || /^(html|body|:root)\b/.test(sel)) continue;
        if (!pe && SIMPLE.test(sel)) {
          for (const [prop, val, imp] of r.decls) simpleOut.push({ key: sel, state, bp: r.bp, prop, val, imp, order: r.order });
          continue;
        }
        let els = []; try { els = [...document.querySelectorAll(sel || '*')]; } catch (e) { continue; }
        const spec = specificity(sel) + (state ? 10 : 0);
        for (const el of els) {
          if (!all.includes(el)) continue;
          for (const [prop, val, imp] of r.decls) {
            const item = { bp: r.bp, state, prop, val, spec: spec + (imp ? 10000 : 0), order: r.order };
            if (pe) { if (!pseudo.has(el)) pseudo.set(el, { before: [], after: [] }); pseudo.get(el)[pe].push(item); } else add(extra, el, item);
          }
        }
      }
    }

    // simple-class declarations that depend on per-element custom properties → move to elements
    const simpleByKey = {};
    for (const d of simpleOut) {
      if (/^--/.test(d.prop)) continue;
      if (usesLocalVar(d.val)) {
        document.querySelectorAll(d.key).forEach((el) => all.includes(el) && add(extra, el, { ...d, spec: specificity(d.key), local: true }));
        continue;
      }
      (simpleByKey[d.key + '|' + (d.state || '')] ||= []).push(d);
    }

    // body-level inherited typography/colour → top-level roots (Webflow only allows class selectors)
    const bodyDecls = rules.filter((r) => splitSel(r.sel).some((x) => x === 'body' || x === 'html, body' || x === 'body.theme-dark' && document.body.classList.contains('theme-dark')));
    const roots = [document.querySelector('.navbar'), document.querySelector('.menu'), document.querySelector('.page-wrapper')].filter(Boolean);
    for (const r of bodyDecls) for (const [prop, val] of r.decls) {
      if (!/^(font-family|font-size|line-height|color|background|background-color)$/.test(prop)) continue;
      for (const el of roots) { if (/^background/.test(prop) && !el.classList.contains('page-wrapper')) continue; add(extra, el, { bp: r.bp, state: null, prop, val, spec: 1, order: r.order }); }
    }

    // inline styles → highest priority extras
    for (const el of all) {
      const st = el.getAttribute('style');
      if (st) for (const [prop, val] of splitDecls(st)) add(extra, el, { bp: 'main', state: null, prop, val, spec: 1000, order: 1e6 });
    }

    // ---------- value normalisation
    const norm = (prop, val, el) => {
      if (DROP.test(prop) || /^--/.test(prop)) return null;
      if (el) val = val.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (m, n, fb) => (n in rootVars.main ? m : (getComputedStyle(el).getPropertyValue(n).trim() || (fb || '').trim())));
      else if (/var\(/.test(val) && (val.match(/var\(\s*(--[\w-]+)/g) || []).some((x) => !(x.replace(/var\(\s*/, '') in rootVars.main))) val = resolveVars(val, null);
      if (!val || /\b(env|attr)\(/.test(val)) return null;
      if (/\b(min|max|clamp)\(/.test(val)) {
        const mm = val.match(/^min\(\s*100%\s*,\s*([^)]+)\)$/);
        if (mm && prop === 'width') return [['width', '100%'], ['max-width', mm[1].trim()]];
        if (el) { const c = getComputedStyle(el).getPropertyValue(prop); if (c) return [[prop, c]]; }
        return null;
      }
      if (/^(margin|padding|gap|border-radius|overflow|flex-flow)$/.test(prop) && !/var\(/.test(val)) {
        const d = document.createElement('div').style; d.cssText = `${prop}:${val}`;
        const out = []; for (let i = 0; i < d.length; i++) out.push([d[i], d.getPropertyValue(d[i])]);
        if (out.length) return out;
      }
      if (prop === 'inset') { const p = val.split(/\s+/); const [t, r = t, b = t, l = r] = p; return [['top', t], ['right', r], ['bottom', b], ['left', l]]; }
      if (prop === 'place-items') { const [a, j = a] = val.split(/\s+/); return [['align-items', a], ['justify-items', j]]; }
      if (prop === 'place-content') { const [a, j = a] = val.split(/\s+/); return [['align-content', a], ['justify-content', j]]; }
      if (prop === 'margin-inline' || prop === 'padding-inline') { const [a, b = a] = val.split(/\s+/); const k = prop.split('-')[0]; return [[k + '-left', a], [k + '-right', b]]; }
      if (prop === 'translate' || prop === 'rotate' || prop === 'scale') return null;
      if (/^(-webkit-)?mask(-image)?$/.test(prop)) return null;
      return [[prop, val]];
    };
    // cascade raw decls into {bp:{state:{prop:val}}}, then rem→px per breakpoint with inheritance
    const build = (items, el) => {
      // true cascade per breakpoint: every rule active at that width, ordered by (specificity, source order)
      const ACTIVE = { main: ['main'], medium: ['main', 'medium'], small: ['main', 'medium', 'small'], tiny: ['main', 'medium', 'small', 'tiny'] };
      const sorted = [...items].sort((a, b) => a.spec - b.spec || a.order - b.order);
      const normed = sorted.map((it) => ({ it, n: norm(it.prop, it.val, el) })).filter((x) => x.n);
      const eff = {};
      for (const bp of ['main', 'medium', 'small', 'tiny']) {
        eff[bp] = {};
        for (const { it, n } of normed) { if (!ACTIVE[bp].includes(it.bp)) continue; const s = it.state || ''; for (const [p, v] of n) (eff[bp][s] ||= {})[p] = v; }
      }
      const out = { main: {}, medium: {}, small: {}, tiny: {}, xxl: {} };
      const states = new Set(Object.values(eff).flatMap((o) => Object.keys(o)));
      const usedTiny = items.some((i) => i.bp === 'tiny');
      for (const s of states) {
        const val = (bp, p) => (eff[bp][s] && p in eff[bp][s] ? px(resolveRoot(eff[bp][s][p], bp), bp === 'tiny' ? 'small' : bp) : undefined);
        const props = new Set(['main', 'medium', 'small', 'tiny'].flatMap((bp) => Object.keys(eff[bp][s] || {})));
        const m = {}, md = {}, sm = {}, tn = {}, xx = {};
        for (const p of props) {
          const v0 = val('main', p), v1 = val('medium', p), v2 = val('small', p), v3 = val('tiny', p);
          if (v0 !== undefined) m[p] = v0;
          const vx = eff.main[s] && p in eff.main[s] ? px(resolveRoot(eff.main[s][p], 'main'), 'xxl') : undefined;
          if (vx !== undefined && vx !== v0) xx[p] = vx;
          if (v1 !== undefined && v1 !== v0) md[p] = v1;
          const prev1 = v1 !== undefined ? v1 : v0;
          if (v2 !== undefined && v2 !== prev1) sm[p] = v2;
          if (usedTiny && v3 !== undefined && v3 !== (v2 !== undefined ? v2 : prev1)) tn[p] = v3;
        }
        if (Object.keys(m).length) out.main[s] = m;
        if (Object.keys(md).length) out.medium[s] = md;
        if (Object.keys(sm).length) out.small[s] = sm;
        if (Object.keys(tn).length) out.tiny[s] = tn;
        if (Object.keys(xx).length) out.xxl[s] = xx;
      }
      return out;
    };
    const cssOf = (selector, styles) => {
      const Q = { main: '', medium: '@media screen and (max-width: 991px)', small: '@media screen and (max-width: 767px)', tiny: '@media screen and (max-width: 479px)', xxl: '@media screen and (min-width: 1920px)' };
      let css = '';
      for (const bp of ['main', 'medium', 'small', 'tiny', 'xxl']) {
        let block = '';
        for (const s in styles[bp]) {
          const body = Object.entries(styles[bp][s]).map(([p, v]) => `${p}:${v}`).join(';');
          if (body) block += `${selector}${s ? ':' + s : ''}{${body}}`;
        }
        if (block) css += Q[bp] ? `${Q[bp]}{${block}}` : block;
      }
      return css;
    };

    // ---------- svg internals: bake CSS into presentation attributes (Webflow can't class-style svg children)
    document.querySelectorAll('svg *').forEach((n) => {
      const cs = getComputedStyle(n); const col = cs.color;
      const keep = (v) => (v === col ? 'currentColor' : v);
      if (['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'textPath', 'g'].includes(n.tagName)) {
        n.setAttribute('fill', keep(cs.fill));
        if (cs.stroke && cs.stroke !== 'none') {
          n.setAttribute('stroke', keep(cs.stroke)); n.setAttribute('stroke-width', parseFloat(cs.strokeWidth));
          if (cs.strokeLinecap !== 'butt') n.setAttribute('stroke-linecap', cs.strokeLinecap);
          if (cs.strokeLinejoin !== 'miter') n.setAttribute('stroke-linejoin', cs.strokeLinejoin);
          if (cs.strokeDasharray !== 'none') n.setAttribute('stroke-dasharray', cs.strokeDasharray.replace(/px/g, ''));
        }
        if (cs.opacity !== '1') n.setAttribute('opacity', cs.opacity);
      }
      if (n.tagName === 'text' || n.tagName === 'textPath') { n.setAttribute('font-family', cs.fontFamily); n.setAttribute('font-size', cs.fontSize); n.setAttribute('font-weight', cs.fontWeight); if (cs.letterSpacing !== 'normal') n.setAttribute('letter-spacing', cs.letterSpacing); }
      n.removeAttribute('class');
    });

    // ---------- svg: Webflow stores svg classes as raw attributes → move classes + extra styles to a wrapper span
    document.querySelectorAll('svg').forEach((svg) => {
      const hasCls = svg.classList.length > 0; const ex = extra.get(svg);
      if (!hasCls && !ex) { svg.setAttribute('width', svg.getAttribute('width') || '100%'); svg.setAttribute('height', svg.getAttribute('height') || '100%'); return; }
      const cs = getComputedStyle(svg);
      const wrap = document.createElement('span');
      const aw = svg.getAttribute('width'), ah = svg.getAttribute('height');
      svg.classList.forEach((c) => wrap.classList.add(c)); svg.removeAttribute('class');
      svg.parentNode.insertBefore(wrap, svg); wrap.appendChild(svg);
      const items = (ex || []).slice(); extra.delete(svg);
      items.push({ bp: 'main', state: null, prop: 'display', val: cs.display === 'inline' ? 'inline-block' : 'block', spec: 0, order: -1 });
      items.push({ bp: 'main', state: null, prop: 'line-height', val: '0', spec: 0, order: -1 });
      if (aw && /^\d+(\.\d+)?$/.test(aw)) items.push({ bp: 'main', state: null, prop: 'width', val: aw + 'px', spec: 0, order: -1 });
      if (ah && /^\d+(\.\d+)?$/.test(ah)) items.push({ bp: 'main', state: null, prop: 'height', val: ah + 'px', spec: 0, order: -1 });
      extra.set(wrap, items); all.push(wrap);
      svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    });

    // ---------- Webflow class model: first class = global base; everything else folds into ONE combo per element
    const sigToClass = {};
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).slice(0, 5); };
    const classCss = {}; // key -> css
    const baseUsed = new Set();
    const keyClasses = (k) => k.split('|')[0].split('.').filter(Boolean);
    const baseOwn = (base) => { // props the base class itself sets (any bp/state)
      const set = new Set();
      for (const st of ['', 'hover', 'focus', 'active']) (simpleByKey['.' + base + '|' + st] || []).forEach((d) => (norm(d.prop, d.val, null) || []).forEach(([p]) => set.add(p)));
      return set;
    };
    const targets = new Set([...extra.keys(), ...all.filter((el) => el.classList && el.classList.length)]);
    for (const el of targets) {
      const cls = [...el.classList];
      const base = cls[0] || null;
      const items = (extra.get(el) || []).slice();
      // simple rules that are not exactly the base class fold into the combo
      for (const k in simpleByKey) {
        const kc = keyClasses(k); const st = k.split('|')[1] || null;
        if (!kc.every((c) => cls.includes(c))) continue;
        for (const d of simpleByKey[k]) items.push({ ...d, state: st, spec: kc.length * 10 + (st ? 10 : 0) + (d.imp ? 10000 : 0) });
      }
      const own = base ? baseOwn(base) : new Set();
      const filtered = items.filter((it) => !(it.spec <= 1 && own.has(it.prop)));
      const ownSimple = { medium: {}, small: {} };
      if (base) for (const d of simpleByKey['.' + base + '|'] || []) if (d.bp === 'medium' || d.bp === 'small') { const n = norm(d.prop, d.val, null); if (n) for (const [p, v] of n) ownSimple[d.bp][p] = v; }
      const styles = filtered.length ? build(filtered, el) : { main: {}, medium: {}, small: {}, tiny: {} };
      if (base) baseUsed.add(base);
      // only needs a combo when the cascade differs from what the base class alone produces
      const onlyBase = cls.length <= 1 && !(extra.get(el) || []).length;
      const has = Object.values(styles).some((o) => Object.keys(o).length);
      if (onlyBase || !has) { el.className = base || ''; continue; }
      const dropped = cls.slice(1).filter((c) => !/^fx-/.test(c));
      const label = (dropped.length ? dropped.join('-') : (base ? 'x' : el.tagName.toLowerCase())).replace(/[^\w-]/g, '').slice(0, 28);
      const sig = (base || '') + '|' + JSON.stringify({ ...styles, xxl: undefined });
      let combo = sigToClass[sig];
      if (!combo) { combo = (base ? '' : 'el-') + label + '-' + hash(sig); sigToClass[sig] = combo; const sel = (base ? '.' + base : '') + '.' + combo; classCss[sel] = cssOf(sel, styles); }
      el.className = base ? base + ' ' + combo : combo;
    }
    // pseudo elements → real children (own global class each)
    for (const [el, pe] of pseudo) {
      for (const where of ['before', 'after']) {
        if (!pe[where].length) continue;
        const contentDecl = pe[where].filter((d) => d.prop === 'content').pop();
        if (!contentDecl || /^(none|normal)$/.test(contentDecl.val) || el.closest('svg')) continue;
        const styles = build(pe[where], el);
        if (!Object.values(styles).some((o) => Object.keys(o).length)) continue;
        const nm = (el.classList[0] || 'el') + '_' + where;
        const sig = nm + JSON.stringify({ ...styles, xxl: undefined });
        let c = sigToClass[sig]; if (!c) { c = nm + '-' + hash(sig); sigToClass[sig] = c; classCss['.' + c] = cssOf('.' + c, styles); }
        const child = document.createElement('span'); child.className = c; child.setAttribute('aria-hidden', 'true');
        const txt = contentDecl.val.match(/^["'](.+)["']$/); if (txt) child.textContent = txt[1];
        where === 'before' ? el.prepend(child) : el.append(child);
      }
    }
    // global base classes (only their own exact rules)
    for (const base of baseUsed) for (const st of ['', 'hover', 'focus', 'active']) {
      const k = '.' + base + '|' + st; if (!simpleByKey[k]) continue;
      const styles = build(simpleByKey[k].map((d) => ({ ...d, state: st || null, spec: 10 })), null);
      classCss[k] = cssOf('.' + base, styles);
    }

    // ---------- svg: move box styling to a wrapper, svg fills it
    // (Webflow keeps svg class only as a raw attribute)

    // ---------- assets & links
    const assetFor = (src) => {
      const m = src.match(/assets\/img\/(?:(projects|logos|icons|team)\/)?([\w.-]+?)\.(webp|svg|png|jpe?g)$/); if (!m) return null;
      const [, dir, name, ext] = m;
      const key = dir === 'projects' ? `project-${name}.${ext}` : dir === 'logos' ? `logo-${name}.${ext}` : dir === 'icons' ? `icon-${name}.${ext}` : dir === 'team' ? `${name}.${ext}` : name.startsWith('hero-fallback') ? 'hero-fluted-glass.webp' : `${name}.${ext}`;
      return assets[key] || assets[key.replace(/-sm(\.\w+)$/, '$1')] || null;
    };
    const missing = new Set();
    document.querySelectorAll('img').forEach((img) => { const u = assetFor(img.getAttribute('src') || ''); if (u) img.setAttribute('src', u); else missing.add(img.getAttribute('src')); img.removeAttribute('srcset'); img.removeAttribute('loading'); });
    for (const k in classCss) classCss[k] = classCss[k].replace(/url\((['"]?)(?!data:)([^'")]+\.(?:webp|png|jpe?g|svg))\1\)/g, (m, q, u) => { const a = assetFor(u); if (!a) missing.add(u); return a ? `url('${a}')` : 'none'; });
    const route = (href) => {
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return href;
      const [p, hash] = href.split('#');
      const clean = p.replace(/^(\.\.\/|\.\/)+/, '').replace(/\.html$/, '');
      const slug = clean === 'index' || clean === '' ? '/' : '/' + clean.replace(/^services\//, '').replace(/^blog\//, 'blog-').replace(/^work\//, 'case-study-');
      return slug + (hash ? '#' + hash : '');
    };
    document.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', route(a.getAttribute('href'))));

    // ---------- serialize top-level blocks
    document.querySelectorAll('[style]').forEach((n) => n.removeAttribute('style'));
    const clean = (node) => { node.querySelectorAll('[class=""]').forEach((n) => n.removeAttribute('class')); return node.outerHTML.replace(/\s+\n\s*/g, ' ').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' '); };
    const usedClasses = (node) => { const s = new Set(); [node, ...node.querySelectorAll('[class]')].forEach((n) => n.classList && n.classList.forEach((c) => s.add(c))); return s; };
    const cssFor = (node) => {
      const used = usedClasses(node);
      return Object.entries(classCss).filter(([k]) => k.split('|')[0].split('.').filter(Boolean).every((c) => used.has(c))).map(([, v]) => v).join('');
    };
    const blocks = [];
    const push = (name, node, parent) => blocks.push({ name, parent, html: clean(node), css: cssFor(node) });
    const nav = document.querySelector('.navbar'); if (nav) push('navbar', nav, 'body');
    const menu = document.querySelector('.menu'); if (menu) push('menu', menu, 'body');
    const main = document.querySelector('main');
    const wrapper = document.querySelector('.page-wrapper');
    const shell = wrapper.cloneNode(false); const mainShell = main.cloneNode(false); shell.appendChild(mainShell);
    blocks.push({ name: 'page-shell', parent: 'body', html: clean(shell), css: cssFor(shell) });
    [...main.children].forEach((c, i) => push('section-' + i + '-' + (c.className.split(' ')[0] || c.tagName.toLowerCase()), c, 'main'));
    const footer = document.querySelector('footer'); if (footer) push('footer', footer, 'page-wrapper');
    return { blocks, missing: [...missing], hoverDesc: [...new Set(hoverDesc)] };
  }, { assets });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  console.log(result.blocks.map((b) => `${b.name.padEnd(40)} html ${String(b.html.length).padStart(6)}  css ${String(b.css.length).padStart(6)}`).join('\n'));
  console.log('missing assets:', result.missing);
  console.log('hover-dependent selectors skipped:', result.hoverDesc.length);
  await browser.close();
})();
