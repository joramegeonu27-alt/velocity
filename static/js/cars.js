(function () {

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const searchInput = document.getElementById("carSearch");
    const searchButton = document.getElementById("searchButton");
    const noResults = document.getElementById("noResults");
    const resultsLine = document.getElementById("resultsLine");
    const carGrid = document.getElementById("carGrid");
    const filterChipsWrap = document.getElementById("filterChips");
    const sortSelect = document.getElementById("sortSelect");
    const viewGridBtn = document.getElementById("viewGridBtn");
    const viewListBtn = document.getElementById("viewListBtn");

    let carCards = Array.from(document.querySelectorAll(".car-card"));
    const totalCount = carCards.length;

    let activeBrand = "all";


    /* =========================================
       BUILD BRAND FILTER CHIPS
       ========================================= */

    const brands = Array.from(new Set(carCards.map(function (card) {
        return card.dataset.brand;
    }))).sort();

    brands.forEach(function (brand) {

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "filter-chip";
        chip.dataset.brand = brand;
        chip.textContent = brand;

        filterChipsWrap.appendChild(chip);

    });

    filterChipsWrap.addEventListener("click", function (e) {

        const chip = e.target.closest(".filter-chip");
        if (!chip) return;

        filterChipsWrap.querySelectorAll(".filter-chip").forEach(function (c) {
            c.classList.remove("is-active");
        });

        chip.classList.add("is-active");
        activeBrand = chip.dataset.brand;

        chip.classList.remove("is-popping");
        void chip.offsetWidth; // restart the animation
        chip.classList.add("is-popping");

        applyFilters();

    });


    /* =========================================
       SEARCH + BRAND FILTER (combined)
       ========================================= */

    function applyFilters() {

        const searchText = searchInput.value.toLowerCase().trim();
        let visibleCount = 0;

        carCards.forEach(function (card) {

            const matchesSearch = card.dataset.car.toLowerCase().includes(searchText);
            const matchesBrand = activeBrand === "all" || card.dataset.brand === activeBrand;
            const isVisible = matchesSearch && matchesBrand;

            card.style.display = isVisible ? "" : "none";

            if (isVisible) visibleCount++;

        });

        noResults.hidden = visibleCount !== 0;

        const newText =
            visibleCount === totalCount
                ? "Showing all " + totalCount + " vehicles"
                : "Showing " + visibleCount + " of " + totalCount + " vehicles";

        if (resultsLine.textContent !== newText) {

            resultsLine.textContent = newText;

            resultsLine.classList.add("is-updating");
            setTimeout(function () {
                resultsLine.classList.remove("is-updating");
            }, 260);

        }

    }

    searchButton.addEventListener("click", applyFilters);

    searchInput.addEventListener("input", applyFilters);

    searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            applyFilters();
        }
    });

    applyFilters();


    /* =========================================
       SORT
       ========================================= */

    function sortCards(mode) {

        const sorted = carCards.slice();

        function num(card, key) {
            return parseFloat(card.dataset[key]) || 0;
        }

        if (mode === "hp-desc") {
            sorted.sort(function (a, b) { return num(b, "hp") - num(a, "hp"); });
        } else if (mode === "hp-asc") {
            sorted.sort(function (a, b) { return num(a, "hp") - num(b, "hp"); });
        } else if (mode === "zero-asc") {
            sorted.sort(function (a, b) { return num(a, "zerotosixty") - num(b, "zerotosixty"); });
        } else if (mode === "topspeed-desc") {
            sorted.sort(function (a, b) { return num(b, "topspeed") - num(a, "topspeed"); });
        } else if (mode === "name-asc") {
            sorted.sort(function (a, b) { return a.dataset.car.localeCompare(b.dataset.car); });
        }
        // "default" — leave in original (featured) order

        sorted.forEach(function (card) {
            carGrid.appendChild(card);
        });

    }

    sortSelect.addEventListener("change", function () {
        sortCards(sortSelect.value);
    });


    /* =========================================
       VIEW TOGGLE
       ========================================= */

    function setView(mode) {

        carGrid.classList.add("is-switching");

        setTimeout(function () {

            if (mode === "list") {
                carGrid.classList.add("is-list");
                viewListBtn.classList.add("is-active");
                viewGridBtn.classList.remove("is-active");
                viewListBtn.setAttribute("aria-pressed", "true");
                viewGridBtn.setAttribute("aria-pressed", "false");
            } else {
                carGrid.classList.remove("is-list");
                viewGridBtn.classList.add("is-active");
                viewListBtn.classList.remove("is-active");
                viewGridBtn.setAttribute("aria-pressed", "true");
                viewListBtn.setAttribute("aria-pressed", "false");
            }

            carGrid.classList.remove("is-switching");

        }, prefersReducedMotion ? 0 : 180);

    }

    viewGridBtn.addEventListener("click", function () { setView("grid"); });
    viewListBtn.addEventListener("click", function () { setView("list"); });


    /* =========================================
       SCROLL REVEAL FOR CARDS
       ========================================= */

    carCards.forEach(function (card, index) {
        card.style.transitionDelay = prefersReducedMotion ? "0ms" : (index % 6) * 70 + "ms";
    });

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

        carCards.forEach(function (card) {
            revealObserver.observe(card);
        });
    } else {
        carCards.forEach(function (card) {
            card.classList.add("is-visible");
        });
    }

    // Keep broken remote car images from leaving empty cards or repeatedly failing.
    document.querySelectorAll(".car-image img").forEach(function (image) {
        image.addEventListener("error", function () {
            if (image.dataset.fallbackApplied === "true") return;
            image.dataset.fallbackApplied = "true";
            image.src = "/static/hero-cover.png";
        });
    });

})();