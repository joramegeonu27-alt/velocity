/* VÉLOCITY — restrained home interactions. No dependency or external tracking. */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('page-home')) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const film = document.getElementById('homeEditorialVideo');
  const toggle = document.getElementById('homeEditorialVideoToggle');

  // Hero film: autoplay muted, user-controlled pause, and visibility-aware playback.
  const heroFilm = document.getElementById('velocityHeroVideo');
  const heroToggle = document.getElementById('velocityHeroVideoToggle');
  const heroStatus = document.getElementById('heroPlaybackStatus');
  if (heroFilm && heroToggle) {
    let pausedByUser = false;
    const updateHero = () => {
      const paused = heroFilm.paused;
      heroToggle.setAttribute('aria-pressed', String(paused));
      heroToggle.setAttribute('aria-label', paused ? 'Play hero film' : 'Pause hero film');
      heroToggle.innerHTML = paused ? 'PLAY <span aria-hidden="true">▶</span>' : 'PAUSE <span aria-hidden="true">Ⅱ</span>';
      if (heroStatus) heroStatus.textContent = paused ? 'FILM / PAUSED' : 'FILM / PLAYING';
    };
    heroToggle.addEventListener('click', () => {
      if (heroFilm.paused) {
        pausedByUser = false;
        heroFilm.play().catch(updateHero);
      } else { pausedByUser = true; heroFilm.pause(); }
      updateHero();
    });
    heroFilm.addEventListener('play', updateHero);
    heroFilm.addEventListener('pause', updateHero);
    if (reducedMotion) { pausedByUser = true; heroFilm.pause(); }
    else {
      heroFilm.play().catch(updateHero);
      if ('IntersectionObserver' in window) {
        const watching = new IntersectionObserver(entries => {
          for (const item of entries) {
            if (item.isIntersecting && !pausedByUser && !document.hidden) heroFilm.play().catch(updateHero);
            else if (!item.isIntersecting) heroFilm.pause();
          }
        }, { threshold: 0.06 });
        watching.observe(heroFilm);
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) heroFilm.pause();
        else if (!pausedByUser && heroFilm.getBoundingClientRect().bottom > 0 && heroFilm.getBoundingClientRect().top < innerHeight) heroFilm.play().catch(updateHero);
      });
    }
    updateHero();
  }
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

  if (film && toggle) {
    let manuallyPaused = false;
    const setToggle = () => {
      const paused = film.paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.setAttribute('aria-label', paused ? 'Play film' : 'Pause film');
      toggle.innerHTML = paused ? 'PLAY FILM <span aria-hidden="true">▶</span>' : 'PAUSE FILM <span aria-hidden="true">Ⅱ</span>';
    };
    toggle.addEventListener('click', () => {
      if (film.paused) {
        manuallyPaused = false;
        film.play().catch(() => {});
      } else { manuallyPaused = true; film.pause(); }
      setToggle();
    });
    film.addEventListener('play', setToggle);
    film.addEventListener('pause', setToggle);
    if (reducedMotion) { manuallyPaused = true; film.pause(); }
    else {
      const canPlay = film.play();
      if (canPlay && typeof canPlay.catch === 'function') canPlay.catch(() => { film.pause(); setToggle(); });
      if ('IntersectionObserver' in window) {
        const watchFilm = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.isIntersecting && !manuallyPaused && !document.hidden) film.play().catch(() => {});
            else if (!entry.isIntersecting) film.pause();
          }
        }, {threshold: 0.12});
        watchFilm.observe(film);
      }
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) film.pause();
        else if (!manuallyPaused && film.getBoundingClientRect().bottom > 0 && film.getBoundingClientRect().top < innerHeight) film.play().catch(() => {});
      });
    }
    setToggle();
  }

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
