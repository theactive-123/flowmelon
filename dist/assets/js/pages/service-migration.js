/* Webflow Migration — page interactions (runs after the FlowMelon engine is ready) */
(() => {
  const run = () => {
    const { gsap, ScrollTrigger } = window;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const REDUCE = document.documentElement.classList.contains('no-motion');
    const tiltOf = (el) => parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0;

    /* ---- platform switcher: swaps the "before" window, auto-cycles until touched */
    const stage = $('[data-mig-stage]');
    if (stage) {
      const btns = $$('[data-platform]', stage);
      const imgs = $$('[data-old-img]', stage);
      const url = $('[data-old-url]', stage);
      const urls = ['oldsite.com/wp', 'oldsite.wixsite.com', 'oldsite.squarespace.com', 'oldsite.hs-sites.com'];
      let i = 0; let timer;
      const set = (n) => {
        i = n;
        btns.forEach((b, k) => b.classList.toggle('is-active', k === n));
        imgs.forEach((im, k) => im.classList.toggle('is-active', k === n));
        if (url) url.textContent = urls[n];
        if (!REDUCE) gsap.fromTo($$('path', btns[n]), { strokeDasharray: 100, strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' });
      };
      btns.forEach((b, k) => {
        b.addEventListener('click', () => { clearInterval(timer); set(k); });
        b.addEventListener('pointerenter', () => { clearInterval(timer); set(k); });
      });
      if (!REDUCE) {
        gsap.from($$('.mig-platform_line path', stage), { strokeDasharray: 100, strokeDashoffset: 100, duration: 1, stagger: 0.12, delay: 0.8, ease: 'power2.out' });
        gsap.from(btns, { x: -40, opacity: 0, duration: 1, stagger: 0.08, delay: 0.6 });
        timer = setInterval(() => set((i + 1) % btns.length), 3200);
      }
    }
    if (REDUCE) return;

    /* ---- VS cards meet in the middle, badge spins once */
    const vs = $('[data-vs]');
    if (vs) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: vs, start: 'top 78%', once: true } });
      tl.from('[data-vs-left]', { x: -60, opacity: 0, duration: 1.1 }, 0)
        .from('[data-vs-right]', { x: 60, opacity: 0, duration: 1.1 }, 0)
        .from('[data-vs-badge]', { scale: 0, rotation: -360, duration: 1.2, ease: 'back.out(1.8)' }, 0.35)
        .from($$('li', vs), { x: -14, opacity: 0, stagger: 0.05, duration: 0.6 }, 0.4);
    }

    /* ---- runway cards drop in and settle to their tilt, lime progress line fills */
    const runway = $('[data-runway]');
    if (runway) {
      const cards = $$('.tilt-card', runway);
      cards.forEach((c) => { const r = tiltOf(c); c.style.transform = 'none'; gsap.set(c, { rotation: r }); c._r = r; });
      gsap.from(cards, { y: -140, opacity: 0, rotation: (k) => cards[k]._r + (k % 2 ? 14 : -14), duration: 1.6, ease: 'elastic.out(1, 0.5)', stagger: 0.12, scrollTrigger: { trigger: runway, start: 'top 80%', once: true } });
      const bar = $('[data-runway-progress] span');
      if (bar) gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: runway, start: 'top 85%', end: 'bottom 55%', scrub: true } });
    }

    /* ---- SEO dashboard: traffic lines draw, launch marker drops, redirects tick in, rings fill */
    const dash = $('[data-seo-dash]');
    if (dash) {
      const lines = $$('.seo-chart_old, .seo-chart_new', dash);
      lines.forEach((l) => { const len = l.getTotalLength(); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
      const rings = $$('.score-ring_fg', dash);
      const C = 2 * Math.PI * 19;
      rings.forEach((r) => gsap.set(r, { strokeDasharray: C, strokeDashoffset: C }));
      const tl = gsap.timeline({ scrollTrigger: { trigger: dash, start: 'top 72%', once: true } });
      tl.to(lines[0], { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
        .to(lines[1], { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }, 0.2)
        .from('[data-launch-marker] line', { attr: { y1: 260 }, duration: 0.8, ease: 'power3.out' }, 0.9)
        .from('[data-launch-flag]', { y: -30, opacity: 0, scale: 0.6, duration: 0.8, ease: 'back.out(2.5)' }, 1.1)
        .from($$('[data-redirects] li', dash), { x: 30, opacity: 0, stagger: 0.12, duration: 0.7 }, 0.4)
        .to(rings, { strokeDashoffset: (k) => C * (1 - parseFloat(rings[k].dataset.score) / 100), duration: 1.8, stagger: 0.15, ease: 'power3.out' }, 0.6);
    }

    /* ---- cutover checklist ticks off in sequence (pinned on desktop) */
    const cut = $('[data-cutover]');
    if (cut) {
      const rows = $$('[data-launch-list] li', cut);
      const count = $('[data-launch-count]', cut);
      const total = rows.length;
      let done = -1;
      const setDone = (n) => {
        if (n === done) return;
        done = n;
        rows.forEach((r, k) => {
          const on = k < n;
          if (on !== r.classList.contains('is-done')) {
            r.classList.toggle('is-done', on);
            const svg = $('svg', r);
            gsap.to(svg, { scale: on ? 1 : 0, duration: on ? 0.6 : 0.25, ease: on ? 'back.out(3)' : 'power2.in' });
            gsap.to(r, { color: on ? '#8d8c98' : '#03011d', duration: 0.4 });
          }
        });
        if (count) count.textContent = `${n} of ${total} done`;
      };
      const mm = gsap.matchMedia();
      mm.add('(min-width: 992px)', () => {
        ScrollTrigger.create({ trigger: cut.parentElement, start: 'top top+=60', end: '+=900', pin: true, scrub: true, anticipatePin: 1,
          onUpdate: (self) => setDone(Math.round(self.progress * total)) });
      });
      mm.add('(max-width: 991px)', () => {
        ScrollTrigger.create({ trigger: cut, start: 'top 60%', once: true, onEnter: () => rows.forEach((_, k) => gsap.delayedCall(k * 0.28, () => setDone(k + 1))) });
      });
    }

    /* ---- results cards jiggle to their tilt */
    const res = $('[data-results-cards]');
    if (res) {
      const cards = $$('.tilt-card', res);
      cards.forEach((c) => { const r = tiltOf(c); c.style.transform = 'none'; gsap.set(c, { rotation: r }); c._r = r; });
      gsap.from(cards, { y: 80, opacity: 0, rotation: (k) => cards[k]._r * -4, duration: 1.8, ease: 'elastic.out(1.1, 0.35)', stagger: 0.1, scrollTrigger: { trigger: res, start: 'top 80%', once: true } });
    }

    /* ---- pricing rows slide in from the right */
    const pr = $('[data-price-rows]');
    if (pr) gsap.from(pr.children, { x: 120, opacity: 0, duration: 1.1, stagger: 0.12, clearProps: 'transform', scrollTrigger: { trigger: pr, start: 'top 80%', once: true } });

    ScrollTrigger.refresh();
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
