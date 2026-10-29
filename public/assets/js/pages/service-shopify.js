/* Webflow + Shopify — page interactions (runs after the FlowMelon engine is ready) */
(() => {
  const run = () => {
    const { gsap, ScrollTrigger } = window;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const REDUCE = document.documentElement.classList.contains('no-motion');
    const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    /* ---- product shelf: stagger in with tilt, mouse parallax, straighten on hover */
    const shelf = $('[data-shelf]');
    const cartPill = $('[data-cart-pill]');
    const cartCount = $('[data-cart-count]');
    const toast = $('[data-cart-toast]');
    if (shelf) {
      const cards = $$('[data-product]', shelf);
      cards.forEach((c) => { c._r = parseFloat(getComputedStyle(c).getPropertyValue('--r')) || 0; c.style.transform = 'none'; gsap.set(c, { rotation: c._r, transformPerspective: 1000 }); });
      if (!REDUCE) {
        gsap.from(cards, { y: 80, opacity: 0, rotation: (i) => cards[i]._r * 3, duration: 1.4, stagger: 0.1, delay: 0.45, ease: 'back.out(1.4)' });
        gsap.from(cartPill, { y: -20, opacity: 0, duration: 1, delay: 1 });
      }
      if (!TOUCH && !REDUCE) {
        const movers = cards.map((c, i) => ({ c, d: [0.6, 1, 0.8, 1.2][i % 4], x: gsap.quickTo(c, 'x', { duration: 1, ease: 'power3' }), y: gsap.quickTo(c, 'y', { duration: 1, ease: 'power3' }) }));
        shelf.addEventListener('pointermove', (e) => {
          const r = shelf.getBoundingClientRect();
          const mx = (e.clientX - r.left) / r.width - 0.5; const my = (e.clientY - r.top) / r.height - 0.5;
          movers.forEach((m) => { m.x(mx * 18 * m.d); m.y(my * 14 * m.d); });
        });
        shelf.addEventListener('pointerleave', () => movers.forEach((m) => { m.x(0); m.y(0); }));
        cards.forEach((c) => {
          c.addEventListener('pointerenter', () => gsap.to(c, { rotation: 0, scale: 1.03, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }));
          c.addEventListener('pointerleave', () => gsap.to(c, { rotation: c._r, scale: 1, duration: 1, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' }));
        });
      }
    }

    /* ---- add to cart: dot flies to the cart, count bumps, toast pops */
    let count = 0; let toastTl;
    $$('[data-add-to-cart]').forEach((btn) => btn.addEventListener('click', () => {
      count += 1;
      if (cartCount) cartCount.textContent = count;
      if (REDUCE || !cartPill) return;
      const b = btn.getBoundingClientRect(); const t = cartPill.getBoundingClientRect();
      const dot = document.createElement('span');
      dot.style.cssText = `position:fixed;z-index:9000;left:${b.left + b.width - 20}px;top:${b.top + b.height / 2 - 8}px;width:16px;height:16px;border-radius:50%;background:#c6f43c;box-shadow:0 0 0 4px rgba(198,244,60,.35);pointer-events:none`;
      document.body.appendChild(dot);
      const inView = t.bottom > 0 && t.top < innerHeight;
      gsap.timeline({ onComplete: () => dot.remove() })
        .to(dot, { x: inView ? t.left + 30 - b.left - b.width + 20 : 0, duration: 0.7, ease: 'power1.inOut' }, 0)
        .to(dot, { y: inView ? t.top + t.height / 2 - b.top - b.height / 2 : -60, duration: 0.7, ease: 'back.in(1.6)' }, 0)
        .to(dot, { scale: 0.3, opacity: inView ? 1 : 0, duration: 0.2 }, 0.55);
      gsap.fromTo(cartCount, { scale: 1 }, { keyframes: { scale: [1, 1.7, 1] }, duration: 0.6, delay: 0.62, ease: 'power2.out' });
      gsap.fromTo(cartPill, { rotation: 0 }, { keyframes: { rotation: [0, -6, 5, 0] }, duration: 0.5, delay: 0.62 });
      gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      if (toast) {
        $('[data-cart-toast-text]', toast).textContent = `${btn.dataset.name} · ${btn.dataset.price}`;
        toastTl && toastTl.kill();
        toastTl = gsap.timeline().to(toast, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.5 }).to(toast, { opacity: 0, y: 16, scale: 0.95, duration: 0.4, delay: 1.8 });
      }
    }));

    /* ---- PDP variants change the price */
    const variants = $('[data-pdp-variants]');
    const price = $('[data-pdp-price]');
    if (variants && price) $$('button', variants).forEach((v) => v.addEventListener('click', () => {
      $$('button', variants).forEach((x) => x.classList.toggle('is-active', x === v));
      const o = { n: parseFloat(price.textContent.replace('$', '')) };
      gsap.to(o, { n: parseFloat(v.dataset.price.replace('$', '')), duration: 0.6, ease: 'power2.out', onUpdate: () => (price.textContent = '$' + Math.round(o.n)) });
      const b = $('[data-add-to-cart]', variants.parentElement); if (b) b.dataset.price = v.dataset.price;
    }));

    /* ---- subscription toggle */
    const tog = $('[data-sub-toggle]');
    const subText = $('[data-sub-text]');
    let togAuto;
    const flip = (on) => {
      tog.classList.toggle('is-on', on); tog.setAttribute('aria-pressed', String(on));
      if (subText) subText.textContent = on ? 'Delivered every 30 days. Skip or cancel anytime.' : 'Recurring revenue, built in.';
    };
    if (tog) {
      tog.addEventListener('click', () => { clearInterval(togAuto); flip(!tog.classList.contains('is-on')); });
      if (!REDUCE) ScrollTrigger.create({ trigger: tog, start: 'top 85%', end: 'bottom top', onToggle: (s) => { clearInterval(togAuto); if (s.isActive) togAuto = setInterval(() => flip(!tog.classList.contains('is-on')), 2600); } });
    }

    /* ---- upsell checkboxes tick one by one */
    const up = $('[data-upsell]');
    if (up) {
      const boxes = $$('.tk-upsell_box', up);
      const total = $('[data-upsell-total]', up);
      const prices = [129, 24, 19];
      const tick = () => {
        const tl = gsap.timeline({ repeat: REDUCE ? 0 : -1, repeatDelay: 1.5 });
        boxes.forEach((b, i) => tl.call(() => { b.classList.add('is-checked'); total.textContent = '$' + prices.slice(0, i + 1).reduce((a, c) => a + c, 0); }).fromTo($('i', b), { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }).to({}, { duration: 0.4 }));
        tl.to({}, { duration: 1.2 }).call(() => { boxes.forEach((b) => { b.classList.remove('is-checked'); gsap.set($('i', b), { scale: 0 }); }); });
        return tl;
      };
      ScrollTrigger.create({ trigger: up, start: 'top 85%', once: true, onEnter: tick });
    }
    // touch devices: open the cart drawer when it scrolls into view
    if (TOUCH) $$('.tk-drawer').forEach((d) => ScrollTrigger.create({ trigger: d, start: 'top 70%', once: true, onEnter: () => d.classList.add('is-open') }));

    if (REDUCE) return;

    /* ---- engines: cards slide in, hub pulses on connect, data dots travel along the line */
    const eng = $('[data-engines]');
    if (eng) {
      const core = $('[data-engine-core]', eng);
      const tl = gsap.timeline({ scrollTrigger: { trigger: eng, start: 'top 75%', once: true } });
      tl.from('[data-engine-left]', { x: -90, opacity: 0, duration: 1.1 }, 0)
        .from('[data-engine-right]', { x: 90, opacity: 0, duration: 1.1 }, 0)
        .from(core, { scale: 0, duration: 0.9, ease: 'back.out(2)' }, 0.5)
        .to(core, { keyframes: { scale: [1, 1.15, 1] }, duration: 0.6, ease: 'power2.out' }, 1.2)
        .from($$('.engines_chips .chip', eng), { y: 16, opacity: 0, stagger: 0.08, duration: 0.6 }, 1.1)
        .add(() => {
          $$('[data-engine-dot]', eng).forEach((d, i) => gsap.fromTo(d, { left: '-4%', opacity: 1 }, { left: '104%', duration: 2.4, ease: 'none', repeat: -1, delay: i * 1.2 }));
          $$('[data-engine-dot-back]', eng).forEach((d, i) => gsap.fromTo(d, { left: '104%', opacity: 1 }, { left: '-4%', duration: 2.8, ease: 'none', repeat: -1, delay: 0.6 + i * 1.4 }));
          gsap.to(core, { boxShadow: '0 0 0 1.8rem rgba(198,244,60,.12)', duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        }, 1.3);
    }

    /* ---- results: underline in each colour draws beneath its stat */
    const stats = $('[data-shop-stats]');
    if (stats) gsap.from($$('.shop-stat_line', stats), { scaleX: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: stats, start: 'top 75%', once: true } });

    /* ---- store stories: stat text slides up behind a mask */
    $$('.story-card').forEach((c) => gsap.from($('.story-card_mask > span', c), { yPercent: 110, duration: 1.1, scrollTrigger: { trigger: c, start: 'top 70%', once: true } }));

    /* ---- A/B chart: control line first, variant draws on scrub, chip pops when they meet */
    const ab = $('[data-ab]');
    if (ab) {
      const ctrl = $('.ab-control', ab); const vari = $('.ab-variant', ab); const pop = $('[data-ab-pop]', ab); const win = $('[data-ab-winner]', ab);
      [ctrl, vari].forEach((l) => { const len = l.getTotalLength(); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
      gsap.set(pop, { scale: 0 });
      gsap.timeline({ scrollTrigger: { trigger: ab, start: 'top 80%', end: 'center 45%', scrub: 0.8 } })
        .to(ctrl, { strokeDashoffset: 0, duration: 0.4, ease: 'none' })
        .to(vari, { strokeDashoffset: 0, duration: 1, ease: 'none' })
        .to(pop, { scale: 1, duration: 0.25, ease: 'back.out(3)' });
      ScrollTrigger.create({ trigger: ab, start: 'center 45%', once: true, onEnter: () => gsap.fromTo(win, { scale: 1 }, { scale: 1.15, duration: 0.5, yoyo: true, repeat: 5, ease: 'sine.inOut' }) });
    }

    /* ---- packages: ticks stroke-draw in; hovering a column highlights it */
    const pkg = $('[data-pkg]');
    if (pkg) {
      const yes = $$('.pkg_cell.is-y .pkg_yes', pkg);
      yes.forEach((p) => gsap.set(p, { strokeDasharray: 18, strokeDashoffset: 18 }));
      gsap.to(yes, { strokeDashoffset: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out', scrollTrigger: { trigger: pkg, start: 'top 70%', once: true } });
      gsap.from($$('.pkg_col-head', pkg), { y: 50, opacity: 0, stagger: 0.1, duration: 1, clearProps: 'transform', scrollTrigger: { trigger: pkg, start: 'top 80%', once: true } });
      const hl = (col) => $$('[data-col]', pkg).forEach((el) => el.classList.toggle('is-hl', col !== null && el.dataset.col === col));
      $$('[data-col]', pkg).forEach((el) => { el.addEventListener('pointerenter', () => hl(el.dataset.col)); el.addEventListener('pointerleave', () => hl(null)); });
    }

    ScrollTrigger.refresh();
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
