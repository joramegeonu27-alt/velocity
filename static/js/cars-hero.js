const heroCar = document.getElementById("heroCarImage");
const heroStage = document.querySelector(".cars-hero-stage");
const heroSection = document.querySelector(".cars-hero");

if (heroCar && heroStage && heroSection) {
    const cars = [
        "https://autoimage.capitalone.com/stock-media/chrome/2026-BMW-M4-Competition_xDrive-475-cc_2026BMC641955065_01_2100_475.png?height=900&width=1200",
        "https://pictures.dealer.com/m/manhattanporsche/1350/da9084a0102687e42786afe26c5ab38ex.jpg?imdensity=1&impolicy=downsize_bkpt&w=1024",
        "https://www.amarisupercars.com/blobs/stock/1241565/images/d12d5a1d-5fea-4578-8dda-2dba2a1cdd09.jpg?height=1333&width=2000"
    ];

    let currentCar = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scrollOffset = 0;

    heroCar.addEventListener("error", function () {
        heroCar.src = cars[0];
    });

    heroStage.addEventListener("pointermove", function (event) {
        const rect = heroStage.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        targetX = x * 18;
        targetY = y * -10;
    });

    heroStage.addEventListener("pointerleave", function () {
        targetX = 0;
        targetY = 0;
    });

    heroSection.addEventListener("wheel", function (event) {
        if (Math.abs(event.deltaY) < 2) {
            return;
        }

        const direction = event.deltaY > 0 ? 1 : -1;

        currentCar = (currentCar + direction + cars.length) % cars.length;
        heroCar.classList.add("is-switching");

        window.setTimeout(function () {
            heroCar.src = cars[currentCar];
            heroCar.classList.remove("is-switching");
        }, 220);
    }, { passive: true });

    window.setInterval(function () {
        currentCar = (currentCar + 1) % cars.length;
        heroCar.classList.add("is-switching");

        window.setTimeout(function () {
            heroCar.src = cars[currentCar];
            heroCar.classList.remove("is-switching");
        }, 220);
    }, 6500);

    function animate() {
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

    window.addEventListener("scroll", function () {
        scrollOffset = window.scrollY - heroSection.offsetTop;
    }, { passive: true });

    animate();
}
