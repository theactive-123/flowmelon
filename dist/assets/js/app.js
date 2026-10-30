/* ==========================================================================
   FlowMelon — interaction engine
   Everything is driven by data-attributes so the same file can be dropped
   into Webflow (Site settings → Custom code → Footer) unchanged.
   Requires: gsap, ScrollTrigger, SplitText, Draggable, InertiaPlugin,
             MotionPathPlugin, CustomEase, Lenis.
   ========================================================================== */
(() => {
  'use strict';

  const ROOT = (document.currentScript && document.currentScript.dataset.root) || './';
  const html = document.documentElement;
  const body = document.body;
  const REDUCE = html.classList.contains('no-motion');
  const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin, MotionPathPlugin, CustomEase);
  CustomEase.create('fm', '0.16, 1, 0.3, 1');
  CustomEase.create('fmio', '0.77, 0, 0.175, 1');
  gsap.defaults({ ease: 'fm', duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();
  const DESKTOP = '(min-width: 992px)';
  const state = { lenis: null, menuOpen: false, mouse: { x: innerWidth / 2, y: innerHeight / 2 } };
  window.FlowMelon = state;

  window.addEventListener('pointermove', (e) => { state.mouse.x = e.clientX; state.mouse.y = e.clientY; }, { passive: true });

  /* ---------------------------------------------------------------- smooth scroll */
  function initLenis() {
    if (REDUCE) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.4 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    state.lenis = lenis;
  }
  const scrollTo = (target) => (state.lenis ? state.lenis.scrollTo(target, { duration: 1.6 }) : (typeof target === 'number' ? scrollTo2(target) : target.scrollIntoView({ behavior: 'smooth' })));
  const scrollTo2 = (y) => window.scrollTo({ top: y, behavior: 'smooth' });

  /* ---------------------------------------------------------------- preloader / page transitions */
  function preloader() {
    const pre = $('.preloader');
    const cols = $$('.transition_col');
    return new Promise((resolve) => {
      if (html.classList.contains('is-returning') || REDUCE || !pre) {
        if (pre) pre.remove();
        if (REDUCE) { gsap.set(cols, { scaleY: 0 }); return resolve(); }
        gsap.to(cols, { scaleY: 0, transformOrigin: 'top', duration: 0.9, ease: 'fmio', stagger: 0.06, delay: 0.05, onComplete: resolve });
        setTimeout(resolve, 450); // start the intro while the columns are still leaving
        return;
      }
      gsap.set(cols, { scaleY: 0 });
      const count = $('[data-preloader-count]', pre);
      const arcs = $$('.pl-arc', pre);
      const loaded = new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })));
      const obj = { v: 0 };
      const tl = gsap.timeline();
      tl.from(arcs, { scale: 0, transformOrigin: '0% 100%', opacity: 0, stagger: 0.12, duration: 0.9, ease: 'back.out(1.8)' })
        .to(obj, { v: 86, duration: 1.1, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, '0'); gsap.set('.preloader_bar span', { scaleX: obj.v / 100 }); } }, 0);
      Promise.all([loaded, new Promise((r) => tl.eventCallback('onComplete', r))]).then(() => {
        gsap.timeline({ onComplete: () => { pre.remove(); } })
          .to(obj, { v: 100, duration: 0.3, ease: 'power2.out', onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, '0'); gsap.set('.preloader_bar span', { scaleX: obj.v / 100 }); } })
          .to(arcs, { y: -20, opacity: 0, stagger: 0.04, duration: 0.4, ease: 'power3.in' })
          .to('.preloader_inner, .preloader_word', { opacity: 0, duration: 0.4 }, '<')
          .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.95, ease: 'fmio' }, '-=0.2')
          .add(resolve, '-=0.6');
      });
    });
  }

  function initTransitions() {
    const cols = $$('.transition_col');
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (REDUCE) return;
      e.preventDefault();
      if (state.menuOpen) closeMenu(true);
      gsap.to(cols, { scaleY: 1, transformOrigin: 'bottom', duration: 0.7, ease: 'fmio', stagger: 0.05, onComplete: () => { location.href = url.href; } });
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(cols, { scaleY: 0 }); });
  }

  /* ---------------------------------------------------------------- cursor */
  function initCursor() {
    const cursor = $('.cursor');
    if (!cursor || TOUCH || REDUCE) { if (cursor) cursor.remove(); return; }
    html.classList.add('has-cursor');
    const ring = $('.cursor_ring', cursor);
    const dot = $('.cursor_dot', cursor);
    const label = $('.cursor_label', cursor);
    const xr = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const yr = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    const xd = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const yd = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    window.addEventListener('pointermove', (e) => {
      cursor.classList.remove('is-hidden');
      xr(e.clientX); yr(e.clientY); xd(e.clientX); yd(e.clientY);
      const t = e.target;
      const lab = t.closest && t.closest('[data-cursor]');
      if (lab) { label.textContent = lab.dataset.cursor; cursor.classList.add('is-label'); cursor.classList.remove('is-hover'); }
      else {
        cursor.classList.remove('is-label');
        cursor.classList.toggle('is-hover', !!(t.closest && t.closest('a, button, [data-cursor-hover], input, textarea, select, label, [data-sticker]')));
      }
      cursor.classList.toggle('is-light', !!(t.closest && t.closest('[data-theme="dark"], .section-dark, .menu_panel, .is-dark')));
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  }

  /* ---------------------------------------------------------------- magnetic */
  function initMagnetic(scope = document) {
    if (TOUCH || REDUCE) return;
    $$('[data-magnetic]', scope).forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * strength);
        yTo((e.clientY - r.top - r.height / 2) * strength);
      });
      el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' }); });
    });
  }

  /* ---------------------------------------------------------------- navbar */
  function initNavbar() {
    const nav = $('[data-navbar]');
    if (!nav) return;
    let last = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 20);
        if (!state.menuOpen) nav.classList.toggle('is-hidden', y > 300 && y > last + 2);
        if (y < last - 2) nav.classList.remove('is-hidden');
        last = y;
      },
    });
    const half = () => nav.offsetHeight / 2;
    $$('[data-theme="dark"]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec, start: () => `top ${half()}`, end: () => `bottom ${half()}`,
        onToggle: (self) => nav.classList.toggle('is-dark', self.isActive),
      });
    });
  }

  /* ---------------------------------------------------------------- menu */
  let menuTl;
  function initMenu() {
    const menu = $('[data-menu]');
    const toggle = $('[data-menu-toggle]');
    if (!menu || !toggle) return;
    const page = body.dataset.page;
    const sub = body.dataset.sub;
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === page || (sub && a.dataset.nav === sub)) { a.classList.add('is-current'); a.setAttribute('aria-current', 'page'); }
    });
    const links = $$('.menu_link', menu);
    menuTl = gsap.timeline({ paused: true, defaults: { ease: 'fmio' } })
      .to('.menu_backdrop', { opacity: 1, duration: 0.6 }, 0)
      .fromTo('.menu_panel', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 0.9 }, 0)
      .fromTo(links, { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 1, ease: 'fm', stagger: 0.06 }, 0.3)
      .fromTo('[data-menu-fade]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'fm', stagger: 0.1 }, 0.55)
      .fromTo('.menu_preview', { opacity: 0, scale: 0.9, rotate: -3 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.1, ease: 'fm' }, 0.35);
    toggle.addEventListener('click', () => (state.menuOpen ? closeMenu() : openMenu()));
    $$('[data-menu-close]').forEach((el) => el.addEventListener('click', () => closeMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.menuOpen) closeMenu(); });
    const imgs = $$('.menu_preview-img', menu);
    links.forEach((l) => l.addEventListener('pointerenter', () => {
      imgs.forEach((i) => i.classList.toggle('is-active', i.dataset.preview === l.dataset.nav));
    }));
  }
  function openMenu() {
    state.menuOpen = true;
    html.classList.add('is-menu-open');
    const menu = $('[data-menu]');
    menu.setAttribute('aria-hidden', 'false');
    $('[data-menu-toggle]').setAttribute('aria-expanded', 'true');
    state.lenis && state.lenis.stop();
    menuTl.timeScale(1).play();
    setTimeout(() => { const f = $('.menu_link', menu); f && f.focus({ preventScroll: true }); }, 400);
  }
  function closeMenu(instant) {
    state.menuOpen = false;
    $('[data-menu]').setAttribute('aria-hidden', 'true');
    $('[data-menu-toggle]').setAttribute('aria-expanded', 'false');
    state.lenis && state.lenis.start();
    if (instant) { menuTl.progress(0).pause(); html.classList.remove('is-menu-open'); return; }
    menuTl.timeScale(1.6).reverse().eventCallback('onReverseComplete', () => html.classList.remove('is-menu-open'));
  }

  /* ---------------------------------------------------------------- text splitting */
  function splitLines(el, opts = {}) {
    const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'split-line', wordsClass: 'word', ...opts });
    el.classList.add('is-split');
    return split;
  }

  /* ---------------------------------------------------------------- intro (hero) */
  function playIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'fm' } });
    const title = $('[data-hero-title]');
    if (title && !REDUCE) {
      const s = splitLines(title);
      tl.from(s.lines.length > 0 ? $$('.word', title) : title, { yPercent: 115, rotate: 3, duration: 1.4, stagger: 0.035 }, 0);
    } else if (title) title.classList.add('is-split');
    const items = $$('[data-hero-item]');
    if (items.length) tl.fromTo(items, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.25);
    const stickers = $$('[data-hero] [data-sticker], [data-hero-sticker]');
    if (stickers.length && !REDUCE) tl.from(stickers, { scale: 0, rotate: '-=35', duration: 1.2, ease: 'back.out(2.2)', stagger: 0.09 }, 0.55);
    const visual = $$('[data-hero-visual]');
    if (visual.length && !REDUCE) tl.from(visual, { opacity: 0, y: 80, rotateX: 12, scale: 0.94, duration: 1.6, stagger: 0.15 }, 0.3);
    return tl;
  }

  /* ---------------------------------------------------------------- scroll reveals */
  function initReveals() {
    // headings split by lines
    $$('[data-split]').forEach((el) => {
      if (el.closest('[data-hero-title]') || el.hasAttribute('data-hero-title')) return;
      if (REDUCE) { el.classList.add('is-split'); return; }
      SplitText.create(el, {
        type: 'lines,words', mask: 'lines', linesClass: 'split-line', wordsClass: 'word', autoSplit: true,
        onSplit(self) {
          el.classList.add('is-split');
          return gsap.from(self.words, { yPercent: 115, rotate: 2, duration: 1.25, stagger: 0.03, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        },
      });
    });

    if (REDUCE) { gsap.set('[data-reveal]', { opacity: 1 }); return; }

    $$('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.3, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-reveal-stagger]').forEach((wrap) => {
      gsap.from(wrap.children, { opacity: 0, y: 50, duration: 1.2, stagger: 0.08, clearProps: 'transform', scrollTrigger: { trigger: wrap, start: 'top 88%', once: true } });
    });
    $$('[data-pop]').forEach((el, i) => {
      gsap.from(el, { scale: 0, rotate: -25, duration: 1.1, ease: 'back.out(2.5)', delay: (i % 4) * 0.12, clearProps: 'scale,rotate,transform', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 15;
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-parallax-img]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('[data-clip-reveal]').forEach((el) => {
      gsap.fromTo(el, { clipPath: 'inset(12% 8% 12% 8% round 2rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 1.25rem)', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: true } });
    });
    $$('[data-scale-in]').forEach((el) => {
      gsap.fromTo(el, { scale: 0.92, borderRadius: '4rem' }, { scale: 1, borderRadius: '2rem', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 40%', scrub: true } });
    });
  }

  /* ---------------------------------------------------------------- scrub-fill statement */
  function initScrubText() {
    $$('[data-scrub-text]').forEach((el) => {
      const split = SplitText.create(el, { type: 'words', wordsClass: 'word' });
      const accent = (w) => !!w.closest('.statement_accent');
      const dark = el.classList.contains('is-dark');
      const base = dark ? '#ffffff' : '#03011d';
      if (REDUCE) { split.words.forEach((w) => (w.style.color = accent(w) ? '#146ef5' : base)); return; }
      gsap.to(split.words, {
        color: (i, w) => (accent(w) ? '#146ef5' : base),
        stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 },
      });
    });
  }

  /* ---------------------------------------------------------------- counters */
  function initCounters() {
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || (String(end).split('.')[1] || '').length, 10);
      const pre = el.dataset.prefix || '';
      const suf = el.dataset.suffix || '';
      const o = { v: 0 };
      const render = () => (el.textContent = pre + o.v.toFixed(dec) + suf);
      if (REDUCE) { o.v = end; return render(); }
      render();
      gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: render, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ---------------------------------------------------------------- marquees */
  function initMarquees() {
    $$('[data-marquee]').forEach((m) => {
      const track = $('.marquee_track', m);
      const group = $('.marquee_group', m);
      if (!track || !group) return;
      const fill = () => { while (track.scrollWidth < m.offsetWidth * 2 + group.offsetWidth) track.appendChild(group.cloneNode(true)).setAttribute('aria-hidden', 'true'); };
      fill();
      if (REDUCE) return;
      const dir = parseFloat(m.dataset.direction || '1');
      const speed = parseFloat(m.dataset.speed || '40');
      let tween;
      const build = () => {
        tween && tween.kill();
        const w = group.offsetWidth;
        gsap.set(track, { x: dir > 0 ? 0 : -w });
        tween = gsap.to(track, { x: dir > 0 ? -w : 0, duration: w / speed, ease: 'none', repeat: -1 });
      };
      build();
      let rw = innerWidth;
      window.addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 50) { rw = innerWidth; fill(); build(); } });
      if (m.dataset.hoverSlow !== undefined) {
        m.addEventListener('pointerenter', () => gsap.to(tween, { timeScale: 0.2, duration: 0.6 }));
        m.addEventListener('pointerleave', () => gsap.to(tween, { timeScale: 1, duration: 0.6 }));
      }
      ScrollTrigger.create({
        trigger: m, start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const v = clamp(Math.abs(self.getVelocity()) / 400, 0, 5);
          gsap.to(tween, { timeScale: 1 + v, duration: 0.2, overwrite: true, onComplete: () => gsap.to(tween, { timeScale: 1, duration: 1.2 }) });
        },
      });
    });
  }

  /* ---------------------------------------------------------------- wavy ribbon */
  function initRibbon() {
    $$('[data-ribbon]').forEach((r) => {
      const tp = $('[data-ribbon-text]', r);
      const path = $('path', r);
      if (!tp || REDUCE) return;
      const d0 = path.getAttribute('d');
      const nums = d0.match(/-?\d+(\.\d+)?/g).map(Number);
      const tween = gsap.fromTo(tp, { attr: { startOffset: '0%' } }, { attr: { startOffset: '-33.333%' }, duration: 30, ease: 'none', repeat: -1 });
      const o = { p: 0 };
      gsap.to(o, {
        p: 1, ease: 'none',
        scrollTrigger: { trigger: r, start: 'top bottom', end: 'bottom top', scrub: 1 },
        onUpdate: () => {
          let i = 0;
          const d = d0.replace(/-?\d+(\.\d+)?/g, () => { const n = nums[i]; const k = i++; return (k % 2 === 1 ? n + Math.sin(o.p * Math.PI * 2 + k) * 38 : n).toFixed(1); });
          path.setAttribute('d', d);
        },
      });
      ScrollTrigger.create({ trigger: r, start: 'top bottom', end: 'bottom top', onUpdate: (self) => { const v = clamp(Math.abs(self.getVelocity()) / 300, 0, 6); gsap.to(tween, { timeScale: 1 + v, duration: 0.2, overwrite: true, onComplete: () => gsap.to(tween, { timeScale: 1, duration: 1 }) }); } });
    });
  }

  /* ---------------------------------------------------------------- horizontal gallery */
  function initGallery() {
    $$('[data-gallery]').forEach((g) => {
      const track = $('[data-gallery-track]', g);
      if (!track || REDUCE) return;
      gsap.fromTo(track, { x: () => innerWidth * 0.08 }, {
        x: () => -(track.scrollWidth - innerWidth) - innerWidth * 0.02, ease: 'none',
        scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: 0.8, invalidateOnRefresh: true },
      });
      $$('img', track).forEach((img) => gsap.fromTo(img, { xPercent: -4 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: g, start: 'top bottom', end: 'bottom top', scrub: true } }));
    });
  }

  /* ---------------------------------------------------------------- work section */
  function initWork() {
    const curve = $('[data-work-curve]');
    if (curve && !REDUCE) gsap.fromTo(curve, { scaleY: 1 }, { scaleY: 0.15, ease: 'none', scrollTrigger: { trigger: curve.parentElement, start: 'top bottom', end: 'top 20%', scrub: true } });
    if (REDUCE) return;
    $$('[data-stack-card]').forEach((card) => {
      const media = $('.project-card_media', card);
      gsap.fromTo(media, { clipPath: 'inset(10% 6% 10% 6% round 2.5rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 1.25rem)', ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 40%', scrub: true } });
      gsap.from($$('.project-card_info > *', card), { y: 30, opacity: 0, stagger: 0.08, duration: 1, scrollTrigger: { trigger: card, start: 'top 60%', once: true } });
    });
  }

  /* ---------------------------------------------------------------- hanging process cards */
  function initProcess() {
    $$('[data-process]').forEach((p) => {
      const cards = $$('[data-swing]', p);
      const rope = $('[data-rope]', p);
      const tilts = cards.map((c) => parseFloat(getComputedStyle(c).getPropertyValue('--tilt')) || 0);
      cards.forEach((c, i) => { c.style.transform = 'none'; gsap.set(c, { rotation: tilts[i] }); });
      if (REDUCE) return;
      if (rope) {
        const len = rope.getTotalLength();
        gsap.fromTo(rope, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: p, start: 'top 85%', end: 'top 35%', scrub: true } });
      }
      gsap.from(cards, { y: -110, opacity: 0, rotation: (i) => tilts[i] + (i % 2 ? 22 : -22), duration: 1.8, ease: 'elastic.out(1, 0.45)', stagger: 0.12, scrollTrigger: { trigger: p, start: 'top 75%', once: true } });
      if (TOUCH) return;
      cards.forEach((c, i) => {
        let lastX = 0;
        c.addEventListener('pointerenter', (e) => { lastX = e.clientX; });
        c.addEventListener('pointermove', (e) => {
          const dx = e.clientX - lastX; lastX = e.clientX;
          if (Math.abs(dx) < 2) return;
          gsap.to(c, { rotation: tilts[i] + clamp(dx * 0.9, -14, 14), duration: 0.35, ease: 'power2.out', overwrite: true, onComplete: () => gsap.to(c, { rotation: tilts[i], duration: 2.2, ease: 'elastic.out(1.1, 0.25)' }) });
        });
      });
    });
  }

  /* ---------------------------------------------------------------- services fan */
  function initFan() {
    $$('[data-fan]').forEach((fan) => {
      const cards = $$('[data-fan-card]', fan);
      mm.add(DESKTOP, () => {
        const n = cards.length;
        const spread = n === 3 ? [-26, 0, 26] : cards.map((_, i) => -36 + (72 / (n - 1)) * i);
        gsap.set(cards, { rotation: 0, y: 60 });
        const tl = gsap.timeline({ scrollTrigger: { trigger: fan, start: 'top 85%', end: 'top 25%', scrub: 1 } });
        tl.to(cards, { rotation: (i) => spread[i], y: (i) => Math.abs(spread[i]) * 0.6, ease: 'power2.out' });
        const enter = (c, i) => { gsap.to(c, { rotation: spread[i] * 0.65, y: Math.abs(spread[i]) * 0.6 - 30, scale: 1.03, duration: 0.6, overwrite: 'auto' }); c.style.zIndex = 5; };
        const leave = (c, i) => { gsap.to(c, { rotation: spread[i], y: Math.abs(spread[i]) * 0.6, scale: 1, duration: 0.8, overwrite: 'auto' }); c.style.zIndex = ''; };
        const handlers = cards.map((c, i) => [() => enter(c, i), () => leave(c, i)]);
        cards.forEach((c, i) => { c.addEventListener('pointerenter', handlers[i][0]); c.addEventListener('pointerleave', handlers[i][1]); });
        return () => cards.forEach((c, i) => { c.removeEventListener('pointerenter', handlers[i][0]); c.removeEventListener('pointerleave', handlers[i][1]); });
      });
    });
  }

  /* ---------------------------------------------------------------- testimonials stack */
  function initTestimonials() {
    $$('[data-testimonials]').forEach((stack) => {
      let cards = $$('.testimonial-card', stack);
      const nav = stack.parentElement.querySelector('[data-testimonials-nav]');
      const total = cards.length;
      let index = 0;
      if (nav) nav.innerHTML = cards.map(() => '<span class="testimonials_dot"></span>').join('');
      const dots = nav ? $$('.testimonials_dot', nav) : [];
      const layout = (instant) => {
        cards.forEach((c, d) => {
          const props = { x: 0, y: d * 14, rotation: [0, -3.5, 3, -1.5][d] || 0, scale: 1 - Math.min(d, 3) * 0.04, opacity: d > 3 ? 0 : 1, zIndex: total - d };
          instant ? gsap.set(c, props) : gsap.to(c, { ...props, duration: 0.9, ease: 'fm' });
        });
        dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      };
      layout(true);
      const next = (dir = 1) => {
        const top = cards[0];
        gsap.to(top, {
          x: dir * innerWidth * 0.35, y: -40, rotation: dir * 18, opacity: 0, duration: 0.55, ease: 'power2.in',
          onComplete: () => { cards.push(cards.shift()); index = (index + 1) % total; gsap.set(top, { x: 0, y: 70, rotation: 0 }); layout(); makeDraggable(); },
        });
      };
      let drag;
      const makeDraggable = () => {
        drag && drag.kill();
        [drag] = Draggable.create(cards[0], {
          type: 'x,y', zIndexBoost: false,
          onDrag() { gsap.set(this.target, { rotation: this.x * 0.04 }); },
          onRelease() { if (Math.abs(this.x) > 120) next(this.x > 0 ? 1 : -1); else gsap.to(this.target, { x: 0, y: 0, rotation: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' }); },
          onClick() { next(1); },
        });
      };
      makeDraggable();
      let auto;
      const play = () => { clearInterval(auto); auto = setInterval(() => next(1), 5500); };
      const stop = () => clearInterval(auto);
      stack.addEventListener('pointerdown', stop);
      stack.addEventListener('pointerenter', stop);
      stack.addEventListener('pointerleave', play);
      ScrollTrigger.create({ trigger: stack, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive && !REDUCE ? play() : stop()) });
    });
  }

  /* ---------------------------------------------------------------- FAQ */
  function initFaq() {
    $$('[data-faq]').forEach((item, i, all) => {
      const btn = $('.faq-item_q', item);
      const ans = $('.faq-item_a', item);
      const set = (open) => {
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        gsap.to(ans, { height: open ? 'auto' : 0, duration: 0.7, ease: 'fm', onComplete: () => ScrollTrigger.refresh() });
      };
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        all.forEach((o) => o !== item && o.classList.contains('is-open') && (o.classList.remove('is-open'), $('.faq-item_q', o).setAttribute('aria-expanded', 'false'), gsap.to($('.faq-item_a', o), { height: 0, duration: 0.6, ease: 'fm' })));
        set(open);
      });
      if (i === 1 && !item.closest('[data-faq-closed]') && all.length > 2) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); gsap.set(ans, { height: 'auto' }); }
    });
  }

  /* ---------------------------------------------------------------- stickers: drag + mouse parallax */
  function initStickers() {
    const stickers = $$('[data-sticker]');
    if (!stickers.length) return;
    stickers.forEach((s) => {
      const bounds = s.closest('section, header, footer, .say-hello') || body;
      Draggable.create(s, {
        type: 'x,y', inertia: true, bounds, zIndexBoost: true, edgeResistance: 0.6,
        onPress() { gsap.to(this.target, { scale: 1.12, duration: 0.3, ease: 'back.out(3)' }); },
        onRelease() { gsap.to(this.target, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' }); },
        onDrag() { gsap.to(this.target, { rotation: clamp(this.deltaX * 2, -25, 25), duration: 0.3, overwrite: 'auto' }); },
      });
      if (!TOUCH && !REDUCE) s.addEventListener('pointerenter', () => gsap.fromTo(s, { rotation: '-=0' }, { keyframes: { rotation: ['+=8', '-=14', '+=6'] }, duration: 0.6, ease: 'power1.inOut' }));
    });
    if (TOUCH || REDUCE) return;
    const items = stickers.map((s) => ({ el: s, d: parseFloat(s.dataset.depth || '0.6'), x: 0, y: 0 }));
    gsap.ticker.add(() => {
      const mx = (state.mouse.x / innerWidth - 0.5) * 2;
      const my = (state.mouse.y / innerHeight - 0.5) * 2;
      items.forEach((it) => {
        it.x = lerp(it.x, -mx * 26 * it.d, 0.06);
        it.y = lerp(it.y, -my * 20 * it.d, 0.06);
        it.el.style.translate = `${it.x.toFixed(2)}px ${it.y.toFixed(2)}px`;
      });
    });
    // idle bob for smileys
    $$('.sticker-shape.is-smiley .smiley_face').forEach((f) => gsap.to(f, { y: 2, x: 1.5, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }

  /* ---------------------------------------------------------------- SAY HELLO variable weight */
  function initSayHello() {
    const link = $('[data-say-hello]');
    if (!link) return;
    const chars = $$('.say-hello_char', link);
    const w = chars.map(() => 300);
    if (!REDUCE) gsap.from(chars, { yPercent: 100, opacity: 0, duration: 1.4, stagger: 0.05, scrollTrigger: { trigger: link, start: 'top 90%', once: true } });
    if (REDUCE) return;
    let active = false;
    const sec = link.closest('.say-hello');
    sec.addEventListener('pointerenter', () => (active = true));
    sec.addEventListener('pointerleave', () => (active = false));
    let t = 0;
    gsap.ticker.add((time) => {
      t = time;
      const rects = chars.map((c) => c.getBoundingClientRect());
      const vis = rects.length && rects[0].bottom > 0 && rects[0].top < innerHeight;
      if (!vis) return;
      chars.forEach((c, i) => {
        let target;
        if (active && !TOUCH) {
          const r = rects[i];
          const d = Math.hypot(state.mouse.x - (r.left + r.width / 2), state.mouse.y - (r.top + r.height / 2));
          target = 300 + 400 * clamp(1 - d / (innerWidth * 0.22), 0, 1);
        } else {
          target = 300 + 400 * Math.max(0, Math.sin(t * 1.4 - i * 0.55)) ** 3; // idle wave
        }
        w[i] = lerp(w[i], target, 0.12);
        c.style.setProperty('--w', w[i].toFixed(0));
      });
    });
  }

  /* ---------------------------------------------------------------- clocks */
  function initClocks() {
    const els = $$('[data-clock]');
    if (!els.length) return;
    const tick = () => els.forEach((el) => {
      try { el.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: el.dataset.clock }).format(new Date()); } catch (e) {}
    });
    tick(); setInterval(tick, 15000);
  }

  /* ---------------------------------------------------------------- misc: scroll-top, anchors */
  function initAnchors() {
    $$('[data-scroll-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); scrollTo(0); }));
    $$('a[href^="#"]:not([data-scroll-top]):not(.skip-link)').forEach((a) => a.addEventListener('click', (e) => {
      const t = $(a.getAttribute('href'));
      if (t) { e.preventDefault(); scrollTo(t); }
    }));
  }

  /* ---------------------------------------------------------------- 3D tilt + spotlight */
  function initTilt() {
    if (TOUCH || REDUCE) return;
    $$('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 6;
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * max * 2); rx(-py * max * 2);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
    $$('.spotlight').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
  }

  /* ---------------------------------------------------------------- winding path timeline */
  function initPathSteps() {
    $$('[data-path]').forEach((wrap) => {
      const steps = $$('.path-step', wrap);
      const svg = $('.path-steps_svg', wrap);
      const arrow = $('.path-steps_arrow', wrap);
      if (!svg || steps.length < 2) return;
      let tl;
      const build = () => {
        tl && tl.scrollTrigger && tl.scrollTrigger.kill(); tl && tl.kill();
        if (innerWidth < 768) { steps.forEach((s) => s.classList.add('is-active')); return; }
        const wr = wrap.getBoundingClientRect();
        const pts = steps.map((s, i) => {
          const n = $('.path-step_title', s).getBoundingClientRect();
          const even = i % 2 === 1;
          return { x: (even ? n.left - 30 : n.right + 30) - wr.left, y: n.top + n.height / 2 - wr.top };
        });
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1]; const b = pts[i];
          const my = (a.y + b.y) / 2;
          d += ` C ${a.x} ${my + 40}, ${b.x} ${my - 40}, ${b.x} ${b.y}`;
        }
        svg.setAttribute('viewBox', `0 0 ${wr.width} ${wr.height}`);
        svg.innerHTML = `<path class="path-bg" d="${d}"/><path class="path-fg" d="${d}"/>`;
        const fg = $('.path-fg', svg);
        const len = fg.getTotalLength();
        gsap.set(fg, { strokeDasharray: len, strokeDashoffset: len });
        tl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 65%', end: 'bottom 70%', scrub: 0.8,
          onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('is-active', self.progress >= i / (steps.length - 1) - 0.02)) } });
        tl.to(fg, { strokeDashoffset: 0, ease: 'none' }, 0);
        if (arrow) tl.to(arrow, { motionPath: { path: fg, align: fg, alignOrigin: [0.5, 0.5], autoRotate: true }, ease: 'none' }, 0);
      };
      build();
      ScrollTrigger.addEventListener('refreshInit', () => {});
      let rw = innerWidth;
      window.addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; build(); } });
    });
  }

  /* ---------------------------------------------------------------- stacking panels */
  function initStackPanels() {
    mm.add(DESKTOP, () => {
      if (REDUCE) return;
      $$('[data-stack-panels]').forEach((wrap) => {
        const panels = $$('.service-panel', wrap);
        panels.forEach((p, i) => {
          const nextP = panels[i + 1];
          if (!nextP) return;
          gsap.fromTo(p, { scale: 1, filter: 'brightness(1)' }, { scale: 0.93, filter: 'brightness(0.82)', ease: 'none', scrollTrigger: { trigger: nextP, start: 'top bottom', end: 'top 15%', scrub: true } });
        });
      });
    });
  }

  /* ---------------------------------------------------------------- horizontal pinned scroll */
  function initHScroll() {
    mm.add(DESKTOP, () => {
      if (REDUCE) return;
      $$('[data-hscroll]').forEach((sec) => {
        const track = $('[data-hscroll-track]', sec);
        if (!track) return;
        const dist = () => track.scrollWidth - track.parentElement.offsetWidth;
        gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
      });
    });
  }

  /* ---------------------------------------------------------------- sticky stepper (pinned preview cross-fade) */
  function initStepper() {
    $$('[data-stepper]').forEach((wrap) => {
      const steps = $$('[data-stepper-step]', wrap);
      const imgs = $$('[data-stepper-img]', wrap);
      const label = $('[data-stepper-label]', wrap);
      const setActive = (i) => {
        steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
        imgs.forEach((im, k) => im.classList.toggle('is-active', k === i));
        if (label && steps[i]) label.textContent = steps[i].dataset.stepperStep || '';
      };
      setActive(0);
      steps.forEach((s, i) => {
        ScrollTrigger.create({ trigger: s, start: 'top 60%', end: 'bottom 60%', onToggle: (self) => self.isActive && setActive(i) });
        s.addEventListener('click', () => setActive(i));
      });
    });
  }

  /* ---------------------------------------------------------------- compare slider */
  function initCompare() {
    $$('[data-compare]').forEach((c) => {
      let target = 50; let pos = 50; let dragging = false;
      const setFromEvent = (e) => { const r = c.getBoundingClientRect(); target = clamp(((e.clientX - r.left) / r.width) * 100, 2, 98); };
      c.addEventListener('pointerdown', (e) => { dragging = true; c.setPointerCapture(e.pointerId); setFromEvent(e); });
      c.addEventListener('pointermove', (e) => { if (dragging || (!TOUCH && c.dataset.compare === 'hover')) setFromEvent(e); });
      c.addEventListener('pointerup', () => (dragging = false));
      gsap.ticker.add(() => { pos = lerp(pos, target, 0.12); c.style.setProperty('--pos', pos.toFixed(2) + '%'); });
      if (!REDUCE) {
        const o = { v: 50 };
        ScrollTrigger.create({ trigger: c, start: 'top 75%', once: true, onEnter: () => gsap.timeline().to(o, { v: 85, duration: 0.9, ease: 'power2.inOut', onUpdate: () => (target = o.v) }).to(o, { v: 18, duration: 1.1, ease: 'power2.inOut', onUpdate: () => (target = o.v) }).to(o, { v: 50, duration: 0.9, ease: 'power2.inOut', onUpdate: () => (target = o.v) }) });
      }
    });
  }

  /* ---------------------------------------------------------------- filters (work / blog) */
  function initFilters() {
    $$('[data-filter-group]').forEach((group) => {
      const buttons = $$('[data-filter]', group);
      const list = $(group.dataset.filterGroup);
      if (!list) return;
      const items = $$('[data-cats]', list);
      buttons.forEach((b) => b.addEventListener('click', () => {
        buttons.forEach((x) => x.classList.toggle('is-active', x === b));
        const f = b.dataset.filter;
        const show = items.filter((it) => f === 'all' || it.dataset.cats.split(' ').includes(f));
        const hide = items.filter((it) => !show.includes(it));
        gsap.to(hide, { opacity: 0, scale: 0.94, duration: 0.35, ease: 'power2.in', onComplete: () => hide.forEach((h) => (h.style.display = 'none')) });
        gsap.delayedCall(hide.length ? 0.36 : 0, () => {
          show.forEach((s) => (s.style.display = ''));
          gsap.fromTo(show, { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.06, onComplete: () => ScrollTrigger.refresh() });
        });
      }));
    });
  }

  /* ---------------------------------------------------------------- hover image reveal (lists) */
  function initHoverReveal() {
    if (TOUCH || REDUCE) return;
    $$('[data-hover-reveal]').forEach((list) => {
      const box = document.createElement('div');
      box.className = 'hover-reveal';
      box.innerHTML = '<img alt="">';
      document.body.appendChild(box);
      const img = $('img', box);
      const xTo = gsap.quickTo(box, 'x', { duration: 0.7, ease: 'power3' });
      const yTo = gsap.quickTo(box, 'y', { duration: 0.7, ease: 'power3' });
      const rTo = gsap.quickTo(box, 'rotation', { duration: 0.9, ease: 'power3' });
      let lx = 0;
      list.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); rTo(clamp((e.clientX - lx) * 0.6, -12, 12)); lx = e.clientX; });
      $$('[data-hover-img]', list).forEach((row) => {
        row.addEventListener('pointerenter', () => { img.src = row.dataset.hoverImg; gsap.to(box, { scale: 1, opacity: 1, duration: 0.5 }); });
        row.addEventListener('pointerleave', () => gsap.to(box, { scale: 0.6, opacity: 0, duration: 0.4 }));
      });
    });
  }

  /* ---------------------------------------------------------------- forms */
  function initForms() {
    $$('[data-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const btn = $('[type="submit"]', form);
        btn.classList.add('is-loading');
        btn.disabled = true;
        // Replace with your endpoint / Webflow native form. Demo success state:
        setTimeout(() => {
          btn.classList.remove('is-loading'); btn.classList.add('is-done');
          const ok = $('[data-form-success]', form.parentElement);
          if (ok) { ok.hidden = false; gsap.from(ok, { opacity: 0, y: 20, duration: 0.8 }); }
          form.reset();
        }, 1200);
      });
    });
    $$('[data-chip-select]').forEach((g) => {
      const multi = g.dataset.chipSelect === 'multi';
      const input = $('input[type="hidden"]', g);
      $$('.select-chip', g).forEach((chip) => chip.addEventListener('click', () => {
        if (!multi) $$('.select-chip', g).forEach((c) => c !== chip && c.classList.remove('is-active'));
        chip.classList.toggle('is-active');
        gsap.fromTo(chip, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        if (input) input.value = $$('.select-chip.is-active', g).map((c) => c.textContent.trim()).join(', ');
      }));
    });
  }

  /* ---------------------------------------------------------------- matter.js physics pills */
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  function initPhysics() {
    const boxes = $$('[data-physics]');
    if (!boxes.length || REDUCE) return;
    boxes.forEach((box) => {
      ScrollTrigger.create({
        trigger: box, start: 'top 80%', once: true,
        onEnter: () => (window.Matter ? Promise.resolve() : loadScript(ROOT + 'assets/vendor/matter.min.js')).then(() => runPhysics(box)).catch(() => {}),
      });
    });
  }
  function runPhysics(box) {
    const { Engine, Bodies, Composite, Runner, Mouse, MouseConstraint, Body } = window.Matter;
    const pills = $$('[data-pill]', box);
    const W = box.clientWidth; const H = box.clientHeight;
    const engine = Engine.create({ gravity: { y: 1 } });
    const wall = { isStatic: true, render: { visible: false } };
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + 50, W * 2, 100, wall), Bodies.rectangle(-50, H / 2, 100, H * 3, wall), Bodies.rectangle(W + 50, H / 2, 100, H * 3, wall),
    ]);
    const bodies = pills.map((p, i) => {
      const w = p.offsetWidth; const h = p.offsetHeight;
      const b = Bodies.rectangle(gsap.utils.random(w / 2, W - w / 2), -h * (i + 1) * 1.3, w, h, { chamfer: { radius: h / 2 }, restitution: 0.45, friction: 0.2, angle: gsap.utils.random(-0.6, 0.6) });
      p.style.position = 'absolute'; p.style.left = '0'; p.style.top = '0'; p.style.opacity = '1';
      return { p, b, w, h };
    });
    Composite.add(engine.world, bodies.map((o) => o.b));
    if (!TOUCH) {
      const mouse = Mouse.create(box);
      mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
      mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);
      mouse.element.removeEventListener('wheel', mouse.mousewheel);
      Composite.add(engine.world, MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } }));
    }
    const runner = Runner.create();
    Runner.run(runner, engine);
    gsap.ticker.add(() => bodies.forEach(({ p, b, w, h }) => { p.style.transform = `translate(${b.position.x - w / 2}px, ${b.position.y - h / 2}px) rotate(${b.angle}rad)`; }));
    box.addEventListener('pointerdown', () => bodies.forEach(({ b }) => Body.applyForce(b, b.position, { x: gsap.utils.random(-0.02, 0.02), y: -0.04 })));
  }

  /* ---------------------------------------------------------------- WebGL (three.js) */
  function initGL() {
    const els = $$('[data-gl]');
    if (!els.length || REDUCE) return;
    const lowPower = (navigator.hardwareConcurrency || 4) <= 2;
    if (lowPower) return;
    // window.FMGL is present in the single-file export (gl.js inlined as a classic script)
    (window.FMGL ? Promise.resolve(window.FMGL) : import(new URL(ROOT + 'assets/js/gl.js', location.href).href))
      .then((m) => els.forEach((el) => m.mount(el, { mouse: state.mouse })))
      .catch((err) => console.warn('[FlowMelon] WebGL disabled:', err));
  }

  /* ---------------------------------------------------------------- boot */
  async function boot() {
    initLenis();
    initCursor();
    initMagnetic();
    initMenu();
    initTransitions();
    initClocks();
    initAnchors();
    initFaq();
    initForms();
    initTilt();
    initGL();
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
    initStickers();
    await preloader();
    html.classList.add('app-ready');
    state.lenis && state.lenis.start();
    playIntro();
    initNavbar();
    initReveals();
    initScrubText();
    initCounters();
    initMarquees();
    initRibbon();
    initGallery();
    initWork();
    initProcess();
    initFan();
    initTestimonials();
    initSayHello();
    initPathSteps();
    initStackPanels();
    initHScroll();
    initStepper();
    initCompare();
    initFilters();
    initHoverReveal();
    initPhysics();
    state.ready = true;
    document.dispatchEvent(new CustomEvent('flowmelon:ready', { detail: { gsap, ScrollTrigger, state } }));
    requestAnimationFrame(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
