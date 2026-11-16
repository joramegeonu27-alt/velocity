/* VÉLOCITY Manufacturer directory. Names/countries are a curated navigation index;
   model records and photographs are retrieved from /api/velocity/vehicles on demand.
   CarVariables has no separate manufacturer-index endpoint in its supplied OpenAPI spec.
*/
(() => {
  'use strict';
  const root = document.querySelector('[data-manufacturers]');
  if (!root) return;
  const countryGroups = [
    ['Germany','DE','Mercedes-Benz|Mercedes-AMG|BMW|Porsche|Audi|Volkswagen|Opel|Alpina|Smart|Maybach|Wiesmann|RUF|Borgward'],
    ['United States','US','Ford|Chevrolet|Dodge|Jeep|Cadillac|GMC|Buick|Lincoln|Chrysler|Tesla|Rivian|Lucid|Pontiac|Hummer|Ram|Oldsmobile|Saturn|Mercury|Plymouth'],
    ['Japan','JP','Toyota|Honda|Nissan|Lexus|Mazda|Mitsubishi|Subaru|Suzuki|Infiniti|Daihatsu|Isuzu|Datsun|Acura|Mitsuoka'],
    ['United Kingdom','GB','Aston Martin|Jaguar|Land Rover|Bentley|Rolls-Royce|McLaren|Lotus|Morgan|Mini|MG|Rover|Morris|Vauxhall|Triumph|Austin|Caterham|TVR|Ariel|Bristol|MINI'],
    ['Italy','IT','Ferrari|Lamborghini|Fiat|Alfa Romeo|Maserati|Lancia|Abarth|De Tomaso|Pagani|Lancia|Autobianchi|Iveco'],
    ['France','FR','Peugeot|Renault|Citroën|DS|Alpine|Bugatti'],
    ['Sweden','SE','Volvo|Polestar|Saab|Koenigsegg'],
    ['South Korea','KR','Hyundai|Kia|Genesis|KGM|Daewoo'],
    ['China','CN','BYD|Geely|Great Wall|Haval|Chery|Changan|NIO|XPeng|Zeekr|Lynk & Co|Wuling|Hongqi|Denza|Yangwang|Li Auto|Xiaomi|Leapmotor|GAC|MG|BAIC|Jetour|Omoda|Maxus|DFSK'],
    ['Spain','ES','SEAT|Cupra'],
    ['Czech Republic','CZ','Škoda'],
    ['Romania','RO','Dacia'],
    ['India','IN','Tata|Mahindra|Maruti Suzuki'],
    ['Vietnam','VN','VinFast'],
    ['Netherlands','NL','Spyker|Donkervoort'],
    ['Croatia','HR','Rimac'],
    ['Australia','AU','Holden'],
    ['Malaysia','MY','Proton|Perodua']
  ];
  // Country grouping is editorial metadata, and model records are provided live.
  const seen = new Set();
  const brands = [];
  for (const [country,code,names] of countryGroups) for (const name of names.split('|')) {
    const key=name.toLocaleLowerCase('en');if(seen.has(key))continue;seen.add(key);
    brands.push({name,country,code});
  }
  const favorites = ['Mercedes-Benz','BMW','Porsche','Toyota','Lexus','Audi','Ferrari','Lamborghini','Ford','Volkswagen','Honda','Nissan','Hyundai','Peugeot','Chevrolet'];
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
  const flag=code=>/^[A-Z]{2}$/.test(code||'')?String.fromCodePoint(...[...code].map(ch=>127397+ch.charCodeAt(0))):'◈';
  const get=(sel)=>root.querySelector(sel);
  const search=get('[data-mm-search]'),country=get('[data-mm-country]'),sort=get('[data-mm-sort]');
  const grid=get('[data-mm-grid]'),count=get('[data-mm-count]');
  const directory=get('[data-mm-directory]'),results=get('[data-mm-results]');
  const modelGrid=get('[data-mm-model-grid]'),more=get('[data-mm-more]');
  const modelForm=get('[data-mm-model-form]'),status=get('[data-mm-result-status]');
  const allCountries=[...new Set(brands.map(b=>b.country))].sort();
  allCountries.forEach(name=>{
    const record=brands.find(b=>b.country===name);
    const option=node('option','',`${record?flag(record.code)+'  ':''}${name}`);
    option.value=name;
    country.append(option);
  });

  // Logos are presentation assets, independent of the CarVariables data API.
  // Simple Icons provides SVG marks for popular makers. A recognizable favicon
  // is tried for the others; otherwise the neutral car icon is used (no initials).
  const brandLogos = {
    'Mercedes-Benz':['mercedesbenz','mercedes-benz.com'],
    'Mercedes-AMG':['mercedesbenz','mercedes-amg.com'],
    'BMW':['bmw','bmw.com'], 'Porsche':['porsche','porsche.com'],
    'Audi':['audi','audi.com'], 'Volkswagen':['volkswagen','volkswagen.com'],
    'Opel':['opel','opel.com'], 'Alpina':[null,'alpina-automobiles.com'],
    'Smart':['smart','smart.com'], 'Maybach':[null,'mercedes-benz.com'],
    'Ford':['ford','ford.com'], 'Chevrolet':['chevrolet','chevrolet.com'],
    'Dodge':['dodge','dodge.com'], 'Jeep':['jeep','jeep.com'],
    'Cadillac':['cadillac','cadillac.com'], 'GMC':['gmc','gmc.com'],
    'Buick':['buick','buick.com'], 'Lincoln':['lincoln','lincoln.com'],
    'Chrysler':['chrysler','chrysler.com'], 'Tesla':['tesla','tesla.com'],
    'Rivian':['rivian','rivian.com'], 'Lucid':['lucid','lucidmotors.com'],
    'Toyota':['toyota','toyota.com'], 'Honda':['honda','honda.com'],
    'Nissan':['nissan','nissan-global.com'], 'Lexus':['lexus','lexus.com'],
    'Mazda':['mazda','mazda.com'], 'Mitsubishi':['mitsubishi','mitsubishi-motors.com'],
    'Subaru':['subaru','subaru.com'], 'Suzuki':['suzuki','globalsuzuki.com'],
    'Infiniti':['infiniti','infiniti.com'], 'Daihatsu':[null,'daihatsu.com'],
    'Acura':['acura','acura.com'], 'Isuzu':['isuzu','isuzu.co.jp'],
    'Aston Martin':['astonmartin','astonmartin.com'], 'Jaguar':['jaguar','jaguar.com'],
    'Land Rover':['landrover','landrover.com'], 'Bentley':['bentley','bentleymotors.com'],
    'Rolls-Royce':['rollsroyce','rolls-roycemotorcars.com'],
    'McLaren':['mclaren','cars.mclaren.com'], 'Lotus':['lotus','lotuscars.com'],
    'Morgan':[null,'morgan-motor.com'], 'Mini':['mini','mini.com'],
    'MINI':['mini','mini.com'], 'MG':['mg','mgmotor.com'],
    'Vauxhall':['vauxhall','vauxhall.co.uk'],
    'Ferrari':['ferrari','ferrari.com'], 'Lamborghini':['lamborghini','lamborghini.com'],
    'Fiat':['fiat','fiat.com'], 'Alfa Romeo':['alfaromeo','alfaromeo.com'],
    'Maserati':['maserati','maserati.com'], 'Lancia':['lancia','lancia.com'],
    'Abarth':['abarth','abarth.com'], 'Pagani':['pagani','pagani.com'],
    'Peugeot':['peugeot','peugeot.com'], 'Renault':['renault','renault.com'],
    'Citroën':['citroen','citroen.com'], 'DS':['dsautomobiles','dsautomobiles.com'],
    'Alpine':['alpine','alpinecars.com'], 'Bugatti':['bugatti','bugatti.com'],
    'Volvo':['volvo','volvocars.com'], 'Polestar':['polestar','polestar.com'],
    'Saab':['saab','saab.com'], 'Koenigsegg':['koenigsegg','koenigsegg.com'],
    'Hyundai':['hyundai','hyundai.com'], 'Kia':['kia','kia.com'],
    'Genesis':['genesis','genesis.com'], 'BYD':['byd','byd.com'],
    'Geely':['geely','global.geely.com'], 'Chery':['chery','cheryinternational.com'],
    'NIO':['nio','nio.com'], 'XPeng':['xpeng','xpeng.com'],
    'Zeekr':['zeekr','zeekrlife.com'], 'Denza':[null,'denza.com'],
    'Xiaomi':['xiaomi','xiaomi.com'], 'SEAT':['seat','seat.com'],
    'Cupra':['cupra','cupraofficial.com'], 'Škoda':['skoda','skoda-auto.com'],
    'Dacia':['dacia','dacia.com'], 'Tata':['tata','tatamotors.com'],
    'Mahindra':['mahindra','mahindra.com'], 'VinFast':['vinfast','vinfastauto.com'],
    'Rimac':['rimacautomobili','rimac-automobili.com'],
    'Holden':[null,'holden.com.au'], 'Proton':[null,'proton.com'],
  };
  const fallbackCarSVG = '/static/images/brand-mark-fallback.svg';
  function logoNode(brand, additionalClass='') {
    const badge=node('span', 'mm-monogram mm-logo-badge '+additionalClass);
    const logo=node('img','mm-logo');
    logo.alt=''; logo.decoding='async'; logo.loading='lazy';
    const details=brandLogos[brand.name] || [];
    const key=details[0];
    const domain=details[1];
    const urls=[];
    if(key) urls.push(`https://cdn.simpleicons.org/${encodeURIComponent(key)}/303030`);
    if(domain) urls.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
    urls.push(fallbackCarSVG);
    let index=0;
    logo.addEventListener('error',()=>{index++;if(index<urls.length)logo.src=urls[index]});
    logo.src=urls[0];
    badge.append(logo);
    badge.setAttribute('aria-label', `${brand.name} emblem`);
    return badge;
  }
  let view='grid',selected=null,page=0,loading=false,token=0;
  try{view=localStorage.getItem('velocity:manufacturer-view:v1')==='list'?'list':'grid'}catch(_){}
  function changeView(next){view=next==='list'?'list':'grid';grid.classList.toggle('mm-grid-list',view==='list');get('[data-mm-controls]').querySelectorAll('[data-mm-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mmView===view)));try{localStorage.setItem('velocity:manufacturer-view:v1',view)}catch(_){}}
  get('[data-mm-controls]').querySelectorAll('[data-mm-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.mmView)));
  changeView(view);
  function paintBrands(){
    const q=search.value.trim().toLocaleLowerCase('en'), c=country.value;
    const list=brands.filter(b=>(!q||b.name.toLocaleLowerCase('en').includes(q))&&(!c||b.country===c));
    if(sort.value==='az')list.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sort.value==='za')list.sort((a,b)=>b.name.localeCompare(a.name));
    else list.sort((a,b)=>{
      const aIdx=favorites.indexOf(a.name),bIdx=favorites.indexOf(b.name);
      return (aIdx<0?999:aIdx)-(bIdx<0?999:bIdx) || a.name.localeCompare(b.name);
    });
    count.textContent=`${list.length} / ${brands.length} MANUFACTURERS`;
    grid.replaceChildren();
    list.forEach(brand=>{
      const button=node('button','mm-brand');button.type='button';button.setAttribute('aria-label',`Browse ${brand.name} models and generations`);
      const badge=logoNode(brand);
      const info=node('span','mm-brand-details');info.append(node('strong','',brand.name),node('small','',`${flag(brand.code)} ${brand.country}`));
      button.append(badge,info,node('span','mm-arrow','↗'));
      button.addEventListener('click',()=>openBrand(brand));grid.append(button);
    });
    if(!list.length)grid.append(node('p','mm-empty','No matching manufacturers. Try another name or country.'));
  }
  [search,country,sort].forEach(n=>n.addEventListener(n===search?'input':'change',paintBrands));
  paintBrands();
  function photoFor(car){
    const url=String(car.image_url||'');
    const wrap=node('div','mm-model-photo');
    try {
      const src=url.startsWith('/images/')?new URL(url,'https://carvariables.com'):new URL(url);
      const m=/^\/images\/(car_[a-f0-9]{32,80}\.(?:avif|webp|jpe?g|png))$/i.exec(src.pathname);
      if(src.protocol!=='https:' || !['cdn.carvariables.com','carvariables.com','www.carvariables.com'].includes(src.hostname.toLowerCase()) || !m)throw new Error('no image');
      const choices=['/api/velocity/photo?file='+encodeURIComponent(m[1]),src.origin+src.pathname];
      const img=node('img');img.alt=`${car.make?.name||''} ${car.name||car.model||'Vehicle'}`;img.loading='lazy';img.decoding='async';
      let i=0;img.onerror=()=>{i++;if(i<choices.length)img.src=choices[i];else wrap.replaceChildren(node('span','mm-missing','IMAGE UNAVAILABLE'))};
      img.src=choices[0];wrap.append(img);
    }catch(_){wrap.append(node('span','mm-missing','IMAGE UNAVAILABLE'))}
    return wrap;
  }
  const fmt=range=>range&&range.min!=null&&range.max!=null?(range.min===range.max?`${Number(range.min).toLocaleString()} hp`:`${Number(range.min).toLocaleString()}–${Number(range.max).toLocaleString()} hp`):'Power unlisted';
  function modelCard(car){
    const link=node('a','mm-model');
    const params=new URLSearchParams({make:selected.name,modelFamily:car.model||car.name||''});
    link.href='/cars?'+params.toString()+'#live-collection';
    link.setAttribute('aria-label',`Explore ${selected.name} ${car.name||car.model||''} in Collection`);
    link.append(photoFor(car));
    const body=node('div','mm-model-body');
    body.append(node('span','mm-model-kicker',selected.name.toUpperCase()+' / GENERATION'),node('h3','',car.name||car.model||'Vehicle'));
    body.append(node('p','',`${car.year_start||'Year unknown'} – ${car.year_end||'present'}`));
    const row=node('div','mm-model-meta');row.append(node('span','',`${car.variant_count??0} variants`),node('span','',fmt(car.power_hp)));
    body.append(row);link.append(body);return link;
  }
  function openBrand(brand){
    selected=brand;directory.hidden=true;results.hidden=false;
    get('[data-mm-brand-heading]').textContent=brand.name.toUpperCase();
    get('[data-mm-country-label]').textContent=`${flag(brand.code)} ${brand.country.toUpperCase()} / AUTOMOTIVE MAKER`;
    get('[data-mm-emblem]').replaceChildren(logoNode(brand,'mm-selected-logo'));
    modelForm.reset();loadModels(1);
    results.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    const u=new URL(location.href);u.searchParams.set('make',brand.name);history.replaceState(null,'',u);
  }
  async function loadModels(next=1){
    if(!selected||loading)return;
    loading=true;more.hidden=true;const current=++token;
    if(next===1){modelGrid.replaceChildren();modelGrid.append(node('p','mm-loading','Loading model generations…'))}
    const fields=new URLSearchParams({make:selected.name,sort:modelForm.elements.sort.value||'newest',per:'12',page:String(next),variants:'0'});
    // The published API accepts variants=1, or omit it (not "0"). Listing without variants saves payload size.
    fields.delete('variants');
    const model=modelForm.elements.modelFamily.value.trim();if(model)fields.set('modelFamily',model);
    try{
      const response=await fetch('/api/velocity/vehicles?'+fields.toString(),{headers:{Accept:'application/json'}});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!payload.success)throw new Error(payload.error||'Manufacturer models are temporarily unavailable.');
      if(current!==token)return;
      const data=payload.data||{},cars=Array.isArray(data.results)?data.results:[];
      if(next===1)modelGrid.replaceChildren();
      cars.forEach(car=>modelGrid.append(modelCard(car)));
      if(!cars.length&&next===1)modelGrid.append(node('p','mm-empty','No generations found for this manufacturer and model filter.'));
      page=next;
      const total=Number(data.total)||0;
      status.textContent=`${total.toLocaleString()} available generations · PAGE ${page} OF ${Number(data.pages)||1}`;
      more.hidden=!cars.length||page>=Number(data.pages||1);
    }catch(error){if(next===1)modelGrid.replaceChildren();modelGrid.append(node('p','mm-empty',error.message||'Unable to load model generations.'));status.textContent=error.message||'Service unavailable'}
    finally{loading=false}
  }
  get('[data-mm-back]').addEventListener('click',()=>{selected=null;directory.hidden=false;results.hidden=true;const u=new URL(location.href);u.searchParams.delete('make');history.replaceState(null,'',u);get('[data-mm-directory]').scrollIntoView({block:'start',behavior:'smooth'});});
  modelForm.addEventListener('submit',e=>{e.preventDefault();loadModels(1)});
  more.addEventListener('click',()=>loadModels(page+1));
  const initial=new URLSearchParams(location.search).get('make');
  if(initial){const match=brands.find(b=>b.name.toLocaleLowerCase('en')===initial.toLocaleLowerCase('en'));if(match)openBrand(match)}
})();
