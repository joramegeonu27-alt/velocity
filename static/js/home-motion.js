
/* VELOCITY — LUXURY HOMEPAGE MOTION */

(() => {
  "use strict";

  if (!document.body.classList.contains("page-home")) return;

  const reduce = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const coarse = window.matchMedia(
    "(pointer: coarse)"
  ).matches;

  const title = document.querySelector(".hero-title");
  const kicker = document.querySelector(".kicker-text");

  // WELCOME TEXT: LETTER-BY-LETTER ANIMATION
  if (!reduce && kicker) {
    const letters = [...kicker.textContent];

    kicker.replaceChildren(
      ...letters.map((character, index) => {
        const letter = document.createElement("span");
        letter.className = "kicker-letter";
        letter.textContent =
          character === " " ? "\u00a0" : character;

        letter.style.setProperty(
          "--char",
          String(index)
        );

        return letter;
      })
    );

    document.documentElement.classList.add(
      "motion-ready"
    );
  }

  // MAGNETIC HEADLINE EFFECT
  if (!reduce && !coarse && title) {
    title.addEventListener("pointermove", (event) => {
      const rect = title.getBoundingClientRect();

      const horizontal =
        (event.clientX - rect.left) / rect.width - 0.5;

      const vertical =
        (event.clientY - rect.top) / rect.height - 0.5;

      title.style.setProperty(
        "--title-move-x",
        `${(horizontal * 8).toFixed(2)}px`
      );

      title.style.setProperty(
        "--title-move-y",
        `${(vertical * 8 - 6).toFixed(2)}px`
      );
    }, { passive: true });

    title.addEventListener("pointerleave", () => {
      title.style.removeProperty("--title-move-x");
      title.style.removeProperty("--title-move-y");
    });
  }

  // LOCAL CAR PHOTO FALLBACK
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const fallback = img.dataset.fallback;

      if (fallback && !img.src.endsWith(fallback)) {
        img.src = fallback;
      }
    });
  });

  if (reduce || coarse) return;

  // MOVING AMBIENT LIGHT
  const ambient = document.querySelector(
    ".ambient-pointer"
  );

  if (ambient) {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let running = false;

    const move = () => {
      ambient.style.setProperty(
        "--glow-x",
        `${x}px`
      );

      ambient.style.setProperty(
        "--glow-y",
        `${y}px`
      );

      running = false;
    };

    document.addEventListener("pointermove", (event) => {
      if (
        event.pointerType &&
        event.pointerType !== "mouse" &&
        event.pointerType !== "pen"
      ) {
        return;
      }

      x = event.clientX;
      y = event.clientY;

      if (!running) {
        running = true;
        requestAnimationFrame(move);
      }
    }, { passive: true });
  }

  // SPOTLIGHT AND 3D TILT ON EXPERIENCE CARDS
  const cards = document.querySelectorAll(
    "[data-spotlight]"
  );

  cards.forEach((card) => {
    let next;
    let scheduled = false;

    const paint = () => {
      scheduled = false;

      if (!next) return;

      const rect = card.getBoundingClientRect();

      const cx =
        (next.x - rect.left) / rect.width;

      const cy =
        (next.y - rect.top) / rect.height;

      card.style.setProperty(
        "--spot-x",
        `${(cx * 100).toFixed(2)}%`
      );

      card.style.setProperty(
        "--spot-y",
        `${(cy * 100).toFixed(2)}%`
      );

      card.style.setProperty(
        "--tilt-x",
        `${((cx - 0.5) * 3.6).toFixed(2)}deg`
      );

      card.style.setProperty(
        "--tilt-y",
        `${((0.5 - cy) * 3.2).toFixed(2)}deg`
      );
    };

    card.addEventListener("pointermove", (event) => {
      next = {
        x: event.clientX,
        y: event.clientY
      };

      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(paint);
      }
    }, { passive: true });

    card.addEventListener("pointerleave", () => {
      next = null;

      [
        "--spot-x",
        "--spot-y",
        "--tilt-x",
        "--tilt-y"
      ].forEach((property) => {
        card.style.removeProperty(property);
      });
    });
  });
})();
