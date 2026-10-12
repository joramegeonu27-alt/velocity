(() => {
    const heroCar = document.getElementById("heroCarImage");
    const heroStage = document.querySelector(".cars-hero-stage");
    const heroSection = document.querySelector(".cars-hero");

    if (!heroCar || !heroStage || !heroSection) return;

    const fallbackImage = "/static/hero-cover.png";
    const cars = [
        "https://autoimage.capitalone.com/stock-media/chrome/2026-BMW-M4-Competition_xDrive-475-cc_2026BMC641955065_01_2100_475.png?height=900&width=1200",
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/2024_Porsche_911_992_Carrera.jpg?width=1200",
        "https://www.amarisupercars.com/blobs/stock/1241565/images/d12d5a1d-5fea-4578-8dda-2dba2a1cdd09.jpg?height=1333&width=2000"
    ];

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let currentCar = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scrollOffset = 0;
    let lastSwitch = 0;
    let fallbackUsed = false;

    function showCar(index) {
        currentCar = (index + cars.length) % cars.length;
        heroCar.classList.add("is-switching");
        window.setTimeout(() => {
            heroCar.src = cars[currentCar];
            heroCar.classList.remove("is-switching");
        }, 180);
    }

    heroCar.addEventListener("error", () => {
        if (heroCar.src.endsWith(fallbackImage) || fallbackUsed) return;
        fallbackUsed = true;
        heroCar.src = fallbackImage;
    });

    heroStage.addEventListener("pointermove", (event) => {
        if (reduceMotion) return;
        const rect = heroStage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
        targetY = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
    });

    heroStage.addEventListener("pointerleave", () => {
        targetX = 0;
        targetY = 0;
    });

    // Change the showcased car on a deliberate wheel gesture, not every tiny scroll event.
    heroStage.addEventListener("wheel", (event) => {
        if (reduceMotion || Math.abs(event.deltaY) < 20) return;
        const now = Date.now();
        if (now - lastSwitch < 900) return;
        lastSwitch = now;
        showCar(currentCar + (event.deltaY > 0 ? 1 : -1));
    }, { passive: true });

    if (!reduceMotion) {
        window.setInterval(() => showCar(currentCar + 1), 8000);
    }

    function animate() {
        if (!reduceMotion) {
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            const parallax = Math.min(Math.max(scrollOffset * 0.08, -18), 18);
            heroSection.style.setProperty("--hero-move-x", currentX + "px");
            heroSection.style.setProperty("--hero-move-y", (currentY + parallax) + "px");
            heroSection.style.setProperty("--hero-rotate-y", (currentX * 0.22) + "deg");
            heroSection.style.setProperty("--hero-rotate-x", (currentY * 0.16) + "deg");
            heroSection.style.setProperty("--hero-scale", "1.02");
            window.requestAnimationFrame(animate);
        }
    }

    window.addEventListener("scroll", () => {
        scrollOffset = window.scrollY - heroSection.offsetTop;
    }, { passive: true });

    if (!reduceMotion) animate();
})();