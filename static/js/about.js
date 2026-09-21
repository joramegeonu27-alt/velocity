(function () {

    const prefersReducedMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hasFinePointer =
        window.matchMedia("(pointer: fine)").matches;


    /* =========================================
       SCROLL PROGRESS BAR
       ========================================= */

    const progressBar = document.getElementById("scrollProgress");

    function updateScrollProgress() {

        const scrollTop = window.scrollY;
        const docHeight =
            document.documentElement.scrollHeight - window.innerHeight;

        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

        progressBar.style.width = progress + "%";

    }

    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    updateScrollProgress();


    /* =========================================
       REVEAL ON SCROLL
       ========================================= */

    const revealTargets = document.querySelectorAll("[data-reveal]");

    // Stagger successive reveal-lines within the same paragraph
    let lineIndex = 0;

    revealTargets.forEach(function (el) {

        if (el.classList.contains("reveal-line")) {
            el.style.transitionDelay = (lineIndex % 5) * 90 + "ms";
            lineIndex++;
        }

    });

    const revealObserver = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }

            });

        },
        { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );

    revealTargets.forEach(function (el) {
        revealObserver.observe(el);
    });


    /* =========================================
       SECTION DOT NAV
       ========================================= */

    const sectionDots = document.querySelectorAll(".section-dot");
    const sections = [];

    sectionDots.forEach(function (dot) {

        const target = document.getElementById(dot.dataset.target);

        if (target) {
            sections.push({ dot: dot, el: target });
        }

    });

    const sectionObserver = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (entry) {

                const match = sections.find(function (s) {
                    return s.el === entry.target;
                });

                if (!match) return;

                if (entry.isIntersecting) {

                    sectionDots.forEach(function (d) {
                        d.classList.remove("is-active");
                    });

                    match.dot.classList.add("is-active");

                }

            });

        },
        { threshold: 0.5 }
    );

    sections.forEach(function (s) {
        sectionObserver.observe(s.el);
    });


    /* =========================================
       COUNT-UP STATS
       ========================================= */

    function formatCompact(value) {

        if (value >= 1000000) {
            return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
        }

        if (value >= 1000) {
            return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
        }

        return String(value);

    }

    function animateCount(el) {

        const target = parseInt(el.dataset.count, 10) || 0;
        const suffix = el.dataset.suffix || "";
        const isCompact = el.dataset.format === "compact";

        if (prefersReducedMotion) {
            el.textContent = (isCompact ? formatCompact(target) : target.toLocaleString()) + suffix;
            return;
        }

        const duration = 1400;
        const start = performance.now();

        function tick(now) {

            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);

            el.textContent = (isCompact ? formatCompact(current) : current.toLocaleString()) + suffix;

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = (isCompact ? formatCompact(target) : target.toLocaleString()) + suffix;
            }

        }

        requestAnimationFrame(tick);

    }

    const statValues = document.querySelectorAll(".stat-value");

    const statObserver = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {
                    animateCount(entry.target);
                    statObserver.unobserve(entry.target);
                }

            });

        },
        { threshold: 0.6 }
    );

    statValues.forEach(function (el) {
        statObserver.observe(el);
    });


    /* =========================================
       CUSTOM CURSOR (desktop, motion-safe only)
       ========================================= */

    if (hasFinePointer && !prefersReducedMotion) {

        const cursorDot = document.getElementById("cursorDot");
        const cursorRing = document.getElementById("cursorRing");
        const cursorSpotlight = document.getElementById("cursorSpotlight");

        let dotX = 0, dotY = 0;
        let ringX = 0, ringY = 0;
        let glowX = 0, glowY = 0;
        let hasMoved = false;

        window.addEventListener("mousemove", function (e) {

            dotX = e.clientX;
            dotY = e.clientY;

            if (!hasMoved) {
                document.body.classList.add("cursor-active");
                ringX = dotX;
                ringY = dotY;
                glowX = dotX;
                glowY = dotY;
                hasMoved = true;
            }

        });

        function animateCursor() {

            // Ring: fast, tight chase right behind the real cursor
            ringX += (dotX - ringX) * 0.35;
            ringY += (dotY - ringY) * 0.35;

            // Spotlight: slow, heavy float — the layered "expensive" trail
            glowX += (dotX - glowX) * 0.05;
            glowY += (dotY - glowY) * 0.05;

            cursorDot.style.transform =
                "translate(" + dotX + "px, " + dotY + "px) translate(-50%, -50%)";

            cursorRing.style.transform =
                "translate(" + ringX + "px, " + ringY + "px) translate(-50%, -50%)";

            cursorSpotlight.style.transform =
                "translate(" + glowX + "px, " + glowY + "px) translate(-50%, -50%)";

            requestAnimationFrame(animateCursor);

        }

        animateCursor();

        document.querySelectorAll("a, button").forEach(function (el) {

            el.addEventListener("mouseenter", function () {
                cursorRing.style.transform += " scale(1.6)";
                cursorRing.style.borderColor = "var(--ember-bright)";
            });

            el.addEventListener("mouseleave", function () {
                cursorRing.style.borderColor = "var(--ember)";
            });

        });

    }


    /* =========================================
       VALUE CARD TILT (desktop, motion-safe only)
       ========================================= */

    if (hasFinePointer && !prefersReducedMotion) {

        document.querySelectorAll("[data-tilt]").forEach(function (card) {

            card.style.transition = "transform 0.4s ease, border-color 0.3s ease, box-shadow 0.3s ease";

            card.addEventListener("mousemove", function (e) {

                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateY = ((x - centerX) / centerX) * 6;
                const rotateX = -((y - centerY) / centerY) * 6;

                card.style.transition = "border-color 0.3s ease, box-shadow 0.3s ease";
                card.style.transform =
                    "perspective(600px) rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg) translateY(-4px)";

            });

            card.addEventListener("mouseleave", function () {

                card.style.transition = "transform 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease";
                card.style.transform = "perspective(600px) rotateX(0) rotateY(0) translateY(0)";

            });

        });

    }

})();