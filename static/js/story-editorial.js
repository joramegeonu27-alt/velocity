/* VÉLOCITY / Editorial story interactions — progressive enhancement. */
(() => {
  "use strict";
  const page = document.querySelector(".page-story-editorial");
  if (!page) return;

  const chapters = Array.from(document.querySelectorAll("[data-story-nav]"));
  const progress = document.getElementById("storyProgress");
  let scheduled = false;
  const updateScroll = () => {
    scheduled = false;
    const available = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, available > 0 ? window.scrollY / available : 0))})`;

    const marker = window.scrollY + (window.innerWidth <= 670 ? 184 : 205);
    let active = null;
    for (const link of chapters) {
      const id = link.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (target && target.offsetTop <= marker) active = link;
    }
    for (const link of chapters) {
      const current = link === active;
      link.classList.toggle("is-current", current);
      if (current) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    }
  };
  const scheduleUpdate = () => {
    if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateScroll); }
  };
  window.addEventListener("scroll", scheduleUpdate, {passive:true});
  window.addEventListener("resize", scheduleUpdate, {passive:true});
  scheduleUpdate();

  const nodes = Array.from(document.querySelectorAll("[data-story-timeline]"));
  const timeline = [
    {heading: "It begins with a question.", text: "What makes a machine memorable? The answer changes with every enthusiast—and that is where the story starts."},
    {heading: "A space for looking closer.", text: "The idea takes shape: an automotive experience that balances imagination with useful information, and design with substance."},
    {heading: "Curiosity becomes a platform.", text: "The Collection, Discovery, Vehicle Intelligence and Compare come together as different ways to explore the same passion."},
    {heading: "There's always another road.", text: "New machines, technologies and stories will keep changing the landscape. Our curiosity is designed to keep moving with them."}
  ];
  const timelineIndex = document.getElementById("storyTimelineIndex");
  const timelineHeading = document.getElementById("storyTimelineHeading");
  const timelineText = document.getElementById("storyTimelineText");
  function selectChapter(index, focus = false) {
    if (!timeline[index]) return;
    nodes.forEach((button, i) => {
      const active = i === index;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      if (active && focus) button.focus();
    });
    if (timelineIndex) timelineIndex.textContent = `CHAPTER 0${index+1} / 04`;
    if (timelineHeading) timelineHeading.textContent = timeline[index].heading;
    if (timelineText) timelineText.textContent = timeline[index].text;
  }
  nodes.forEach((button, index) => {
    button.addEventListener("click", () => selectChapter(index));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? nodes.length-1 : (index + (event.key === "ArrowRight" ? 1 : -1) + nodes.length) % nodes.length;
      selectChapter(next, true);
    });
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reducedMotion && "IntersectionObserver" in window) {
    const reveals = Array.from(document.querySelectorAll(".se-reveal"));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    }, {rootMargin:"0px 0px 12% 0px", threshold:0.04});
    for (const element of reveals) observer.observe(element);
    page.classList.add("se-enhanced");
  }
})();
