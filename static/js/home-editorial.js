/* VÉLOCITY — restrained home interactions. No dependency or external tracking. */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('page-home')) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const film = document.getElementById('homeEditorialVideo');

  // Muted, looping background films. Controls intentionally removed.
  const heroFilm = document.getElementById('velocityHeroVideo');
  const startFilm = (video) => {
    if (!video) return;
    video.muted = true;
    video.loop = true;
    if (reducedMotion) { video.pause(); return; }
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
  };
  startFilm(heroFilm);
  // Accessible vehicle browser uses only already-rendered Go catalogue data.
  const atelierTabs = [...document.querySelectorAll('[data-atelier-tab]')];
  const activateAtelier = (index, focus = false) => {
    atelierTabs.forEach((tab, position) => {
      const active = position === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
    if (focus) atelierTabs[index]?.focus();
  };
  atelierTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateAtelier(index));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? atelierTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + atelierTabs.length) % atelierTabs.length;
      activateAtelier(next, true);
    });
  });
  // Explore pathways: buttons reveal a contextual description and real page link.
  const pathTabs = [...document.querySelectorAll('[data-vh-path]')];
  const activatePath = (index, focus = false) => {
    pathTabs.forEach((tab, position) => {
      const active = position === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
    const counter = document.getElementById('vhPathCounter');
    if (counter) counter.textContent = `0${index + 1} — 03`;
    if (focus) pathTabs[index]?.focus();
  };
  pathTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activatePath(index));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? pathTabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + pathTabs.length) % pathTabs.length;
      activatePath(next, true);
    });
  });

  startFilm(film);

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const elements = [...document.querySelectorAll('.vh-reveal')];
    if (elements.length) {
      body.classList.add('vh-motion-enabled');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(({target, isIntersecting}) => {
          if (!isIntersecting) return;
          target.classList.add('vh-visible');
          observer.unobserve(target);
        });
      }, {threshold: 0.08, rootMargin: '0px 0px -30px 0px'});
      elements.forEach(el => observer.observe(el));
    }
  }
})();
