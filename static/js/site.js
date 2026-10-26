/* Shared navigation, image resilience, motion preferences and favorite state. */
(() => {
  "use strict";
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("menuToggle");
  const menu = document.getElementById("mainNav");
  const onScroll = () => header?.classList.toggle("scrolled", window.scrollY > 16);
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  function closeMenu() {
    menu?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("menu-open");
  }
  toggle?.addEventListener("click", () => {
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    menu.classList.toggle("open", opening);
    toggle.setAttribute("aria-expanded", String(opening));
    toggle.setAttribute("aria-label", opening ? "Close navigation" : "Open navigation");
    document.body.classList.toggle("menu-open", opening);
  });
  menu?.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", event => {if (event.key === "Escape") closeMenu();});
  window.addEventListener("resize", () => {if (window.innerWidth > 820) closeMenu();});

  // A failed remote photo uses a bundled fallback — no broken image icons.
  document.querySelectorAll("img[data-fallback]").forEach(image => {
    image.addEventListener("error", () => {
      const fallback = image.dataset.fallback;
      if (fallback && !image.src.endsWith(fallback)) image.src = fallback;
    });
    if (image.complete && image.naturalWidth === 0) image.dispatchEvent(new Event("error"));
  });

  const storageKey = "velocity:favorites:v1";
  const readFavorites = () => {
    try { const result = JSON.parse(localStorage.getItem(storageKey) || "[]"); return Array.isArray(result) ? result.filter(x => typeof x === "string") : []; }
    catch { return []; }
  };
  const favorites = new Set(readFavorites());
  function reflectFavorite(button) {
    const active = favorites.has(button.dataset.favorite);
    button.setAttribute("aria-pressed", String(active));
    const icon = button.querySelector("span");
    if (icon) icon.textContent = active ? "♥" : "♡";
    button.title = active ? "Remove from favorites" : "Save to favorites";
    const name = button.dataset.favoriteName || button.getAttribute('aria-label')?.replace(/^(Save|Remove) /, '').replace(/ from favorites$/, '') || 'vehicle';
    button.dataset.favoriteName = name;
    button.setAttribute('aria-label', active ? `Remove ${name} from favorites` : `Save ${name}`);
  }
  document.querySelectorAll("[data-favorite]").forEach(button => {
    reflectFavorite(button);
    button.addEventListener("click", () => {
      const id = button.dataset.favorite;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...favorites])); } catch { /* browsing still works */ }
      document.querySelectorAll(`[data-favorite="${CSS.escape(id)}"]`).forEach(reflectFavorite);
    });
  });
  // Subtle global scroll indicator. Disabled for reduced-motion users.
  const progress = document.getElementById('readingProgress');
  if (progress) {
    const updateProgress = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0})`;
    };
    window.addEventListener('scroll', updateProgress, {passive:true});
    window.addEventListener('resize', updateProgress, {passive:true});
    updateProgress();
  }
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    const showTop = () => backToTop.classList.toggle('is-visible', window.scrollY > 650);
    window.addEventListener('scroll', showTop, {passive:true});
    backToTop.addEventListener('click', () => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}));
    showTop();
  }
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-ready");
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) {entry.target.classList.add("visible");observer.unobserve(entry.target);} });
    }, {threshold:.13});
    document.querySelectorAll(".reveal").forEach(element => observer.observe(element));
  }
})();
