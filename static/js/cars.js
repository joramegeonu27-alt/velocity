/* Velocity collection: preserve server filtering and the grid/list switch. */
(() => {
  "use strict";

  const grid = document.getElementById("vehicleGrid");
  const viewButtons = document.querySelectorAll("[data-view]");

  if (grid && viewButtons.length) {
    const setView = mode => {
      const list = mode === "list";
      grid.classList.toggle("list-view", list);
      viewButtons.forEach(button => {
        const selected = button.dataset.view === (list ? "list" : "grid");
        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      try { localStorage.setItem("velocity:view:v1", list ? "list" : "grid"); }
      catch { /* Private browsing may disable local storage. */ }
    };

    let initialView = "grid";
    try { initialView = localStorage.getItem("velocity:view:v1") || "grid"; }
    catch { /* Grid remains the default. */ }
    setView(initialView);
    viewButtons.forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  }

  const video = document.getElementById("collectionHeroVideo");
  const toggle = document.getElementById("collectionVideoToggle");
  if (!video || !toggle) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const icon = toggle.querySelector(".collection-video-toggle-icon");
  const label = toggle.querySelector(".collection-video-toggle-label");

  const reflectState = () => {
    const paused = video.paused;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
    if (icon) icon.textContent = paused ? "▶" : "Ⅱ";
    if (label) label.textContent = paused ? "PLAY FILM" : "PAUSE FILM";
  };

  toggle.hidden = false;
  video.addEventListener("play", reflectState);
  video.addEventListener("pause", reflectState);
  video.addEventListener("error", () => {
    video.hidden = true;
    toggle.hidden = true;
  });

  toggle.addEventListener("click", async () => {
    if (!video.paused) {
      video.pause();
      return;
    }
    try { await video.play(); }
    catch { reflectState(); }
  });

  const updateMotionPreference = () => {
    if (reduceMotion.matches) video.pause();
  };
  reduceMotion.addEventListener?.("change", updateMotionPreference);
  updateMotionPreference();
  reflectState();
})();
