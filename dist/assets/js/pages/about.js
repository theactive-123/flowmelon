/* About page: values highlight + progress, tools hub animation */
(() => {
  const run = () => {
    const { gsap, ScrollTrigger } = window;
    const reduce = document.documentElement.classList.contains('no-motion');

    const values = document.querySelector('[data-values]');
    if (values) {
      const rows = [...values.querySelectorAll('[data-value-row]')];
      const bar = values.querySelector('[data-values-bar]');
      rows.forEach((row) => ScrollTrigger.create({ trigger: row, start: 'top 62%', end: 'bottom 38%', toggleClass: 'is-active' }));
      if (bar) gsap.fromTo(bar, { scaleY: 0.12 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: values, start: 'top 60%', end: 'bottom 50%', scrub: true } });
    }

    const tools = document.querySelector('[data-tools]');
    if (tools && !reduce) {
      const tiles = [...tools.querySelectorAll('[data-tool]')];
      const hub = tools.querySelector('.is-hub');
      const lines = tools.querySelector('[data-tools-lines]');
      const tl = gsap.timeline({ scrollTrigger: { trigger: tools, start: 'top 75%', once: true } });
      tl.from(hub, { scale: 0.4, opacity: 0, duration: 1.2, ease: 'back.out(1.8)' });
      if (lines) {
        const len = lines.getTotalLength();
        tl.fromTo(lines, { strokeDasharray: `${len}`, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', onComplete: () => gsap.set(lines, { strokeDasharray: '5 6' }) }, 0.2);
      }
      const hr = hub.getBoundingClientRect();
      tl.from(tiles.filter((t) => t !== hub), {
        x: (i, el) => { const r = el.getBoundingClientRect(); return hr.left + hr.width / 2 - (r.left + r.width / 2); },
        y: (i, el) => { const r = el.getBoundingClientRect(); return hr.top + hr.height / 2 - (r.top + r.height / 2); },
        scale: 0.3, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.08,
      }, 0.3);
    }
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
