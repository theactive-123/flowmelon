/* Shared helpers for the Migration / Shopify / Design service pages.
   [data-svcb-stagger] — like data-reveal-stagger, but clears the inline transform afterwards
   so CSS hover transforms on the children keep working. */
(() => {
  const run = () => {
    const { gsap } = window;
    if (document.documentElement.classList.contains('no-motion')) return;
    document.querySelectorAll('[data-svcb-stagger]').forEach((wrap) => {
      gsap.from(wrap.children, { opacity: 0, y: 50, duration: 1.1, stagger: 0.08, clearProps: 'transform,opacity', scrollTrigger: { trigger: wrap, start: 'top 88%', once: true } });
    });
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
