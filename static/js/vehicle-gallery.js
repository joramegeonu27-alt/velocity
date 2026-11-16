/* VÉLOCITY / automotive directory · Collection detail studio + gallery view switcher.
   No API credentials ever reach browser code. The only backend endpoints are /api/velocity/*.
   Collection and Discovery are browse-only; Compare alone dispatches velocity:add-car.
*/
(() => {
  'use strict';
  const roots = document.querySelectorAll('[data-velocity-gallery]');
  if (!roots.length) return;

  const PHOTO_FILE = /^car_[a-f0-9]{32,80}\.(?:avif|webp|jpe?g|png)$/i;
  const PHOTO_HOSTS = new Set(['carvariables.com', 'www.carvariables.com', 'cdn.carvariables.com']);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const hasNumber = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const num = (v, unit = '') => hasNumber(v) ? `${Number(v).toLocaleString()}${unit ? ' ' + unit : ''}` : '—';
  const flag = countryCode => {
    const code = String(countryCode || '').toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0))) : '◈';
  };
  const formattedRange = (v, unit = '') => {
    if (!v || !hasNumber(v.min) || !hasNumber(v.max)) return '—';
    return Number(v.min) === Number(v.max) ? num(v.min, unit) : `${num(v.min)}–${num(v.max)}${unit ? ' ' + unit : ''}`;
  };
  const period = car => `${car.year_start || 'Year unknown'} – ${car.year_end || 'present'}`;
  const carName = car => `${car.make?.name || ''} ${car.name || car.model || 'Vehicle'}`.trim();
  const fact = (label, value) => {
    const d = el('div', 'vg-fact');
    d.append(el('dt', '', label), el('dd', '', value || '—'));
    return d;
  };

  // Accept only the known CarVariables image hosts and published car image pattern.
  function photoCandidates(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
      let source = raw.trim();
      if (source.startsWith('//')) source = 'https:' + source;
      const parsed = source.startsWith('/images/') ? new URL(source, 'https://carvariables.com') : new URL(source);
      if (parsed.protocol !== 'https:' || !PHOTO_HOSTS.has(parsed.hostname.toLowerCase())) return [];
      const match = /^\/images\/(car_[a-f0-9]{32,80}\.(?:avif|webp|jpe?g|png))$/i.exec(parsed.pathname);
      if (!match || !PHOTO_FILE.test(match[1])) return [];
      return [...new Set([
        '/api/velocity/photo?file=' + encodeURIComponent(match[1]),
        parsed.origin + parsed.pathname,
        'https://cdn.carvariables.com/images/' + encodeURIComponent(match[1])
      ])];
    } catch (_) { return []; }
  }
  function picture(car, { interactive = false, label = '' } = {}) {
    const container = el(interactive ? 'button' : 'div', `vg-photo ${interactive ? 'vg-photo-button' : 'vg-photo-static'}`);
    if (interactive) {
      container.type = 'button';
      container.setAttribute('aria-label', label || `Open ${carName(car)}`);
    }
    const candidates = photoCandidates(car.image_url);
    if (!candidates.length) {
      container.append(el('span', 'vg-photo-missing', 'PHOTOGRAPH UNAVAILABLE'));
      container.classList.add('vg-missing');
      return container;
    }
    const img = el('img');
    img.alt = `${carName(car)} — representative vehicle photograph`;
    img.loading = 'lazy';
    img.decoding = 'async';
    let index = 0;
    img.addEventListener('error', () => {
      index++;
      if (index < candidates.length) { img.src = candidates[index]; return; }
      container.replaceChildren(el('span', 'vg-photo-missing', 'PHOTOGRAPH UNAVAILABLE'));
      container.classList.add('vg-missing');
      console.warn('[VÉLOCITY] Photo unavailable:', car.code || carName(car));
    });
    container.append(img);
    img.src = candidates[0];
    return container;
  }
  const formHTML = `
    <form class="vg-form" role="search" data-vg-form>
      <label class="vg-keyword">SEARCH MAKE, MODEL OR YEAR<input type="search" name="q" maxlength="200" placeholder="e.g. BMW M3 2008, Lexus RX, Porsche 911" autocomplete="off"></label>
      <label>MANUFACTURER<input name="make" maxlength="120" placeholder="e.g. Porsche"></label>
      <label>MODEL<input name="modelFamily" maxlength="160" placeholder="e.g. 911"></label>
      <label>YEAR<input name="modelYear" type="number" min="1886" max="2100" placeholder="Any"></label>
      <label>BODY STYLE<select name="body"><option value="">All bodies</option><option value="sedan">Sedan</option><option value="coupe">Coupé</option><option value="suv">SUV</option><option value="hatchback">Hatchback</option><option value="wagon">Wagon</option><option value="convertible">Convertible</option><option value="gt">GT</option><option value="pickup">Pickup</option><option value="mpv">MPV</option><option value="van">Van</option></select></label>
      <label>FUEL<select name="fuel"><option value="">Any fuel</option><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option><option value="other">Other</option></select></label>
      <label>ORDER BY<select name="sort"><option value="relevance">Relevance</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select></label>
      <label>DRIVE<select name="drive"><option value="">Any drive</option><option value="awd">AWD</option><option value="rwd">RWD</option><option value="fwd">FWD</option></select></label>
      <div class="vg-form-buttons"><button class="vg-submit" type="submit">EXPLORE CARS ↗</button><button class="vg-clear" type="reset">RESET</button></div>
    </form>
    <p class="vg-filter-note">Free-text searches take priority. Clear the search box to combine manufacturer, model, year, fuel and drivetrain filters.</p>
    <div class="vg-quick"><span>EXPLORE MAKES</span><button type="button" data-vg-make="Lexus">LEXUS</button><button type="button" data-vg-make="BMW">BMW</button><button type="button" data-vg-make="Mercedes-Benz">MERCEDES-BENZ</button><button type="button" data-vg-make="Porsche">PORSCHE</button><button type="button" data-vg-make="Toyota">TOYOTA</button><a class="vg-all-makes" href="/manufacturers">ALL MANUFACTURERS ↗</a></div>
    <div class="vg-result-head"><span role="status" aria-live="polite" data-vg-status>Loading photographed vehicle generations…</span>
      <div class="vg-view-controls"><span data-vg-pages></span><div class="vg-layout-switch" role="group" aria-label="Vehicle photo layout"><button type="button" data-vg-view="grid" aria-label="Grid view" aria-pressed="true" title="Grid view">▦</button><button type="button" data-vg-view="list" aria-label="List view" aria-pressed="false" title="List view">☷</button></div></div>
    </div>
    <div class="vg-browse" data-vg-browse><div class="vg-browse-main"><div class="vg-grid" data-vg-grid aria-label="Vehicle photo results"></div><div class="vg-more-row"><button type="button" data-vg-more hidden>LOAD MORE VEHICLES ↓</button></div></div><aside class="vg-inspector" data-vg-inspector aria-label="Selected vehicle details" aria-live="polite"><div class="vg-inspector-welcome"><span class="vg-inspector-icon">✳</span><p class="vg-kicker">VÉLOCITY / GENERATION DOSSIER</p><h3>EVERY DETAIL MATTERS.</h3><p>Choose a vehicle photograph to reveal the generation, engine variants, technical specifications and dimensions.</p></div></aside></div>
    <p class="vg-disclaimer">Photos represent vehicle generations, not individual trims. Availability varies by model; missing values remain unlisted. Data and watermarked imagery: <a href="https://carvariables.com" target="_blank" rel="noopener noreferrer">CarVariables</a>.</p>`;

  roots.forEach(root => {
    const mode = root.dataset.galleryMode || 'collection';
    const host = root.querySelector('[data-vg-interface]');
    if (!host) return;
    host.innerHTML = formHTML; // Static, trusted site-owned HTML only; API text uses textContent.
    const form = host.querySelector('[data-vg-form]');
    const grid = host.querySelector('[data-vg-grid]');
    const browse = host.querySelector('[data-vg-browse]');
    const inspector = host.querySelector('[data-vg-inspector]');
    const status = host.querySelector('[data-vg-status]');
    const pages = host.querySelector('[data-vg-pages]');
    const more = host.querySelector('[data-vg-more]');
    const counter = root.querySelector('[data-vg-total]');
    const submit = form.querySelector('[type="submit"]');
    let activeQuery = null, page = 0, loading = false, serial = 0, activeCode = '', selectedCard = null;
    const storeKey = `velocity:gallery-view:${mode}:v2`;
    let view = 'grid';
    try { view = localStorage.getItem(storeKey) === 'list' ? 'list' : 'grid'; } catch (_) {}
    const setView = value => {
      view = value === 'list' ? 'list' : 'grid';
      browse.classList.toggle('vg-is-list', view === 'list');
      host.querySelectorAll('[data-vg-view]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.vgView === view));
      });
      try { localStorage.setItem(storeKey, view); } catch (_) {}
    };
    host.querySelectorAll('[data-vg-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.vgView)));
    setView(view);

    function skeletons() {
      grid.replaceChildren();
      for (let i = 0; i < (mode === 'collection' ? 6 : 3); i++) {
        const block = el('div', 'vg-skeleton');
        block.append(el('div', 'vg-skel-photo'), el('div', 'vg-skel-line'), el('div', 'vg-skel-line'));
        grid.append(block);
      }
    }
    function showInspector(car, article, activeTab = 'overview') {
      if (mode !== 'collection') return;
      activeCode = car.code || carName(car);
      selectedCard?.classList.remove('vg-selected');
      selectedCard?.querySelector('[data-vg-open]')?.setAttribute('aria-pressed', 'false');
      selectedCard = article;
      article.classList.add('vg-selected');
      article.querySelector('[data-vg-open]')?.setAttribute('aria-pressed', 'true');
      inspector.replaceChildren();
      const header = el('div', 'vg-inspector-head');
      header.append(el('span', 'vg-inspector-kicker', 'GENERATION / VEHICLE INTELLIGENCE'), el('span', 'vg-inspector-code', car.code || ''));
      const h = el('h3', 'vg-inspector-title', carName(car));
      const small = el('p', 'vg-inspector-period', `${car.body?.label || 'Vehicle'} · ${period(car)}`);
      const detailImage = picture(car);
      detailImage.classList.add('vg-inspector-photo');
      const photoNote = el('p', 'vg-inspector-photo-note', 'Representative photograph per model generation.');
      const meta = el('div', 'vg-inspector-meta');
      meta.append(fact('BODY STYLE', car.body?.label || '—'), fact('PRODUCTION', period(car)), fact('VARIANTS', String(car.variant_count ?? '—')), fact('FUEL', Array.isArray(car.fuels) && car.fuels.length ? car.fuels.join(' / ') : '—'));
      const nav = el('div', 'vg-inspector-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Vehicle details');
      const content = el('div', 'vg-inspector-content');content.setAttribute('role','tabpanel');
      const tabs = ['overview','variants','specifications','dimensions','timeline'];
      const paintTab = selected => {
        activeTab = selected;
        [...nav.children].forEach(button => {
          button.setAttribute('aria-selected', String(button.dataset.tab === selected));
          button.tabIndex = button.dataset.tab === selected ? 0 : -1;
        });
        content.replaceChildren();
        if (selected === 'overview') {
          content.append(el('h4', '', 'KEY SPECIFICATIONS / RANGE'));
          const stats = el('dl', 'vg-inspector-facts');
          stats.append(fact('POWER', formattedRange(car.power_hp, 'hp')), fact('TORQUE', formattedRange(car.torque_nm, 'Nm')), fact('0–100 KM/H', formattedRange(car.zero_to_100_s, 's')), fact('TOP SPEED', formattedRange(car.top_speed_kmh, 'km/h')), fact('FUEL ECONOMY', formattedRange(car.fuel_economy_combined_l100, 'L/100 km')), fact('CURB WEIGHT', formattedRange(car.curb_weight_kg, 'kg')));
          content.append(stats);
          if (car.match?.year === 'nearest') content.append(el('p', 'vg-inspector-hint', 'Nearest generation match; check the requested model year.'));
        } else if (selected === 'variants') {
          content.append(el('h4', '', 'AVAILABLE ENGINE & TRIM VARIANTS'));
          const variants = Array.isArray(car.variants) ? car.variants : [];
          if (!variants.length) content.append(el('p','vg-unavailable','Individual trim data is not published for this generation.'));
          variants.forEach((v, index) => {
            const panel = el('details', 'vg-trim');
            const summary = el('summary','',v.name || `Variant ${index + 1}`);
            const specs = el('dl','vg-inspector-facts');
            specs.append(fact('ENGINE', hasNumber(v.displacement_cc) ? num(v.displacement_cc,'cc') : '—'),fact('CYLINDERS',num(v.cylinders)),fact('POWER',num(v.power_hp,'hp')),fact('TORQUE',num(v.torque_nm,'Nm')),fact('TRANSMISSION',v.transmission || '—'),fact('DRIVETRAIN',v.drivetrain || '—'),fact('FUEL',v.fuel_type || v.fuel || '—'),fact('0–100 KM/H',num(v.zero_to_100_s,'s')));
            panel.append(summary, specs);content.append(panel);
          });
        } else if (selected === 'specifications') {
          content.append(el('h4','','VEHICLE INTELLIGENCE'));
          const specs = el('dl','vg-inspector-facts');
          specs.append(fact('COUNTRY',car.make?.country || '—'),fact('MANUFACTURER',car.make?.name || '—'),fact('MODEL',car.model || '—'),fact('GENERATION',car.generation || '—'),fact('BODY CLASS',car.body?.label || '—'),fact('FUEL TYPES',(car.fuels||[]).join(' / ') || '—'),fact('DRIVE TYPES',(car.drives||[]).join(' / ') || '—'),fact('MAX POWER',formattedRange(car.power_hp,'hp')));
          content.append(specs);
        } else if (selected === 'dimensions') {
          content.append(el('h4','','DIMENSIONS BY VARIANT'));
          const vs = Array.isArray(car.variants)?car.variants:[];
          if (!vs.length) content.append(el('p','vg-unavailable','Dimensions are not available.'));
          vs.forEach((v,i) => {
            const block = el('div','vg-trim-dimensions');
            block.append(el('p','vg-kicker',v.name || `Variant ${i+1}`));
            const dims=el('dl','vg-inspector-facts');
            dims.append(fact('LENGTH',num(v.length_mm,'mm')),fact('WIDTH',num(v.width_mm,'mm')),fact('HEIGHT',num(v.height_mm,'mm')),fact('WHEELBASE',num(v.wheelbase_mm,'mm')),fact('CURB WEIGHT',num(v.curb_weight_kg,'kg')));
            block.append(dims);content.append(block);
          });
        } else {
          content.append(el('h4','','GENERATION TIMELINE'));
          content.append(el('p','vg-timeline-years',period(car)));
          content.append(el('p','vg-inspector-hint','Production years describe the generation. Individual trims may have different availability periods.'));
        }
      };
      tabs.forEach(t => {
        const b = el('button','vg-inspector-tab',t.toUpperCase()); b.type='button';b.dataset.tab=t;b.setAttribute('role','tab');
        b.addEventListener('click',()=>paintTab(t));nav.append(b);
      });
      inspector.append(header,h,small,nav,detailImage,photoNote,meta,content);
      paintTab(activeTab);
      if (window.matchMedia('(max-width: 1100px)').matches) inspector.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function compareCar(car, variant) {
      if (mode !== 'compare') return;
      if (!variant || typeof window.velocitySpecsToCompare !== 'function') {
        status.textContent = 'Engine and trim data is unavailable for this generation.';
        return;
      }
      const selected = window.velocitySpecsToCompare(car, variant, `${carName(car)} ${car.year_start || ''}`);
      document.dispatchEvent(new CustomEvent('velocity:add-car', {detail:selected}));
      status.textContent = `${selected.brand} ${selected.model} added. Choose another vehicle to compare.`;
    }
    function card(car) {
      const article = el('article','vg-card');
      if (mode === 'collection') article.classList.add('vg-card-compact');
      const photo = picture(car,{interactive:true,label:mode === 'compare' ? `Add ${carName(car)} to comparison` : `View ${carName(car)} details`});
      photo.dataset.vgOpen='';photo.setAttribute('aria-pressed','false');
      const body=el('div','vg-card-body');
      const make=el('p','vg-make-row');make.append(el('span','vg-flag',flag(car.make?.country_code)),el('span','',car.make?.name || 'VEHICLE'));
      body.append(make,el('h3','vg-car-name',car.name || car.model || 'Vehicle generation'));
      body.append(el('p','vg-model-years',period(car)));
      const fuel=el('div','vg-fuel-badges');
      (Array.isArray(car.fuels)?car.fuels:[]).slice(0,3).forEach(v=>fuel.append(el('span',`vg-fuel vg-fuel-${String(v).toLowerCase()}`,v)));
      if (!fuel.childElementCount) fuel.append(el('span','vg-fuel','Fuel unlisted'));
      body.append(fuel);
      const stats=el('div','vg-compact-stats');
      stats.append(el('span','',`${car.variant_count ?? 0} variant${car.variant_count===1?'':'s'}`),el('span','',formattedRange(car.power_hp,'hp')));
      body.append(stats);
      const variants=Array.isArray(car.variants)?car.variants:[];
      const details=el('details','vg-details');details.append(el('summary','',`VIEW ALL SPECIFICATIONS ↗`));
      const selector=el('select','vg-variant-select');selector.setAttribute('aria-label',`Choose variant for ${carName(car)}`);
      variants.forEach((v,i)=>{const o=el('option','',v.name||`Trim ${i+1}`);o.value=String(i);selector.append(o)});
      const facts=el('dl','vg-variant-facts');
      const paint=()=>{const v=variants[Number(selector.value)]||variants[0];facts.replaceChildren(fact('ENGINE',hasNumber(v.displacement_cc)?num(v.displacement_cc,'cc'):'—'),fact('POWER',num(v.power_hp,'hp')),fact('TORQUE',num(v.torque_nm,'Nm')),fact('0–100 KM/H',num(v.zero_to_100_s,'s')),fact('TOP SPEED',num(v.top_speed_kmh,'km/h')),fact('TRANSMISSION',v.transmission||'—'),fact('DRIVE',v.drivetrain||'—'),fact('FUEL',v.fuel_type||v.fuel||'—'));};
      if (variants.length) {selector.addEventListener('change',paint);details.append(selector,facts);paint();}
      else details.append(el('p','vg-unavailable','Individual variant specifications are not available.'));
      if (mode==='compare' && variants.length) {
        const add=el('button','vg-compare','ADD SELECTED TRIM ↗');add.type='button';add.addEventListener('click',()=>compareCar(car,variants[Number(selector.value)]||variants[0]));details.append(add);
      }
      const action=el('button','vg-view-details',mode==='collection'?'VIEW GENERATION DETAILS ↗':mode==='compare'?'CHOOSE TRIM / SPECS ↗':'VIEW ALL SPECIFICATIONS ↗');
      action.type='button';action.setAttribute('aria-expanded','false');
      action.addEventListener('click',()=>{
        if (mode==='collection') showInspector(car,article,'specifications');
        else {details.open=!details.open;action.setAttribute('aria-expanded',String(details.open));}
      });
      details.addEventListener('toggle',()=>action.setAttribute('aria-expanded',String(details.open)));
      body.append(action);
      if(mode !== 'collection')body.append(details);
      photo.addEventListener('click',()=>{
        if (mode==='compare') { if(variants.length) compareCar(car,variants[0]);else {details.open=true;status.textContent='Trim details are not available for this vehicle.';} }
        else if(mode==='collection') showInspector(car,article);
        else {details.open=!details.open;action.setAttribute('aria-expanded',String(details.open));}
      });
      if (mode==='compare') photo.append(el('span','vg-photo-cta','SELECT TO COMPARE ↗'));
      article.append(photo,body);return article;
    }
    const queryValues = () => {
      const params = new URLSearchParams();
      for (const [key,value] of new FormData(form).entries()) if (String(value).trim()) params.set(key,String(value).trim());
      const q = params.get('q');
      if (q) for (const key of ['make','modelFamily','modelYear','body','fuel','drive']) params.delete(key);
      params.set('variants','1');params.set('per',mode==='collection'?'12':'9');
      return {endpoint:q?'/api/velocity/search':'/api/velocity/vehicles',params};
    };
    const load=async(next=1)=>{
      if(loading)return;
      if(next===1)activeQuery=queryValues();
      if(!activeQuery)return;
      loading=true;submit.disabled=true;more.hidden=true;
      const order=++serial;
      if(next===1){status.textContent='Loading vehicle photography and specifications…';skeletons();}
      else status.textContent='Loading more vehicle generations…';
      const params=new URLSearchParams(activeQuery.params);params.set('page',String(next));
      try {
        const response=await fetch(activeQuery.endpoint+'?'+params.toString(),{headers:{Accept:'application/json'}});
        const result=await response.json().catch(()=>({}));
        if(!response.ok||!result.success)throw new Error(result.error||'Vehicle catalogue is temporarily unavailable.');
        if(order!==serial)return;
        const data=result.data||{};const items=Array.isArray(data.results)?data.results:[];
        if(next===1){grid.replaceChildren();selectedCard=null;activeCode='';}
        const start=grid.children.length;
        const nodes=items.map(card);nodes.forEach(node=>grid.append(node));
        if(next===1 && nodes.length && mode==='collection')showInspector(items[0],nodes[0]);
        if(!items.length&&next===1)grid.append(el('p','vg-empty','No vehicles match these filters. Try another manufacturer or model.'));
        page=next;const total=Number(data.total)||0;const max=Number(data.pages)||1;
        status.textContent=total?`${total.toLocaleString()} vehicle generations · ${mode==='compare'?'Tap a photo to compare.':'Select a photograph to explore specifications.'}`:'No matching vehicles found.';
        if(counter)counter.textContent=`${total.toLocaleString()} VEHICLES`;
        pages.textContent=`PAGE ${page} / ${max}`;
        more.hidden=page>=max||!items.length;
      } catch(err) {
        if(next===1)grid.replaceChildren();
        grid.append(el('p','vg-empty',err.message||'Unable to load the vehicle catalogue.'));
        status.textContent=err.message||'Vehicle service unavailable';pages.textContent='';
        if(counter)counter.textContent='OFFLINE';
      } finally{loading=false;submit.disabled=false;}
    };
    form.addEventListener('submit',e=>{e.preventDefault();load(1)});
    form.addEventListener('reset',()=>setTimeout(()=>load(1),0));
    host.querySelectorAll('[data-vg-make]').forEach(b=>b.addEventListener('click',()=>{form.reset();form.elements.make.value=b.dataset.vgMake;load(1)}));
    more.addEventListener('click',()=>load(page+1));
    const incoming=new URLSearchParams(location.search);
    if(mode==='collection'||mode==='discover'||mode==='compare'){
      for(const name of ['q','make','modelFamily','modelYear','body','fuel','drive']){
        const v=incoming.get(name);if(v&&form.elements.namedItem(name))form.elements.namedItem(name).value=v;
      }
      if(incoming.get('brand')&&!form.elements.make.value)form.elements.make.value=incoming.get('brand').slice(0,120);
    }
    load(1);
  });
})();
