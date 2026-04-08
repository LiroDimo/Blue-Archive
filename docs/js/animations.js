/* =====================================================
   ANIMATIONS.JS — Scroll Reveal, Parallax, Stats
   ===================================================== */

window.WikiAnimations = (function () {
  let observer = null;

  function init() { initScrollReveal(); initParallax(); }

  function initScrollReveal() {
    if (observer) observer.disconnect();
    const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-scale, .reveal-stagger');
    if (!targets.length) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    targets.forEach(el => { el.classList.remove('visible'); observer.observe(el); });
  }

  function initParallax() {
    const hero = document.querySelector('.parallax-image');
    if (!hero) return;
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => { hero.style.transform = `translateY(${window.scrollY * 0.3}px)`; ticking = false; });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function animateStatBars() {
    const bars = document.querySelectorAll('.stat-bar-fill[data-width]');
    if (!bars.length) return;
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => { entry.target.style.width = entry.target.dataset.width; entry.target.classList.add('animated'); }, 200);
          barObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    bars.forEach(bar => { bar.style.width = '0%'; barObserver.observe(bar); });
  }

  function initTimelinePulse() {
    const bullets = document.querySelectorAll('.timeline-bullet');
    if (!bullets.length) return;
    const bulletObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('pulse'); setTimeout(() => entry.target.classList.remove('pulse'), 2000); }
      });
    }, { threshold: 0.5 });
    bullets.forEach(b => bulletObserver.observe(b));
  }

  function refresh() { setTimeout(() => { initScrollReveal(); animateStatBars(); initTimelinePulse(); initParallax(); }, 50); }

  return { init, initScrollReveal, initParallax, animateStatBars, initTimelinePulse, refresh };
})();
