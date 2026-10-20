/* VÉLOCITY homepage film: respect motion preferences and data saver.
   No changes to the existing homepage animation or collection scripts. */
(() => {
  'use strict';
  const video = document.getElementById('homeHeroVideo');
  const hero = document.querySelector('.page-home .home-hero');
  const toggle = document.getElementById('homeHeroVideoToggle');
  if (!video || !hero || !toggle) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  let userPaused = false;
  let canPlayFilm = !motionQuery.matches && !saveData;

  function setVisualState() {
    const playing = !video.paused && !video.ended && video.readyState >= 2;
    hero.classList.toggle('hero-video-playing', playing && canPlayFilm);
    toggle.hidden = !canPlayFilm || video.error != null;
    toggle.setAttribute('aria-pressed', String(!playing));
    toggle.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    const icon = toggle.querySelector('.home-hero-video-icon');
    const label = toggle.querySelector('.home-hero-video-label');
    if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
    if (label) label.textContent = playing ? 'Pause film' : 'Play film';
  }

  function tryPlay() {
    if (!canPlayFilm || userPaused || document.hidden) return;
    const playing = video.play();
    if (playing && typeof playing.catch === 'function') {
      playing.catch(() => { hero.classList.remove('hero-video-playing'); });
    }
  }

  if (!canPlayFilm) {
    video.autoplay = false;
    video.pause();
    video.preload = 'none';
    toggle.hidden = true;
  } else {
    tryPlay();
  }

  video.addEventListener('playing', setVisualState);
  video.addEventListener('pause', setVisualState);
  video.addEventListener('error', setVisualState);
  video.addEventListener('loadeddata', setVisualState);

  toggle.addEventListener('click', () => {
    if (video.paused) {
      userPaused = false;
      tryPlay();
    } else {
      userPaused = true;
      video.pause();
    }
    setVisualState();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else tryPlay();
  });

  const onMotionChange = event => {
    canPlayFilm = !event.matches && !saveData;
    if (!canPlayFilm) video.pause(); else tryPlay();
    setVisualState();
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);

  setVisualState();
})();
