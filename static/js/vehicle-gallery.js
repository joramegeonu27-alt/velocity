/* VÉLOCITY — Live photo-first vehicle catalogue. Credentials remain server-side. */
(() => {
  'use strict';
  const roots = document.querySelectorAll('[data-velocity-gallery]');
  if (!roots.length) return;
  // Normalize only published CarVariables image locations. The API can return
  // the website URL (which redirects to the CDN), a CDN URL or a relative path.
  // Never accept an arbitrary image host as a proxy destination.
  const PHOTO_FILE = /^car_[a-f0-9]{32,80}\.(?:avif|webp|jpe?g|png)$/i;
  const PHOTO_HOSTS = new Set(['carvariables.com', 'www.carvariables.com', 'cdn.carvariables.com']);
  const el = (tag, cls, value) => { const node=document.createElement(tag); if(cls)node.className=cls; if(value!==undefined)node.textContent=String(value);return node; };
  function photoCandidates(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return [];
    try {
      const input = raw.trim();
      const parsed = input.startsWith('/images/')
        ? new URL(input, 'https://carvariables.com')
        : new URL(input.startsWith('//') ? 'https:' + input : input);
      if (parsed.protocol !== 'https:' || !PHOTO_HOSTS.has(parsed.hostname.toLowerCase())) return [];
      const match = /^\/images\/(car_[a-f0-9]{32,80}\.(?:avif|webp|jpe?g|png))$/i.exec(parsed.pathname);
      if (!match || !PHOTO_FILE.test(match[1])) return [];
      const filename = match[1];
      // The backend proxy is preferred because it caches images. The provider
      // URL is an independent fallback, rather than a replacement car picture.
      return [
        '/api/velocity/photo?file=' + encodeURIComponent(filename),
        parsed.href,
        'https://cdn.carvariables.com/images/' + encodeURIComponent(filename)
      ];
    } catch (_) { return []; }
  }
  const available = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const number = (v, unit) => available(v) ? `${Number(v).toLocaleString()} ${unit}` : 'Not available';
  const field = (label, value) => {const item=el('div','vg-fact');item.append(el('dt','',label),el('dd','',value));return item;};
  const settings = `
    <form class="vg-form" role="search" data-vg-form>
      <label class="vg-keyword">SEARCH MAKE OR MODEL<input type="search" name="q" maxlength="200" placeholder="e.g. BMW M3 2008, Toyota Supra…" autocomplete="off"></label>
      <label>MANUFACTURER<input name="make" maxlength="120" placeholder="e.g. Porsche"></label>
      <label>MODEL<input name="modelFamily" maxlength="160" placeholder="e.g. 911"></label>
      <label>YEAR<input name="modelYear" type="number" min="1886" max="2100" placeholder="Any"></label>
      <label>BODY STYLE<select name="body"><option value="">All bodies</option><option value="sedan">Sedan</option><option value="coupe">Coupé</option><option value="suv">SUV</option><option value="hatchback">Hatchback</option><option value="wagon">Wagon</option><option value="convertible">Convertible</option><option value="gt">GT</option><option value="pickup">Pickup</option><option value="mpv">MPV</option><option value="van">Van</option></select></label>
      <label>FUEL<select name="fuel"><option value="">Any fuel</option><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="hybrid">Hybrid</option><option value="electric">Electric</option><option value="other">Other</option></select></label>
      <label>ORDER BY<select name="sort"><option value="relevance">Featured</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Model name</option></select></label>
      <label>DRIVE<select name="drive"><option value="">Any drive</option><option value="awd">AWD</option><option value="rwd">RWD</option><option value="fwd">FWD</option></select></label>
      <div class="vg-form-buttons"><button class="vg-submit" type="submit">FIND VEHICLES ↗</button><button class="vg-clear" type="reset">RESET</button></div>
    </form>
    <p class="vg-filter-note">TIP: A free-text search takes priority. Clear the search box to combine manufacturer, model, year, fuel and drivetrain filters.</p>
    <div class="vg-quick"><span>EXPLORE MAKES</span><button type="button" data-vg-make="Lexus">LEXUS</button><button type="button" data-vg-make="BMW">BMW</button><button type="button" data-vg-make="Mercedes-Benz">MERCEDES-BENZ</button><button type="button" data-vg-make="Porsche">PORSCHE</button><button type="button" data-vg-make="Toyota">TOYOTA</button></div>
    <div class="vg-quick"><span>QUICK SEARCHES</span><button type="button" data-vg-quick="Porsche 911">PORSCHE 911</button><button type="button" data-vg-quick="BMW M3">BMW M3</button><button type="button" data-vg-quick="Mercedes C63 AMG">MERCEDES-AMG</button><button type="button" data-vg-quick="Toyota Supra">TOYOTA SUPRA</button></div>
    <div class="vg-result-head"><span role="status" aria-live="polite" data-vg-status>Loading the VÉLOCITY photo catalogue…</span><span data-vg-pages></span></div>
    <div class="vg-grid" data-vg-grid aria-label="Photographed car results"></div>
    <div class="vg-more-row"><button type="button" data-vg-more hidden>LOAD MORE CARS ↓</button></div>
    <p class="vg-disclaimer">Photographs may be watermarked or unavailable for some generations. Specs describe catalogued models and trims, not an individual VIN. Vehicle images and additional specifications: <a href="https://carvariables.com" target="_blank" rel="noopener noreferrer">CarVariables</a>.</p>`;
  roots.forEach(root => {
    const host=root.querySelector('[data-vg-interface]');host.innerHTML=settings;
    const form=host.querySelector('[data-vg-form]');
    const grid=host.querySelector('[data-vg-grid]');
    const status=host.querySelector('[data-vg-status]');
    const pages=host.querySelector('[data-vg-pages]');
    const more=host.querySelector('[data-vg-more]');
    const counter=root.querySelector('[data-vg-total]');
    const submit=form.querySelector('[type=submit]');
    const mode=root.dataset.galleryMode||'collection';
    let query=null, page=0, loading=false, requestNumber=0;
    function skeletons(){grid.replaceChildren();for(let i=0;i<6;i++){const div=el('div','vg-skeleton');div.append(el('div','vg-skel-photo'),el('div','vg-skel-line'),el('div','vg-skel-line'));grid.append(div);}}
    function setMissing(photo, reason){
      photo.replaceChildren(el('span','vg-photo-missing','PHOTOGRAPH UNAVAILABLE'));
      photo.classList.add('vg-missing');
      if(reason)photo.title=reason;
    }
    function card(car, queryDescription){
      const article=el('article','vg-card');
      if(mode==='collection') article.classList.add('vg-card-compact');
      const photo=el(mode==='compare'?'button':'div',mode==='compare'?'vg-photo vg-photo-button':'vg-photo vg-photo-static');
      if(mode==='compare'){photo.type='button';photo.setAttribute('aria-label',`Add ${car.make?.name||''} ${car.name||car.model||''} to comparison`);}
      const sources=photoCandidates(car.image_url);
      if(sources.length){
        const img=el('img');
        img.alt=`${car.make?.name||''} ${car.name||car.model||''} — catalogued vehicle photograph`;
        img.loading='lazy';img.decoding='async';
        let attempt=0;
        img.addEventListener('error',()=>{
          attempt+=1;
          if(attempt<sources.length){img.src=sources[attempt];return;}
          console.warn('[VÉLOCITY] Vehicle photo failed after approved sources:',car.code||car.name||car.model, sources);
          setMissing(photo,'Photograph could not be downloaded; check Network requests for /api/velocity/photo and cdn.carvariables.com');
        });
        img.addEventListener('load',()=>photo.classList.remove('vg-missing'));
        photo.append(img);
        img.src=sources[0];
      }else{
        if(car.image_url)console.warn('[VÉLOCITY] Unrecognized vehicle image URL:', car.code||car.name||car.model,car.image_url);
        setMissing(photo,car.image_url?'Unsupported provider image URL':'No photograph published for this vehicle');
      }
      const body=el('div','vg-card-body');
      if(mode==='collection'){
        const makeRow=el('p','vg-make-row');
        const code=String(car.make?.country_code||'').toUpperCase();
        const flag=/^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(letter=>127397+letter.charCodeAt(0))):'◈';
        makeRow.append(el('span','vg-flag',flag),el('span','',car.make?.name||'VEHICLE'));
        body.append(makeRow);
      }else{
        body.append(el('p','vg-tag',`${car.make?.name||'VEHICLE'}  /  ${car.year_start||'YEAR UNKNOWN'}${car.year_end?'—'+car.year_end:''}`));
      }
      body.append(el('h3','vg-car-name',car.name||car.model||'Vehicle generation'));
      if(mode==='collection'){
        body.append(el('p','vg-model-years',`${car.year_start||'Year unknown'} – ${car.year_end||'present'}${car.match?.year==='nearest'?' · nearest year':''}`));
        const badges=el('div','vg-fuel-badges');
        (Array.isArray(car.fuels)?car.fuels:[]).slice(0,4).forEach(f=>badges.append(el('span',`vg-fuel vg-fuel-${String(f).toLowerCase()}`,f)));
        if(!badges.children.length)badges.append(el('span','vg-fuel','Fuel unlisted'));
        body.append(badges);
        const stats=el('div','vg-compact-stats');
        const hp=car.power_hp&&available(car.power_hp.min)?(car.power_hp.min===car.power_hp.max?`${car.power_hp.min} hp`:`${car.power_hp.min}–${car.power_hp.max} hp`):'Power unknown';
        stats.append(el('span','',`${car.variant_count||0} variants`),el('span','',hp));
        body.append(stats);
      }else{
        body.append(el('p','vg-subline',`${car.body?.label||'Body not listed'} · ${car.variant_count||0} trim${car.variant_count===1?'':'s'} available${car.match?.year==='nearest'?' · NEAREST YEAR MATCH':''}`));
      }
      const ranges=el('dl','vg-performance');
      const showRange=(v,unit)=>v&&available(v.min)&&available(v.max)?(v.min===v.max?number(v.min,unit):`${Number(v.min).toLocaleString()}–${Number(v.max).toLocaleString()} ${unit}`):'—';
      ranges.append(field('POWER',showRange(car.power_hp,'HP')),field('TORQUE',showRange(car.torque_nm,'NM')),field('0–100 KM/H',showRange(car.zero_to_100_s,'S')),field('TOP SPEED',showRange(car.top_speed_kmh,'KM/H')),field('WEIGHT',showRange(car.curb_weight_kg,'KG')),field('FUEL',Array.isArray(car.fuels)&&car.fuels.length?car.fuels.join(', '):'—'));if(mode!=='collection')body.append(ranges);
      const variants=Array.isArray(car.variants)?car.variants:[];
      const details=el('details','vg-details');details.append(el('summary','',`VEHICLE SPECIFICATIONS / ${variants.length} TRIMS`));
      const description=(queryDescription||`${car.make?.name||''} ${car.model||car.name||''} ${car.year_start||''}`).trim();
      const selectCar=(variant)=>{
        if(mode!=='compare')return;
        if(!variant||typeof window.velocitySpecsToCompare!=='function'){
          details.open=true;details.scrollIntoView({block:'nearest',behavior:'smooth'});
          return;
        }
        const selected=window.velocitySpecsToCompare(car,variant,description);
        document.dispatchEvent(new CustomEvent('velocity:add-car',{detail:selected}));
        status.textContent=`${selected.brand} ${selected.model} selected. Add another car to compare.`;
        if(document.getElementById('selectedCounter')?.textContent.startsWith('2') || document.getElementById('selectedCounter')?.textContent.startsWith('3')){
          document.getElementById('compareResult')?.scrollIntoView({behavior:'smooth',block:'start'});
        }
      };
      if(mode==='compare'){
        photo.append(el('span','vg-photo-cta','TAP PHOTO TO ADD ↗'));
        photo.addEventListener('click',()=>selectCar(variants[0]));
      }
      if(variants.length){
        const selector=el('select','vg-variant-select');selector.setAttribute('aria-label',`Choose a trim for ${car.name||car.model}`);
        variants.forEach((v,i)=>{const option=el('option','',v.name||`Trim ${i+1}`);option.value=String(i);selector.append(option)});
        const facts=el('dl','vg-variant-facts');
        const paint=()=>{const v=variants[Number(selector.value)]||variants[0];facts.replaceChildren(field('ENGINE',available(v.displacement_cc)?number(v.displacement_cc,'CC'):'Not available'),field('HORSEPOWER',number(v.power_hp,'HP')),field('TORQUE',number(v.torque_nm,'NM')),field('TRANSMISSION',v.transmission||'Not available'),field('DRIVETRAIN',v.drivetrain||'Not available'),field('TOP SPEED',number(v.top_speed_kmh,'KM/H')),field('0–100 KM/H',number(v.zero_to_100_s,'S')),field('FUEL',v.fuel_type||v.fuel||'Not available'));};
        selector.addEventListener('change',paint);paint();
        details.append(selector,facts);
        if(mode==='compare'){
          const button=el('button','vg-compare','ADD TRIM TO COMPARISON ↗');button.type='button';
          button.addEventListener('click',()=>selectCar(variants[Number(selector.value)]||variants[0]));
          details.append(button);
        }
      }else{details.append(el('p','vg-unavailable','Individual trim specifications are not currently available for this generation.'));}
      if(mode==='collection'){
        const specButton=el('button','vg-view-details','VIEW ALL SPECIFICATIONS ↗');
        specButton.type='button';specButton.setAttribute('aria-expanded','false');
        specButton.addEventListener('click',()=>{details.open=!details.open;specButton.setAttribute('aria-expanded',String(details.open));});
        details.addEventListener('toggle',()=>specButton.setAttribute('aria-expanded',String(details.open)));
        body.append(specButton);
      }
      body.append(details);article.append(photo,body);return article;
    }
    const makeParams=()=>{
      const params=new URLSearchParams();
      for(const [key,val] of new FormData(form).entries())if(String(val).trim())params.set(key,String(val).trim());
      const q=params.get('q');
      if(q){for(const key of ['make','modelFamily','modelYear','body','fuel','drive'])params.delete(key);}
      params.set('variants','1');params.set('per',mode==='collection'?'18':'9');return{endpoint:q?'/api/velocity/search':'/api/velocity/vehicles',params};
    };
    const load=async(next=1)=>{
      if(loading)return;
      if(next===1)query=makeParams();
      if(!query)return;
      loading=true;submit.disabled=true;more.hidden=true;
      const current=++requestNumber;
      if(next===1){status.textContent='Loading vehicle photographs and specifications…';skeletons();}
      else status.textContent='Loading more vehicles…';
      const params=new URLSearchParams(query.params);params.set('page',String(next));
      try{
        const response=await fetch(query.endpoint+'?'+params.toString(),{headers:{Accept:'application/json'}});
        const result=await response.json().catch(()=>({}));
        if(!response.ok||!result.success)throw new Error(result.error||'Vehicle search is temporarily unavailable.');
        if(current!==requestNumber)return;
        const info=result.data||{};const items=Array.isArray(info.results)?info.results:[];
        if(next===1)grid.replaceChildren();
        const description=query.params.get('q')||[query.params.get('make'),query.params.get('modelFamily'),query.params.get('modelYear')].filter(Boolean).join(' ');
        items.forEach(entry=>grid.append(card(entry,description)));
        if(!items.length&&next===1)grid.append(el('p','vg-empty','No matching vehicles found. Try a broader model or manufacturer.'));
        page=next;const total=Number(info.total)||0;const max=Number(info.pages)||1;
        status.textContent=total?(mode==='compare'?`${total.toLocaleString()} vehicle generations found · Tap a photo or select a trim to compare.`:`${total.toLocaleString()} vehicle generations found · Browse photographs and detailed trims.`):'No vehicles found for this search.';
        counter.textContent=`${total.toLocaleString()} VEHICLES`;pages.textContent=`PAGE ${page} / ${max}`;
        more.hidden=page>=max||items.length===0;
      }catch(err){if(next===1)grid.replaceChildren();grid.append(el('p','vg-empty',err.message||'Unable to load vehicle photos.'));status.textContent=err.message||'Vehicle service unavailable';pages.textContent='';counter.textContent='RETRY SEARCH';}
      finally{loading=false;submit.disabled=false;}
    };
    form.addEventListener('submit',e=>{e.preventDefault();load(1)});
    form.addEventListener('reset',()=>{setTimeout(()=>load(1),0)});
    host.querySelectorAll('[data-vg-quick]').forEach(button=>button.addEventListener('click',()=>{form.reset();form.elements.q.value=button.dataset.vgQuick;load(1)}));
    host.querySelectorAll('[data-vg-make]').forEach(button=>button.addEventListener('click',()=>{form.reset();form.elements.make.value=button.dataset.vgMake;load(1)}));
    root.querySelectorAll('[data-vg-spotlight]').forEach(button=>{
      button.addEventListener('click',()=>{
        form.reset();
        form.elements.q.value=button.dataset.vgSpotlight||'';
        load(1);
        status.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
      });
    });
    more.addEventListener('click',()=>load(page+1));
    // Honor existing Collection links (?q=...) without serving old photo cards.
    const incoming=new URLSearchParams(location.search);
    if(mode==='collection'){
      for(const name of ['q','make','modelFamily','modelYear','body','fuel','drive']){
        const value=incoming.get(name);
        if(value && form.elements.namedItem(name))form.elements.namedItem(name).value=value;
      }
      if(incoming.get('brand')&&!form.elements.make.value)form.elements.make.value=incoming.get('brand').slice(0,120);
    }
    // Only one initial API request; additional pages are explicitly loaded.
    load(1);
  });
})();
