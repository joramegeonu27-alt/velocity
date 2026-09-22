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
       AMBIENT BACKGROUND PARALLAX
       The orbs drift on their own via CSS; this adds a slow
       extra offset tied to scroll position for depth.
       ========================================= */

    const ambientBg = document.getElementById("ambientBg");

    function updateAmbientParallax() {

        if (prefersReducedMotion || !ambientBg) return;

        const offset = window.scrollY * 0.06;
        ambientBg.style.transform = "translateY(" + offset + "px)";

    }

    window.addEventListener("scroll", updateAmbientParallax, { passive: true });
    updateAmbientParallax();


    /* =========================================
       REVEAL ON SCROLL
       ========================================= */

    const revealTargets = document.querySelectorAll("[data-reveal]");

    let lineIndex = 0;

    revealTargets.forEach(function (el) {

        if (el.classList.contains("reveal-line")) {
            el.style.transitionDelay = (lineIndex % 6) * 80 + "ms";
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
       SCRAMBLE TEXT (section eyebrows)
       ========================================= */

    const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    function scrambleInto(el) {

        const finalText = el.textContent;

        if (prefersReducedMotion) return;

        const duration = 500;
        const start = performance.now();

        function tick(now) {

            const progress = Math.min((now - start) / duration, 1);
            const revealCount = Math.floor(progress * finalText.length);

            let out = "";

            for (let i = 0; i < finalText.length; i++) {

                if (i < revealCount) {
                    out += finalText[i];
                } else if (finalText[i] === " ") {
                    out += " ";
                } else {
                    out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                }

            }

            el.textContent = out;

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                el.textContent = finalText;
            }

        }

        requestAnimationFrame(tick);

    }

    const scrambleTargets = document.querySelectorAll("[data-scramble]");

    const scrambleObserver = new IntersectionObserver(
        function (entries) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {
                    scrambleInto(entry.target);
                    scrambleObserver.unobserve(entry.target);
                }

            });

        },
        { threshold: 0.6 }
    );

    scrambleTargets.forEach(function (el) {
        scrambleObserver.observe(el);
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
       TIMELINE FILL PROGRESS
       ========================================= */

    const timelineFill = document.getElementById("timelineFill");
    const timelineItems = document.querySelectorAll(".timeline-item");

    if (timelineFill && timelineItems.length) {

        let revealedCount = 0;

        const timelineObserver = new IntersectionObserver(
            function (entries) {

                entries.forEach(function (entry) {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("is-visible");
                        revealedCount++;

                        const fillPercent = (revealedCount / timelineItems.length) * 100;
                        timelineFill.style.height = fillPercent + "%";

                        timelineObserver.unobserve(entry.target);

                    }

                });

            },
            { threshold: 0.4 }
        );

        timelineItems.forEach(function (item) {
            timelineObserver.observe(item);
        });

    }


    /* =========================================
       VALUE CARD TILT + CONTAINED CURSOR GLOW
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

                // Contained glow highlight — stays within the card's own bounds
                if (card.hasAttribute("data-glow")) {
                    card.style.setProperty("--mx", x + "px");
                    card.style.setProperty("--my", y + "px");
                }

            });

            card.addEventListener("mouseleave", function () {

                card.style.transition = "transform 0.5s ease, border-color 0.3s ease, box-shadow 0.3s ease";
                card.style.transform = "perspective(600px) rotateX(0) rotateY(0) translateY(0)";

            });

        });

    }


    /* =========================================
       MAGNETIC BUTTON
       ========================================= */

    if (hasFinePointer && !prefersReducedMotion) {

        document.querySelectorAll("[data-magnetic]").forEach(function (btn) {

            const strength = 0.35;
            const radius = 90;

            btn.addEventListener("mousemove", function (e) {

                const rect = btn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const dx = e.clientX - centerX;
                const dy = e.clientY - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < radius) {
                    btn.style.transform = "translate(" + dx * strength + "px, " + dy * strength + "px)";
                }

            });

            btn.addEventListener("mouseleave", function () {
                btn.style.transform = "translate(0, 0)";
            });

        });

    }

})();