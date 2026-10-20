
/* Velocity collection: preserve server filtering and the grid/list switch.
   The collection hero video has no visible pause/play button. */
(() => {
  "use strict";

  const grid = document.getElementById("vehicleGrid");
  const viewButtons = document.querySelectorAll("[data-view]");

  // Preserve the grid/list view switch.
  if (grid && viewButtons.length) {
    const setView = mode => {
      const list = mode === "list";

      grid.classList.toggle("list-view", list);

      viewButtons.forEach(button => {
        const selected =
          button.dataset.view === (list ? "list" : "grid");

        button.classList.toggle("active", selected);

        button.setAttribute(
          "aria-pressed",
          String(selected)
        );
      });

      try {
        localStorage.setItem(
          "velocity:view:v1",
          list ? "list" : "grid"
        );
      } catch {
        // Private browsing may disable local storage.
      }
    };

    let initialView = "grid";

    try {
      initialView =
        localStorage.getItem("velocity:view:v1") || "grid";
    } catch {
      // Grid remains the default.
    }

    setView(initialView);

    viewButtons.forEach(button => {
      button.addEventListener("click", () => {
        setView(button.dataset.view);
      });
    });
  }

  // Play the collection hero video without a toggle button.
  const video = document.getElementById("collectionHeroVideo");

  if (!video) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const updateMotionPreference = () => {
    if (reduceMotion.matches) {
      video.pause();
    } else if (!document.hidden) {
      const playRequest = video.play();

      if (
        playRequest &&
        typeof playRequest.catch === "function"
      ) {
        playRequest.catch(() => {});
      }
    }
  };

  reduceMotion.addEventListener?.(
    "change",
    updateMotionPreference
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      video.pause();
    } else {
      updateMotionPreference();
    }
  });

  updateMotionPreference();
})();
