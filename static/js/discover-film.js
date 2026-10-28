/* VÉLOCITY Discovery — accessible film controls (no external dependencies). */
(() => {
  'use strict';
  const video = document.getElementById('discoverHeroVideo');
  const toggle = document.getElementById('discoverFilmToggle');
  if (!video || !toggle) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pausedByUser = reduced;
  const update = () => {
    const stopped = video.paused;
    toggle.setAttribute('aria-pressed', String(stopped));
    toggle.setAttribute('aria-label', stopped ? 'Play Discovery film' : 'Pause Discovery film');
    toggle.innerHTML = stopped ? 'PLAY <span aria-hidden="true">▶</span>' : 'PAUSE <span aria-hidden="true">Ⅱ</span>';
  };
  const play = () => {
    if (pausedByUser || document.hidden) return;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') attempt.catch(update);
  };
  toggle.addEventListener('click', () => {
    if (video.paused) { pausedByUser = false; play(); }
    else { pausedByUser = true; video.pause(); }
    update();
  });
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  if (reduced) { video.pause(); update(); return; }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) play();
        else video.pause();
      }
    }, {threshold:.1});
    observer.observe(video);
  } else play();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else play();
  });
  update();
})();
