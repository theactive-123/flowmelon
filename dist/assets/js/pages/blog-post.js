/* Blog post: reading progress, auto table of contents with active state, copy link, copy code. */
(() => {
  const run = () => {
    const { gsap, ScrollTrigger } = window;
    const state = window.FlowMelon || {};
    const body = document.querySelector('[data-post-body]');
    if (!body) return;

    // reading progress
    const bar = document.querySelector('[data-post-progress]');
    if (bar) {
      gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: body, start: 'top 30%', end: 'bottom bottom', scrub: 0.3 } });
    }

    // table of contents from h2s
    const toc = document.querySelector('[data-post-toc]');
    const heads = Array.from(body.querySelectorAll('h2'));
    if (toc && heads.length) {
      heads.forEach((h, i) => {
        if (!h.id) h.id = 'section-' + (i + 1);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.dataset.toc || h.textContent.replace(/^\d+\.\s*/, '');
        a.addEventListener('click', (e) => {
          e.preventDefault();
          state.lenis ? state.lenis.scrollTo(h, { offset: -100, duration: 1.4 }) : h.scrollIntoView({ behavior: 'smooth' });
          history.replaceState(null, '', '#' + h.id);
        });
        li.appendChild(a);
        toc.appendChild(li);
      });
      const links = Array.from(toc.querySelectorAll('a'));
      const setActive = (i) => links.forEach((l, k) => l.classList.toggle('is-active', k === i));
      heads.forEach((h, i) => {
        const next = heads[i + 1];
        ScrollTrigger.create({
          trigger: h, start: 'top 40%',
          endTrigger: next || body, end: next ? 'top 40%' : 'bottom 40%',
          onToggle: (self) => self.isActive && setActive(i),
        });
      });
      gsap.from(links, { x: -12, opacity: 0, duration: 0.8, stagger: 0.05, delay: 0.3 });
    }

    // copy link
    document.querySelectorAll('[data-copy-link]').forEach((btn) => btn.addEventListener('click', () => {
      const done = () => { const t = btn.textContent; btn.textContent = 'Copied!'; btn.classList.add('is-copied'); setTimeout(() => { btn.textContent = t; btn.classList.remove('is-copied'); }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, done); else done();
    }));

    // copy code blocks
    document.querySelectorAll('[data-copy-code]').forEach((btn) => btn.addEventListener('click', () => {
      const pre = btn.closest('.post-code').querySelector('pre');
      const t = btn.textContent;
      const done = () => { btn.textContent = 'Copied'; setTimeout(() => (btn.textContent = t), 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(pre.innerText).then(done, done); else done();
    }));

    ScrollTrigger.refresh();
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
