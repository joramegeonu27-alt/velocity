/* VÉLOCITY collection — persistent grid/list view and accessible hero-film control. */
(() => {
  'use strict';
  const grid = document.getElementById('vehicleGrid');
  const buttons = [...document.querySelectorAll('[data-view]')];
  const storageKey = 'velocity:view:v1';

  function setView(value) {
    const mode = value === 'list' ? 'list' : 'grid';
    grid?.classList.toggle('list-view', mode === 'list');
    buttons.forEach(button => {
      const active = button.dataset.view === mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    try { localStorage.setItem(storageKey, mode); } catch { /* private mode */ }
  }
  if (grid && buttons.length) {
    let saved = 'grid';
    try { saved = localStorage.getItem(storageKey) || saved; } catch { /* grid default */ }
    setView(saved);
    buttons.forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  }

  const video = document.getElementById('collectionHeroVideo');
  const toggle = document.getElementById('collectionVideoToggle');
  if (!video || !toggle) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  let pausedByUser = false;
  let allowed = !motion.matches && !saveData;

  function paint() {
    const playing = allowed && !video.paused && !video.ended;
    toggle.hidden = !allowed || Boolean(video.error);
    toggle.setAttribute('aria-pressed', String(!playing));
    toggle.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    toggle.querySelector('.collection-video-toggle-icon').textContent = playing ? 'Ⅱ' : '▶';
    toggle.querySelector('.collection-video-toggle-label').textContent = playing ? 'PAUSE FILM' : 'PLAY FILM';
  }
  function play() {
    if (!allowed || pausedByUser || document.hidden) return;
    const promise = video.play();
    if (promise?.catch) promise.catch(paint);
  }
  toggle.addEventListener('click', () => {
    if (video.paused) { pausedByUser = false; play(); }
    else { pausedByUser = true; video.pause(); }
    paint();
  });
  ['playing', 'pause', 'loadeddata', 'error'].forEach(event => video.addEventListener(event, paint));
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else play(); });
  const preferenceChange = () => {
    allowed = !motion.matches && !saveData;
    if (!allowed) { video.pause(); video.autoplay = false; }
    else play();
    paint();
  };
  if (motion.addEventListener) motion.addEventListener('change', preferenceChange);
  else if (motion.addListener) motion.addListener(preferenceChange);
  preferenceChange();
})();
