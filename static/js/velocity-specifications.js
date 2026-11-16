/* Detailed research is fetched by VÉLOCITY's own Go endpoints. The API key never reaches the browser. */
(() => {
  'use strict';
  const elements = document.querySelectorAll('[data-velocity-specs]');
  if (!elements.length) return;
  const make = (tag, className, text) => { const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=String(text);return node; };
  const known = value => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
  const nice = (value,unit='') => known(value) ? `${value}${unit}` : 'Not available';
  const text = v => String(v == null ? '' : v);
  // CarVariables photographs are served via a fixed, restricted Go route.
  // This keeps the API key private and avoids direct cross-origin image loads.
  const photoURL = (raw) => {
    try {
      const u = new URL(String(raw));
      if (u.protocol !== 'https:' || !['carvariables.com','www.carvariables.com','cdn.carvariables.com'].includes(u.hostname)) return '/static/images/car-fallback.svg';
      const m = u.pathname.match(/^\/images\/(car_[a-f0-9]{32,80}\.(?:avif|webp|jpe?g|png))$/i);
      return m ? `/api/velocity/photo?file=${encodeURIComponent(m[1])}` : '/static/images/car-fallback.svg';
    } catch { return '/static/images/car-fallback.svg'; }
  };

  const attrs = entry => [
    ['Horsepower',nice(entry.power_hp,' hp')], ['Torque',nice(entry.torque_nm,' Nm')],
    ['0–100 km/h',nice(entry.zero_to_100_s,' s')], ['Top speed',nice(entry.top_speed_kmh,' km/h')],
    ['Engine',known(entry.displacement_cc)?`${entry.displacement_cc} cc`:'Not available'],
    ['Transmission',text(entry.transmission)||'Not available'], ['Drivetrain',text(entry.drivetrain)||'Not available'],
    ['Fuel',text(entry.fuel_type||entry.fuel)||'Not available'],
    ['Fuel consumption',nice(entry.fuel_economy_combined_l100,' L/100 km')],
    ['Dimensions',known(entry.length_mm)&&known(entry.width_mm)?`${entry.length_mm} × ${entry.width_mm} mm`:'Not available'],
  ];
  function toCompare(car,variant,query) {
    // The existing Compare Studio uses mph, inches and pounds internally.
    // Convert units accurately, but never mistake 0–100 km/h for 0–60 mph.
    const mmToIn=v=>known(v)?String((Number(v)/25.4).toFixed(1)):'';
    const label=variant?.name||car.generation||car.name||'';
    const requested=Number((query.match(/\b(?:19|20)\d{2}\b/)||[])[0]);
    const year=car.match?.year!=='nearest' && requested>=Number(car.year_start) && (!car.year_end||requested<=Number(car.year_end)) ? requested : (Number(car.year_start)||0);
    const trimID=variant?.id || 0;
    return {
      id:`cv:${car.code}:${trimID}`, brand:text(car.make?.name),model:text(car.model),year,
      trim:label, horsepower:variant?.power_hp ?? null,torque:variant?.torque_nm ?? null,
      engine:known(variant?.displacement_cc)?`${(Number(variant.displacement_cc)/1000).toFixed(1)}L${variant.cylinders?' / '+variant.cylinders+' cylinders':''}`:'',
      zero_to_100:known(variant?.zero_to_100_s)?String(variant.zero_to_100_s):'',
      top_speed:known(variant?.top_speed_kmh)?`${Math.round(Number(variant.top_speed_kmh)*0.621371)} mph`:'',
      transmission:text(variant?.transmission),drivetrain:text(variant?.drivetrain),
      fuel:text(variant?.fuel_type || variant?.fuel),body_class:text(car.body?.label),
      cylinders:text(variant?.cylinders),displacement:known(variant?.displacement_cc)?`${(Number(variant.displacement_cc)/1000).toFixed(2)}L`:'',
      length:mmToIn(variant?.length_mm),width:mmToIn(variant?.width_mm),height:mmToIn(variant?.height_mm),
      weight:known(variant?.curb_weight_kg)?String(Math.round(Number(variant.curb_weight_kg)*2.20462)):'',
      fuel_economy:known(variant?.fuel_economy_combined_l100)?`${variant.fuel_economy_combined_l100} L/100 km`:'',
      image:photoURL(car.image_url),
      source:'Catalogue specifications · specific engine/trim',verified:false,
      cv_query:query,cv_year_start:car.year_start,cv_year_end:car.year_end
    };
  }
  window.velocitySpecsToCompare = toCompare;
  function variantCard(car, variant, query, mode) {
    const d=make('details','velocity-specs-variant');
    const label=variant?.name || 'GENERATION OVERVIEW';
    const summary=make('summary','',label);d.append(summary);
    const dl=make('dl','velocity-specs-facts');
    for (const [name,val] of attrs(variant || {})) {const cell=make('div');cell.append(make('dt','',name),make('dd','',val));dl.append(cell);}
    d.append(dl);
    if (mode==='compare' && variant?.id && car.code) {
      const button=make('button','velocity-specs-small',mode==='compare'?'ADD THIS TRIM TO COMPARE ↗':'COMPARE THIS EXACT TRIM ↗');button.type='button';
      button.addEventListener('click',()=>{
        const data=toCompare(car,variant,query);
        if(mode==='compare') {document.dispatchEvent(new CustomEvent('velocity:add-car',{detail:data})); button.textContent='ADDED TO THE STUDIO ✓';setTimeout(()=>button.textContent='ADD THIS TRIM TO COMPARE ↗',2200);}
        else {try{sessionStorage.setItem('velocity-cv-pending',JSON.stringify(data))}catch{};const params=new URLSearchParams();params.set('ids',data.id);params.set('cvq',JSON.stringify({[data.id]:query}));location.href='/compare?'+params.toString();}
      });d.append(button);
    }
    return d;
  }
  function carCard(car, query, mode) {
    const article=make('article','velocity-specs-card');
    const picture=make('img','velocity-specs-photo');picture.loading='lazy';picture.alt='Vehicle photograph, where available';picture.src=photoURL(car.image_url);
    picture.addEventListener('error',()=>{if(!picture.dataset.triedDirect && photoURL(car.image_url)!=='/static/images/car-fallback.svg'){picture.dataset.triedDirect='1';picture.src=String(car.image_url);}else if(!picture.src.includes('car-fallback.svg'))picture.src='/static/images/car-fallback.svg'});article.append(picture);
    const body=make('div','velocity-specs-content');body.append(make('p','velocity-specs-meta',`${text(car.make?.name).toUpperCase()} / ${car.year_start||'YEAR UNKNOWN'}${car.year_end?'–'+car.year_end:''}`));
    body.append(make('h3','',car.name||car.model||'Vehicle generation'));
    body.append(make('p','velocity-specs-summary',`${car.body?.label || 'Body not listed'} · ${car.variant_count||0} recorded trim(s)${car.match?.year==='nearest'?' · Nearest year match':''}`));
    const variants=Array.isArray(car.variants)?car.variants:[];
    if(variants.length){variants.forEach((variant,i)=>{const v=variantCard(car,variant,query,mode);if(i===0)v.open=true;body.append(v)})}
    else body.append(make('p','velocity-specs-summary','No individual variants returned. Expand your search or try a different vehicle.'));
    article.append(body);return article;
  }
  function mount(root){
    const form=root.querySelector('[data-vs-form]');const status=root.querySelector('[data-vs-status]');const results=root.querySelector('[data-vs-results]');const more=root.querySelector('[data-vs-more]');const pages=root.querySelector('[data-vs-pages]');const submit=form.querySelector('[type=submit]');
    const mode=root.dataset.mode;let page=0;let requestParams=null;let busy=false;
    const load=async (nextPage=1)=>{
      if(busy)return;
      if(nextPage===1){const formValues=new FormData(form);const params=new URLSearchParams();for(const [key,value] of formValues){if(text(value).trim())params.set(key,text(value).trim());}
        const q=params.get('q');if(!q&&!params.get('make')&&!params.get('modelFamily')){status.textContent='Enter a vehicle search phrase or manufacturer/model.';return}
        const exact=!!q;
        if(exact){for(const key of ['make','modelFamily','modelYear','body','fuel','drive'])params.delete(key);}
        params.set('variants','1');params.set('per','6');requestParams={endpoint:exact?'/api/velocity/search':'/api/velocity/vehicles',params};
      }
      if(!requestParams)return;
      busy=true;submit.disabled=true;more.disabled=true;status.textContent='Retrieving available vehicle specifications…';
      const query=new URLSearchParams(requestParams.params);query.set('page',String(nextPage));
      try{
        const reply=await fetch(requestParams.endpoint+'?'+query,{headers:{Accept:'application/json'}});const json=await reply.json();
        if(!reply.ok||json.success!==true)throw Error(json.error||'Vehicle specifications are unavailable');
        if(nextPage===1)results.replaceChildren();
        const data=json.data||{};const items=Array.isArray(data.results)?data.results:[];
        const lookup=requestParams.params.get('q')||[requestParams.params.get('make'),requestParams.params.get('modelFamily'),requestParams.params.get('modelYear')].filter(Boolean).join(' ');
        items.forEach(car=>results.append(carCard(car,lookup,mode)));
        page=nextPage;const total=Number(data.total)||0;const count=Number(data.pages)||0;pages.textContent=`PAGE ${page} OF ${count||page} · ${total} MATCHING GENERATIONS`;
        status.textContent=total?`${total} vehicle generation(s) found. Select a specific engine or trim to view its available specifications.`:'No matching vehicle records. Try fewer filters.';
        more.hidden=!(count>page&&items.length);
      }catch(err){status.textContent=err.message||'Unable to load specifications. Try again later.';more.hidden=true;}
      finally{busy=false;submit.disabled=false;more.disabled=false;}
    };
    form.addEventListener('submit',event=>{event.preventDefault();load(1)});
    more.addEventListener('click',()=>load(page+1));
    if(mode==='compare'){
      const pending=(()=>{try{return JSON.parse(sessionStorage.getItem('velocity-cv-pending')||'null')}catch{return null}})();
      if(pending && (new URLSearchParams(location.search).get('ids')||'').split(',').map(id=>{try{return decodeURIComponent(id)}catch{return ''}}).includes(pending.id)){
        sessionStorage.removeItem('velocity-cv-pending');
        // Let the Compare Studio initialize its catalogue before adding.
        document.addEventListener('velocity:compare-ready',()=>document.dispatchEvent(new CustomEvent('velocity:add-car',{detail:pending})),{once:true});
      }
    }
  }
  elements.forEach(mount);
})();
