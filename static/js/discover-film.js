/* VÉLOCITY Discovery: muted loop without on-screen playback controls. */
(() => {
  'use strict';
  const video = document.getElementById('discoverHeroVideo');
  if (!video) return;
  video.muted = true;
  video.loop = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    if (reduced.matches) { video.pause(); return; }
    const request = video.play();
    if (request && typeof request.catch === 'function') request.catch(() => {});
  };
  reduced.addEventListener?.('change', sync);
  video.addEventListener('canplay', sync, {once:true});
  sync();
})();
