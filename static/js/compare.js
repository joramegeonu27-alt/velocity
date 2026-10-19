/* Compare up to three cars. Uses textContent instead of HTML string building. */
(() => {
  "use strict";
  const picker = document.getElementById("pickerGrid");
  const cards = [...(picker?.querySelectorAll(".picker-card") || [])];
  if (!cards.length) return;
  const byId = new Map(cards.map(card => [card.dataset.id, card]));
  const counter = document.getElementById("selectedCounter");
  const status = document.getElementById("pickerStatus");
  const compareNow = document.getElementById("compareNow");
  const clear = document.getElementById("clearSelection");
  const area = document.getElementById("compareResult");
  const head = document.getElementById("compareHead");
  const body = document.getElementById("compareBody");
  const share = document.getElementById("shareComparison");
  let selection = [];
  let requestID = 0;

  function shareURL() {
    const link = new URL(window.location.href);
    link.searchParams.set("ids", selection.join(","));
    return link.toString();
  }
  function syncURL() {
    const link = new URL(window.location.href);
    if (selection.length) link.searchParams.set("ids", selection.join(","));
    else link.searchParams.delete("ids");
    history.replaceState(null, "", link.toString());
  }
  function refresh() {
    cards.forEach(card => {
      const selected = selection.includes(card.dataset.id);
      card.setAttribute("aria-pressed", String(selected));
      card.querySelector(".picker-check").textContent = selected ? "✓" : "+";
    });
    counter.textContent = `${selection.length} / 3 SELECTED`;
    compareNow.disabled = selection.length < 2;
    clear.disabled = selection.length === 0;
    status.textContent = selection.length < 2 ? "Choose at least two cars to start comparing." :
      selection.length === 3 ? "Three cars selected — ready to compare." : "Two cars selected — compare now or add one more.";
    area.hidden = true;
    requestID++;
    syncURL();
  }
  picker.addEventListener("click", event => {
    const card = event.target.closest(".picker-card");
    if (!card || !picker.contains(card)) return;
    const id = card.dataset.id;
    if (selection.includes(id)) selection = selection.filter(item => item !== id);
    else if (selection.length < 3) selection.push(id);
    else { status.textContent = "You can compare a maximum of three cars. Remove one to add another."; return; }
    refresh();
  });
  clear.addEventListener("click", () => { selection = []; refresh(); });

  function addCell(row, tag, content, scope) {
    const cell = document.createElement(tag);
    cell.textContent = content;
    if (scope) cell.scope = scope;
    row.appendChild(cell);
  }
  const toValue = input => input && input.trim() && input !== "0" && input !== "N/A" ? input : "Not listed";
  const fields = [
    ["Brand", (c) => c.brand], ["Model year", (c) => c.year],
    ["Horsepower", (c,s) => { const hp = s?.engine_hp || c.hp;return hp && hp !== "0" ? `${hp} hp` : ""; }],
    ["Engine", (c,s) => s?.displacement_l ? `${s.displacement_l}L ${s.engine_config || ""}`.trim() : c.engine],
    ["0–60 mph", (c) => c.accel], ["Top speed", (c) => c.speed],
    ["Drivetrain", (c,s) => s?.drive_type || c.drivetrain],
    ["Transmission", (c,s) => s?.transmission_style || c.transmission],
    ["Fuel", (c,s) => s?.fuel_primary || c.fuel],
    ["Cylinders", (_,s) => s?.cylinders],
    ["Body style", (_,s) => s?.body_class]
  ];
  function buildTable(ids, specs) {
    head.replaceChildren(); body.replaceChildren();
    addCell(head, "th", "SPECIFICATION", "col");
    ids.forEach(id => { const car = byId.get(id).dataset; addCell(head, "th", `${car.brand} ${car.model}`, "col"); });
    fields.forEach(([label, get]) => {
      const tr = document.createElement("tr");
      addCell(tr, "th", label, "row");
      ids.forEach(id => { const car = byId.get(id).dataset;addCell(tr,"td",toValue(String(get(car,specs.get(id)) || ""))); });
      body.appendChild(tr);
    });
  }
  async function runComparison(scroll=true) {
    if (selection.length < 2) return;
    const ids = [...selection], current = ++requestID;
    compareNow.disabled = true;
    status.textContent = "Preparing comparison…";
    const results = await Promise.all(ids.map(async id => {
      try {
        const response = await fetch(`/api/compare/specs?vin=${encodeURIComponent(id)}`, {headers:{Accept:"application/json"}});
        if (!response.ok) return [id, null];
        return [id, await response.json()];
      } catch { return [id, null]; }
    }));
    if (current !== requestID) return;
    buildTable(ids, new Map(results));
    area.hidden = false;
    compareNow.disabled = false;
    status.textContent = "Your comparison is ready.";
    if (scroll) area.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",block:"start"});
  }
  compareNow.addEventListener("click", () => runComparison());
  share.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(shareURL());share.textContent = "Link copied ✓"; }
    catch { share.textContent = "Copy URL from address bar"; }
  });
  const initial = new URL(window.location.href).searchParams.get("ids") || "";
  selection = [...new Set(initial.split(",").filter(id => byId.has(id)))].slice(0,3);
  refresh();
  if (selection.length >= 2) runComparison(false);
})();
