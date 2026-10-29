/* Webflow Development page: score rings, stacking feature cards, live CMS table, slot picker */
(() => {
  const run = () => {
    const { gsap, ScrollTrigger } = window;
    const reduce = document.documentElement.classList.contains('no-motion');
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    // Lighthouse-style score rings fill in on view
    $$('[data-ring]').forEach((c) => {
      const len = 2 * Math.PI * 19;
      const target = len * (1 - parseFloat(c.dataset.ring) / 100);
      gsap.set(c, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(c, { strokeDashoffset: target, duration: reduce ? 0 : 2, ease: 'power3.out', delay: 0.6, scrollTrigger: { trigger: c, start: 'top 95%', once: true } });
    });
    const toast = document.querySelector('.svc-toast');
    if (toast && !reduce) gsap.from(toast, { x: 40, opacity: 0, duration: 1.2, delay: 1.2, ease: 'back.out(1.8)' });

    // Feature stack: earlier cards recede as the next one pins over them
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px)', () => {
      if (reduce) return;
      const cards = $$('[data-feature-stack] .stack-card');
      cards.forEach((card, i) => {
        gsap.set(card, { top: `calc(var(--header-h) + ${3 + i * 1.2}rem)` });
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card, { scale: 0.94, filter: 'brightness(0.93)', ease: 'none', scrollTrigger: { trigger: next, start: 'top 75%', end: 'top 30%', scrub: true } });
      });
    });

    // CMS table: "Sam" cursor drifts across rows, each row lights up as it passes
    const cms = document.querySelector('[data-cms] .cms-table');
    if (cms && !reduce) {
      const rows = $$('.cms-table_row', cms);
      const cursor = cms.querySelector('.cms-cursor');
      const tl = gsap.timeline({ repeat: -1, paused: true, defaults: { duration: 1.1, ease: 'power2.inOut' } });
      rows.forEach((row) => {
        tl.to(cursor, { top: () => row.offsetTop + row.offsetHeight / 2 - 8, left: () => `${30 + Math.random() * 35}%` })
          .add(() => { rows.forEach((r) => r.classList.toggle('is-hot', r === row)); })
          .to({}, { duration: 0.5 });
      });
      ScrollTrigger.create({ trigger: cms, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) });
    }

    // Core Web Vitals rows pop in
    $$('.vitals').forEach((v) => {
      if (reduce) return;
      gsap.from(v.children, { x: 40, opacity: 0, stagger: 0.12, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: v, start: 'top 85%', once: true } });
    });

    // Slot picker
    $$('[data-slots]').forEach((p) => {
      ['.slot-day', '.slot-time'].forEach((sel) => {
        const btns = $$(sel, p);
        btns.forEach((b) => b.addEventListener('click', () => {
          btns.forEach((x) => x.classList.toggle('is-active', x === b));
          gsap.fromTo(b, { scale: 0.88 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        }));
      });
    });
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
