/* Server-rendered filtering works without JS; the view switch is an enhancement. */
(() => {
  "use strict";
  const grid = document.getElementById("vehicleGrid");
  const buttons = document.querySelectorAll("[data-view]");
  if (!grid || !buttons.length) return;
  const setView = mode => {
    const list = mode === "list";
    grid.classList.toggle("list-view", list);
    buttons.forEach(button => {
      const selected = button.dataset.view === (list ? "list" : "grid");
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    try { localStorage.setItem("velocity:view:v1", list ? "list" : "grid"); } catch {}
  };
  let saved = "grid";
  try { saved = localStorage.getItem("velocity:view:v1") || "grid"; } catch {}
  setView(saved);
  buttons.forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
})();
