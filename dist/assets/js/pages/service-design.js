/* Webflow Design — page interactions (runs after the FlowMelon engine is ready) */
(() => {
  const run = () => {
    const { gsap } = window;
    if (document.documentElement.classList.contains('no-motion')) return;
    const bento = document.querySelector('.des-bento');
    if (bento) {
      // divider draws out from the "Start now" pill, then the three cards rise in sequence
      gsap.timeline({ delay: 0.5 })
        .from('.des-bento_line', { scaleX: 0, duration: 1.4, ease: 'power3.inOut' }, 0)
        .from('.des-bento_start', { scale: 0, rotation: -20, duration: 1, ease: 'back.out(2.2)' }, 0.3)
        .from(bento.querySelectorAll('.des-card'), { y: 70, opacity: 0, rotation: (i) => [-4, 0, 4][i], duration: 1.2, stagger: 0.12, clearProps: 'transform' }, 0.4);
      // the score card counts with a little bounce on its stars
      gsap.from('.des-card_stars svg', { scale: 0, rotation: -90, stagger: 0.08, duration: 0.7, ease: 'back.out(3)', delay: 1.4 });
    }
    // marquee band tilts the other way as you scroll past it
    const band = document.querySelector('.des-marquee .marquee');
    if (band) gsap.fromTo(band, { rotation: -3 }, { rotation: 2, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true } });
  };
  window.FlowMelon && window.FlowMelon.ready ? run() : document.addEventListener('flowmelon:ready', run);
})();
