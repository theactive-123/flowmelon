/* Figma to Webflow page: canvas mock, file checklist, mapping rows, code typing, price calculator, dropzone */
(() => {
  const run = () => {
    const { gsap, ScrollTrigger } = window;
    const reduce = document.documentElement.classList.contains('no-motion');
    const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

    /* ---- hero canvas: selection handles draw in, live window slides over, layers highlight, cursors drift */
    const mock = $('[data-canvas-mock]');
    if (mock) {
      const layers = $$('[data-layers] li', mock);
      let li = 0;
      setInterval(() => { li = (li + 1) % layers.length; layers.forEach((l, i) => l.classList.toggle('is-active', i === li)); }, 1400);
      if (!reduce) {
        gsap.timeline({ delay: 0.9 })
          .from($('[data-frame]', mock), { scale: 0.8, opacity: 0, duration: 1, ease: 'back.out(1.6)' })
          .from($$('.canvas-mock_handle', mock), { scale: 0, duration: 0.4, stagger: 0.06, ease: 'back.out(3)' }, '-=0.4')
          .from($('[data-live]', mock), { x: 80, y: 40, opacity: 0, rotate: 4, duration: 1.1 }, '-=0.1');
        $$('[data-drift]', mock).forEach((c, i) => {
          gsap.to(c, { keyframes: { x: [0, 40, -20, 30, 0], y: [0, -30, -60, -10, 0] }, duration: 9 + i * 2, repeat: -1, ease: 'sine.inOut', delay: i });
        });
      }
    }

    /* ---- file checklist ticks in sequence, progress fills to 83% */
    $$('[data-filecheck]').forEach((card) => {
      const items = $$('.filecheck_list li:not(.is-todo)', card);
      const bar = $('[data-filecheck-bar]', card);
      const count = $('[data-filecheck-count]', card);
      ScrollTrigger.create({
        trigger: card, start: 'top 75%', once: true,
        onEnter: () => {
          items.forEach((li, i) => gsap.delayedCall(reduce ? 0 : i * 0.35, () => { li.classList.add('is-done'); count.textContent = i + 1; gsap.fromTo($('.fc-check', li), { scale: 0.5 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }); }));
          gsap.to(bar, { scaleX: 5 / 6, duration: reduce ? 0 : items.length * 0.35 + 0.4, ease: 'power2.out' });
        },
      });
    });

    /* ---- interaction tiles preview themselves on touch devices */
    $$('.tile.is-white').forEach((t) => ScrollTrigger.create({ trigger: t, start: 'top 75%', once: true, onEnter: () => t.classList.add('is-auto') }));
    if (touch) $$('.tile').forEach((t) => ScrollTrigger.create({ trigger: t, start: 'top 70%', once: true, onEnter: () => t.classList.add('is-auto') }));

    /* ---- mapping rows light up one by one */
    $$('[data-mapping]').forEach((m) => {
      const rows = $$('.mapping_row', m);
      let i = 0; let timer;
      ScrollTrigger.create({
        trigger: m, start: 'top 80%', end: 'bottom 10%',
        onToggle: (s) => {
          clearInterval(timer);
          if (!s.isActive) return;
          const step = () => { rows.forEach((r, k) => r.classList.toggle('is-lit', k === i)); i = (i + 1) % rows.length; };
          step(); timer = setInterval(step, 1300);
        },
      });
      if (!reduce) gsap.from($$('.map-cell, .map-arrow', m), { opacity: 0, x: -20, duration: 0.7, stagger: 0.04, scrollTrigger: { trigger: m, start: 'top 80%', once: true } });
    });

    /* ---- code window types in line by line, class names pulse */
    $$('[data-typecode]').forEach((pre) => {
      const lines = $$('code > span', pre);
      if (reduce) return;
      gsap.set(lines, { opacity: 0, x: -8 });
      ScrollTrigger.create({
        trigger: pre, start: 'top 75%', once: true,
        onEnter: () => {
          gsap.to(lines, { opacity: 1, x: 0, duration: 0.35, stagger: 0.09, ease: 'power2.out', onComplete: () => {
            const ems = $$('em', pre);
            let k = 0;
            setInterval(() => { ems.forEach((e, j) => e.classList.toggle('is-pulse', j === k)); k = (k + 1) % ems.length; }, 900);
          } });
        },
      });
    });

    /* ---- price calculator */
    $$('[data-calc]').forEach((calc) => {
      const range = $('[data-calc-range]', calc);
      const pagesEl = $('[data-calc-pages]', calc);
      const priceEl = $('[data-calc-price]', calc);
      const weeksEl = $('[data-calc-weeks]', calc);
      const addons = $$('[data-addon]', calc);
      const shown = { v: 0 };
      const update = (animate = true) => {
        const pages = +range.value;
        range.style.setProperty('--fill', ((pages - 1) / 29) * 100 + '%');
        pagesEl.textContent = pages + (pages === 30 ? '+' : '');
        const base = 1200 + pages * 400;
        const extra = addons.filter((a) => a.classList.contains('is-active')).reduce((s, a) => s + +a.dataset.addon, 0);
        const total = Math.round((base + extra) / 100) * 100;
        const rush = addons.some((a) => a.dataset.rush !== undefined && a.classList.contains('is-active'));
        let weeks = Math.max(1, Math.ceil(pages / 4) + 1);
        if (rush) weeks = Math.max(1, Math.ceil(weeks * 0.6));
        weeksEl.textContent = weeks + (weeks === 1 ? ' week' : ' weeks');
        gsap.to(shown, { v: total, duration: animate ? 0.6 : 0, ease: 'power3.out', overwrite: true, onUpdate: () => (priceEl.textContent = Math.round(shown.v).toLocaleString('en-US')) });
      };
      range.addEventListener('input', () => update());
      addons.forEach((a) => a.addEventListener('click', () => {
        a.classList.toggle('is-active');
        gsap.fromTo(a, { scale: 0.88 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        update();
      }));
      update(false);
    });

    /* ---- dropzone: marching ants on drag, a dropped link fills the field */
    $$('[data-dropzone]').forEach((dz) => {
      const input = $('input[type="url"]', dz);
      ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-over'); }));
      dz.addEventListener('drop', (e) => {
        const text = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (text) input.value = text.trim();
        else if (file) input.placeholder = `${file.name} — paste its Figma share link`;
        input.focus();
      });
    });
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
