/* VÉLOCITY Compare Studio: the numbers are sourced, never simulated. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!$('pickerGrid')) return;
  let catalogue = [];
  let selection = [];
  let lastSpecs = new Map();
  let lastSafety = new Map();
  let activeRequest = 0;
  const collapsedGroups = new Set();
  let toastTimer;
  const MAX = 3;
  const STORE = 'velocity-compare-studio-v1';
  const STORE_RECENT = 'velocity-compare-studio-recent-v1';
  const fallback = '/static/images/car-fallback.svg';
  const word = value => String(value == null ? '' : value).trim();
  const valid = value => { const s=word(value);return s && !['n/a','not listed','not available','unknown','0','null','undefined'].includes(s.toLowerCase()); };
  const asNumber = value => { const n=parseFloat(word(value).replace(/,/g,''));return Number.isFinite(n)&&n>0?n:null; };
  const stripID = value => String(value||'').replace(/[^a-zA-Z0-9_:\-.]/g,'').slice(0,100);
  const escapeText = (value) => {const el=document.createElement('span');el.textContent=word(value);return el.innerHTML;};
  const escapeAttr = value => escapeText(value).replaceAll('\"','&quot;').replaceAll("'",'&#39;');
  const img = value => /^https?:\/\//i.test(value||'')||String(value||'').startsWith('/static/')?value:fallback;
  const getCar = id => catalogue.find(car => car.id===id);
  const getNames = ids => ids.map(id=>getCar(id)).filter(Boolean).map(c=>`${c.brand} ${c.model}`);
  const showToast = message => { const el=$('compareToast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3600); };
  const fromServer = car => ({
    id:word(car.id), brand:word(car.brand||car.make), model:word(car.model), year:Number(car.year)||0, trim:word(car.trim),
    horsepower:asNumber(car.horsepower), torque:asNumber(car.torque), engine:word(car.engine), zero_to_sixty:word(car.zero_to_sixty),
    top_speed:word(car.top_speed), transmission:word(car.transmission),drivetrain:word(car.drivetrain),fuel:word(car.fuel),
    body_class:word(car.body_class),doors:word(car.doors),seats:word(car.seats),cylinders:word(car.cylinders),
    displacement:word(car.displacement),manufacturer:word(car.manufacturer),image:img(car.image),
    length:word(car.length),width:word(car.width),height:word(car.height),weight:word(car.weight),
    fuel_economy:word(car.fuel_economy),interior:word(car.interior),technology:word(car.technology),price:Number(car.price)||0,
    source:car.source||'Curated vehicle', verified:!!car.verified
  });
  const init = async () => {
    try {
      const reply = await fetch('/api/compare/catalogue',{headers:{Accept:'application/json'}});
      if(!reply.ok) throw new Error('not available');
      const data = await reply.json();
      catalogue = (Array.isArray(data)?data:[]).filter(c=>c.id&&c.brand&&c.model).map(fromServer);
      renderFilters(); renderCards(); fromLink(); renderHistory(); loadMakes();
    } catch {
      $('pickerGrid').replaceChildren();const p=document.createElement('p');p.className='vc-empty';p.textContent='The collection is unavailable. Refresh the page or try again shortly.';$('pickerGrid').append(p);
      $('pickerStatus').textContent='Unable to load the vehicle collection.';
    }
  };
  const renderFilters=()=>{
    const brands=[...new Set(catalogue.map(c=>c.brand))].sort();
    const years=[...new Set(catalogue.map(c=>c.year).filter(Boolean))].sort((a,b)=>b-a);
    brands.forEach(b=>{let el=new Option(b,b);$('brandFilter').add(el);});years.forEach(y=>$('yearFilter').add(new Option(y,y)));
    catalogue.forEach(c=>{let o=document.createElement('option');o.value=`${c.brand} ${c.model} ${c.year}`;$('vehicleSuggestions').append(o);});
  };
  const renderCards=()=>{
    const term=$('vehicleSearch').value.toLowerCase().trim();const brand=$('brandFilter').value;const year=$('yearFilter').value;const trim=$('trimFilter').value.toLowerCase().trim();
    const filtered=catalogue.filter(c=>(!brand||c.brand===brand)&&(!year||String(c.year)===year)&&(!trim||(`${c.trim} ${c.model}`).toLowerCase().includes(trim))&&(!term||(`${c.brand} ${c.model} ${c.year} ${c.trim}`).toLowerCase().includes(term)));
    const holder=$('pickerGrid');holder.replaceChildren();$('pickerCount').textContent=`${filtered.length} AVAILABLE MACHINES`;
    if(!filtered.length){const p=document.createElement('p');p.className='vc-empty';p.textContent='No vehicles match those filters. Try clearing a field.';holder.append(p);return;}
    filtered.forEach(c=>{
      const btn=document.createElement('button');btn.type='button';btn.className='vc-picker-card';btn.dataset.id=c.id;btn.setAttribute('aria-pressed',String(selection.includes(c.id)));
      btn.innerHTML=`<div class="vc-picker-image"><img loading="lazy" alt="" src="${escapeAttr(c.image)}"><span class="vc-picker-badge">${selection.includes(c.id)?'✓':'+'}</span></div><div class="vc-picker-copy"><small>${escapeText(c.brand)} / ${c.year||'YEAR UNKNOWN'}</small><strong>${escapeText(c.model)}</strong><div class="vc-picker-foot"><span>${c.horsepower?`${c.horsepower} HP`:'POWER —'}</span><span>${escapeText(c.drivetrain||'DRIVE —')}</span></div></div>`;
      btn.querySelector('img').addEventListener('error',event=>{if(event.target.src.endsWith(fallback)) return;event.target.src=fallback;});
      btn.addEventListener('click',()=>toggle(c.id));holder.append(btn);
    });
  };
  const syncURL=()=>{const url=new URL(location.href);if(selection.length)url.searchParams.set('ids',selection.map(id=>encodeURIComponent(id)).join(','));else url.searchParams.delete('ids');history.replaceState(null,'',url.toString());};
  const sync=()=>{const selected=selection.length;$('selectedCounter').textContent=`${selected} / ${MAX} SELECTED`;$('compareNow').disabled=selected<2;$('clearSelection').disabled=!selected;
    $('pickerStatus').textContent=selected<2?'Select two or three vehicles to unlock the studio.':selected===MAX?'Your three contenders are ready.':'Two contenders selected. Add a third or enter the studio.';
    renderCards();syncURL();activeRequest++;
  };
  const toggle=id=>{
    if(selection.includes(id)) selection=selection.filter(x=>x!==id);
    else if(selection.length>=MAX){showToast('Maximum three vehicles. Remove one to add another.');return;}
    else selection.push(id);
    sync();if(!$('compareResult').hidden&&selection.length>=2)runComparison(false);else if(selection.length<2)$('compareResult').hidden=true;
  };
  const fromLink=async()=>{const ids=(new URLSearchParams(location.search).get('ids')||'').split(',').map(x=>{try{return decodeURIComponent(x)}catch{return ''}}).filter(Boolean).slice(0,3);
    const missing=[...new Set(ids)].filter(id=>!getCar(id));
    await Promise.all(missing.map(async id=>{
      if(id.startsWith('model:')){try{const fields=decodeURIComponent(id.slice(6)).split(':');const yr=Number(fields.pop());const model=fields.pop(),brand=fields.join(':');if(brand&&model&&yr>1995&&!getCar(id))catalogue.push(fromServer({id,brand,model,year:yr,source:'Model research · limited data'}));}catch{ /* skip */ }}
      if(id.startsWith('vin:')&&/^[A-HJ-NPR-Z0-9]{17}$/.test(id.slice(4))){try{const r=await fetch('/api/discovery/vin?vin='+encodeURIComponent(id.slice(4)));if(!r.ok)return;const d=await r.json();if(d.make&&d.model)catalogue.push(fromServer({id,brand:d.make,model:d.model,year:d.year,trim:d.trim,horsepower:d.horsepower,engine:d.engine,drivetrain:d.drivetrain,transmission:d.transmission,fuel:d.fuel,body_class:d.body,doors:d.doors,cylinders:d.cylinders,manufacturer:d.manufacturer,source:'VIN decoded · configuration data',verified:true}));}catch{ /* skip */ }}
    }));
    selection=[...new Set(ids)].filter(id=>getCar(id)).slice(0,3);sync();if(selection.length>=2)runComparison(false);
  };
  const addToGarage=car=>{if(!car.id||!car.brand||!car.model)return;const old=getCar(car.id);if(!old)catalogue.push(car);if(!selection.includes(car.id)){if(selection.length>=3){selection.shift();showToast('Oldest slot replaced with the researched vehicle.');}selection.push(car.id)}sync();if(selection.length>=2)runComparison(true);};
  const loadMakes=async()=>{try{const r=await fetch('/api/nhtsa/makes');if(!r.ok)return;const j=await r.json();const makes=j.Results||j.results||[];const target=$('researchMakes');makes.slice(0,6000).forEach(m=>{const name=m.Make_Name||m.make_name||m.MakeName||m.name;if(name){const x=document.createElement('option');x.value=name;target.append(x)}})}catch{ /* manual make entry works */ }};
  const researchModels=async()=>{
    const make=$('researchMake').value.trim(),year=$('researchYear').value.trim();
    if(!make){$('externalStatus').textContent='Enter a manufacturer to find models.';return;}
    if(year&&(!/^\d{4}$/.test(year)||Number(year)<1996||Number(year)>new Date().getFullYear()+2)){$('externalStatus').textContent='Choose a valid model year (1996 or later).';return;}
    $('externalStatus').textContent='Finding matching model records…';$('researchModelsList').replaceChildren();
    try{const q=new URLSearchParams({make});if(year)q.set('year',year);const r=await fetch('/api/nhtsa/models?'+q.toString());if(!r.ok)throw Error('Model search unavailable');
      const j=await r.json();const models=j.Results||j.results||[];const found=new Set();models.forEach(m=>{const name=m.Model_Name||m.model_name;if(name&&!found.has(name)){found.add(name);$('researchModelsList').append(new Option(name,name));}});
      $('externalStatus').textContent=`${found.size} model names found. Choose a model and add it for name/year research (performance specifications may be unavailable).`;
    }catch{$('externalStatus').textContent='Unable to retrieve model names right now. You can still add a known model for comparison research.';}
  };
  const addResearch=()=>{
    const brand=$('researchMake').value.trim(),model=$('researchModel').value.trim(),year=Number($('researchYear').value);
    if(!brand||!model||brand.length>70||model.length>70||!/^[\w\p{L}\p{N} &'().-]+$/u.test(brand+model)||!Number.isInteger(year)||year<1996||year>new Date().getFullYear()+2){$('externalStatus').textContent='Enter a valid manufacturer, model and year.';return;}
    const id='model:'+encodeURIComponent(`${brand}:${model}:${year}`);addToGarage(fromServer({id,brand,model,year,source:'Model research · limited data'}));$('externalStatus').textContent='Model research added. More detailed specifications require a specific VIN or configuration.';
  };
  const addVIN=async()=>{
    const vin=$('compareVIN').value.toUpperCase().trim();if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)){$('externalStatus').textContent='Enter a valid 17-character VIN (not using I, O or Q).';return;}
    $('externalStatus').textContent='Decoding vehicle details…';try{const r=await fetch('/api/discovery/vin?vin='+encodeURIComponent(vin));const d=await r.json();if(!r.ok)throw Error(d.error||'VIN details unavailable');
      addToGarage(fromServer({id:'vin:'+vin,brand:d.make,model:d.model,year:d.year,trim:d.trim,horsepower:d.horsepower,engine:d.engine,drivetrain:d.drivetrain,transmission:d.transmission,fuel:d.fuel,body_class:d.body,doors:d.doors,cylinders:d.cylinders,manufacturer:d.manufacturer,source:'VIN decoded · configuration data',verified:true}));$('externalStatus').textContent='VIN research added. Fields shown are those available from the decoded record.';
    }catch(e){$('externalStatus').textContent=e.message||'VIN lookup is temporarily unavailable.';}
  };
  const allGroups = [
    ['IDENTITY & CONFIGURATION',[['Manufacturer','brand'],['Model','model'],['Model year','year'],['Trim / version','trim'],['Body style','body_class'],['Manufacturer record','manufacturer']]],
    ['PERFORMANCE',[['Engine','engine'],['Horsepower','horsepower'],['Torque','torque'],['0–60 mph','zero_to_sixty'],['Top speed','top_speed'],['Cylinders','cylinders'],['Engine displacement','displacement']]],
    ['POWERTRAIN',[['Transmission','transmission'],['Drivetrain','drivetrain'],['Fuel type','fuel'],['Fuel efficiency','fuel_economy']]],
    ['DIMENSIONS & PRACTICALITY',[['Length','length'],['Width','width'],['Height','height'],['Weight','weight'],['Seating capacity','seats'],['Doors','doors']]],
    ['SAFETY & TECHNOLOGY',[['Safety testing','safety'],['Reported recalls (model/year)','recalls'],['Interior / comfort','interior'],['Technology','technology']]]
  ];
  const valueFor=(car,key,spec,safety,unit)=>{
    const raw=spec||{};
    const extra={horsepower:raw.engine_hp||raw.horsepower,engine:raw.displacement_l?`${raw.displacement_l}L ${raw.engine_config||''}`.trim():car.engine,displacement:raw.displacement_l,body_class:raw.body_class,drivetrain:raw.drive_type,transmission:raw.transmission_style,fuel:raw.fuel_primary,cylinders:raw.cylinders,seats:raw.seats,doors:raw.doors,manufacturer:raw.manufacturer,trim:raw.trim};
    if(key==='safety')return safety?.ratings||'';if(key==='recalls')return safety?.recalls||'';
    const val=valid(extra[key])?extra[key]:car[key];if(!valid(val))return '';
    if(key==='horsepower')return `${val} hp`;
    if(key==='top_speed'&&unit==='metric'){const v=asNumber(val);return v?`${Math.round(v*1.60934)} km/h`:val;}
    if(key==='zero_to_sixty'&&unit==='metric')return `${val} (0–60 mph)`; // Not a 0–100 km/h measurement.
    if(['length','width','height'].includes(key)&&unit==='metric'){const n=asNumber(val);return n?`${(n*2.54).toFixed(1)} cm`:val;}
    if(key==='weight'&&unit==='metric'){const n=asNumber(val);return n?`${Math.round(n*0.453592)} kg`:val;}
    return String(val);
  };
  const scoreFields={horsepower:'high',top_speed:'high',zero_to_sixty:'low',year:'high'};
  const comparable=(car,key,spec)=>{
    const raw=valueFor(car,key,spec,null,'imperial');return raw?asNumber(raw):null;
  };
  const drawTable=(ids)=>{
    const head=$('compareHead'),body=$('compareBody'),unit=$('unitToggle').value;head.replaceChildren();body.replaceChildren();
    const htr=document.createElement('tr');const label=document.createElement('th');label.textContent='SPECIFICATION';htr.append(label);
    ids.forEach(id=>{const car=getCar(id),th=document.createElement('th');th.scope='col';th.append(document.createTextNode(`${car.brand} ${car.model}`));htr.append(th);});head.append(htr);
    let groupsShown=0;
    allGroups.forEach(([group,items])=>{
      let visible=0;const rows=[];
      items.forEach(([name,key])=>{
        const vals=ids.map(id=>valueFor(getCar(id),key,lastSpecs.get(id),lastSafety.get(id),unit));const diff=new Set(vals.map(v=>v||'—')).size>1;
        if($('differenceOnly').checked&&!diff)return;
        const tr=document.createElement('tr');tr.dataset.group=group;if(collapsedGroups.has(group))tr.hidden=true;if(diff)tr.classList.add('vc-different');let th=document.createElement('th');th.scope='row';th.textContent=name;tr.append(th);
        const nums=ids.map((id,i)=>vals[i]&&scoreFields[key]?asNumber(vals[i]):null);
        const all=nums.filter(n=>n!=null);const winner=all.length>=2?(scoreFields[key]==='low'?Math.min(...all):Math.max(...all)):null;
        vals.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v||'—';if(!v)td.classList.add('vc-unavailable');if(diff&&$('highlightBest').checked&&nums[i]!=null&&winner!=null&&nums[i]===winner&&all.some(x=>x!==winner))td.classList.add('vc-advantage');tr.append(td);});rows.push(tr);visible++;
      });
      if(!visible)return;groupsShown++;const tr=document.createElement('tr');tr.className='vc-group';const td=document.createElement('th');td.colSpan=ids.length+1;const btn=document.createElement('button');btn.type='button';btn.className='vc-group-toggle';btn.setAttribute('aria-expanded', String(!collapsedGroups.has(group)));const title=document.createElement('span');title.textContent=group;const arrow=document.createElement('span');arrow.textContent=collapsedGroups.has(group)?'+':'−';btn.append(title,arrow);btn.addEventListener('click',()=>{if(collapsedGroups.has(group))collapsedGroups.delete(group);else collapsedGroups.add(group);drawTable(ids)});td.append(btn);tr.append(td);body.append(tr,...rows);
    });
    if(!groupsShown){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=ids.length+1;td.textContent='No differences are recorded for these vehicles. Switch off “Show Differences Only” to see all fields.';tr.append(td);body.append(tr);}
  };
  const drawBattle=ids=>{
    const stage=$('battleStage');stage.replaceChildren();ids.forEach(id=>{const c=getCar(id);const el=document.createElement('article');el.className='vc-battle-car';
      el.innerHTML=`<div class="vc-battle-photo"><img src="${escapeAttr(c.image)}" alt="${escapeText(c.brand+' '+c.model)}"></div><div class="vc-battle-info"><small>${escapeText(c.brand)} / ${c.year||'YEAR UNKNOWN'}</small><h3>${escapeText(c.model)}</h3><p>${escapeText(c.source)}</p><div class="vc-battle-action"><button type="button" class="vc-mini" data-remove="${escapeAttr(id)}">REMOVE ×</button><button type="button" class="vc-mini" data-replace="${escapeAttr(id)}">REPLACE ↗</button></div></div>`;
      el.querySelector('img').addEventListener('error',e=>{if(!e.target.src.endsWith(fallback))e.target.src=fallback});stage.append(el);
    });
  };
  const metrics=[['HORSEPOWER','horsepower',true,'hp'],['TOP SPEED','top_speed',true,'mph'],['0–60 MPH','zero_to_sixty',false,'sec']];
  const drawBars=ids=>{
    const host=$('performanceBars');host.replaceChildren();let recorded=0;
    metrics.forEach(([label,key,high,unit])=>{
      const cars=ids.map(id=>getCar(id));const values=cars.map(c=>comparable(c,key,lastSpecs.get(c.id)));
      const numbers=values.filter(n=>n!=null);if(numbers.length<2)return;recorded++;
      const wrap=document.createElement('div');wrap.className='vc-bar-row';const title=document.createElement('small');title.textContent=label;wrap.append(title);
      cars.forEach((c,index)=>{const n=values[index];const row=document.createElement('div');row.className='vc-bar-label';row.append(document.createTextNode(`${c.brand} ${c.model}`));const strong=document.createElement('strong');strong.textContent=n==null?'—':`${n} ${unit}`;row.append(strong);wrap.append(row);
      const track=document.createElement('div');track.className='vc-bar-track';const fill=document.createElement('span');fill.className='vc-bar-fill';const max=Math.max(...numbers);const min=Math.min(...numbers);
      const amount=n==null?0:(high?(n/max)*100:(min/n)*100);fill.style.width=`${amount.toFixed(1)}%`;track.append(fill);wrap.append(track);});host.append(wrap);
    });
    if(!recorded){const p=document.createElement('p');p.className='vc-disclaimer';p.textContent='Not enough comparable performance measurements to draw accurate charts for this lineup.';host.append(p);}
  };
  const drawRadar=ids=>{
    const panel=$('radarPanel');panel.replaceChildren();
    const cars=ids.map(id=>getCar(id));const matrix=cars.map(c=>metrics.map(([,key])=>comparable(c,key,lastSpecs.get(c.id))));
    const comparableCars=matrix.map((row,index)=>({row,index})).filter(x=>x.row.every(v=>v!=null));
    if(comparableCars.length<2){const p=document.createElement('p');p.className='vc-disclaimer';p.textContent='A radar chart needs horsepower, top speed and 0–60 mph for at least two cars. Unknown measurements are never estimated.';panel.append(p);return;}
    const sizes=[0,1,2].map(i=>Math.max(...comparableCars.map(x=>x.row[i])));
    const lows=[0,1,2].map(i=>Math.min(...comparableCars.map(x=>x.row[i])));
    const colors=['#e9a46e','#b6b2aa','#f1d2aa'];const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 340 310');svg.setAttribute('role','img');svg.setAttribute('aria-label','Relative three-axis performance chart based on available data');
    const point=(i,percent)=>{const a=(-90+i*120)*Math.PI/180;return `${170+120*percent*Math.cos(a)},${149+120*percent*Math.sin(a)}`};
    [0.25,0.5,0.75,1].forEach(r=>{const p=document.createElementNS(ns,'polygon');p.setAttribute('points',[0,1,2].map(i=>point(i,r)).join(' '));p.setAttribute('fill','none');p.setAttribute('stroke','#a77e644b');svg.append(p)});
    metrics.forEach(([name],i)=>{const [x,y]=point(i,1.24).split(',');const t=document.createElementNS(ns,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('text-anchor','middle');t.textContent=name;svg.append(t)});
    comparableCars.forEach(({row,index})=>{const data=row.map((v,i)=>i===2?lows[i]/v:v/sizes[i]);const p=document.createElementNS(ns,'polygon');p.setAttribute('points',data.map((r,i)=>point(i,Math.max(.08,r))).join(' '));p.setAttribute('fill',colors[index]+'33');p.setAttribute('stroke',colors[index]);p.setAttribute('stroke-width','3');svg.append(p)});panel.append(svg);
    const legend=document.createElement('div');legend.className='vc-radar-legend';comparableCars.forEach(({index})=>{const x=document.createElement('span');x.innerHTML=`<b style="background:${colors[index]}"></b>${escapeText(cars[index].brand+' '+cars[index].model)}`;legend.append(x)});panel.append(legend);
  };
  const drawInsights=ids=>{
    const host=$('insightCards');host.replaceChildren();const priority=$('prioritySelect').value;
    const build=(label,headline,body)=>{const card=document.createElement('article');card.className='vc-insight';const small=document.createElement('small');small.textContent=label;const h=document.createElement('h4');h.textContent=headline;const p=document.createElement('p');p.textContent=body;card.append(small,h,p);host.append(card)};
    const measure=(key,direction)=>ids.map(id=>({car:getCar(id),n:comparable(getCar(id),key,lastSpecs.get(id))})).filter(x=>x.n!=null).sort((a,b)=>direction==='low'?a.n-b.n:b.n-a.n);
    const labels={power:['horsepower','high','HORSEPOWER','hp'],accel:['zero_to_sixty','low','0–60 MPH','sec'],speed:['top_speed','high','TOP SPEED','mph'],year:['year','high','MODEL YEAR','']};const [key,direction,title,unit]=labels[priority];const winners=measure(key,direction);
    if(winners.length>=2){const best=winners[0],next=winners[1];if(best.n===next.n)build('YOUR PRIORITY / '+title,'Too close to call',`The top reported ${title.toLowerCase()} value is tied at ${best.n} ${unit}.`);
      else build('YOUR PRIORITY / '+title,`${best.car.brand} ${best.car.model}`,`${best.n} ${unit} versus ${next.n} ${unit} for ${next.car.brand} ${next.car.model}, based on the selected records.`);
    }else build('YOUR PRIORITY / '+title,'Not enough evidence','We need recorded values for at least two vehicles to recommend a leader on this priority.');
    const known=['horsepower','zero_to_sixty','top_speed','transmission','drivetrain','fuel','seats'].map(key=>ids.map(id=>valueFor(getCar(id),key,lastSpecs.get(id),null,'imperial')).filter(Boolean).length).filter(n=>n===ids.length).length;
    build('DATA CLARITY',`${known} / 7 shared fields`,known>=5?'This lineup has several comparable records. Check trim-specific accuracy before making a decision.':'Some specifications are missing. The dashboard will not fill gaps with estimated values.');
    const counts=ids.map(id=>({car:getCar(id),n:allGroups.flatMap(([,rows])=>rows).filter(([,key])=>!['safety','recalls'].includes(key)).map(([,key])=>valueFor(getCar(id),key,lastSpecs.get(id),null,'imperial')).filter(Boolean).length})).sort((a,b)=>b.n-a.n);
    build('WHAT TO INVESTIGATE NEXT','Dig deeper than the badge',`${counts[0]?.car.brand||'This car'} has ${counts[0]?.n||0} documented fields in this comparison. Missing safety, dimensions, torque or equipment data should be independently checked. No reliability or safety winner is implied.`);
  };
  const fetchSpecs=async id=>{
    const car=getCar(id);if(!car)return null;
    if(id.startsWith('model:'))return null;
    if(id.startsWith('vin:'))return {engine_hp:car.horsepower?String(car.horsepower):'',drive_type:car.drivetrain,body_class:car.body_class,transmission_style:car.transmission,fuel_primary:car.fuel,cylinders:car.cylinders,trim:car.trim,manufacturer:car.manufacturer,doors:car.doors};
    try{const r=await fetch('/api/compare/specs?vin='+encodeURIComponent(id));return r.ok?await r.json():null}catch{return null;}
  };
  const fetchSafety=async id=>{
    const car=getCar(id);if(!car||!car.year||!car.brand||!car.model)return null;
    const q=new URLSearchParams({make:car.brand,model:car.model,year:String(car.year)});const results={};
    await Promise.all([['ratings','/api/discovery/safety?'+q],['recalls','/api/discovery/recalls?'+q]].map(async ([key,url])=>{
      try{const r=await fetch(url);if(!r.ok)return;const body=await r.json();const items=body.Results||body.results||[];
        if(key==='ratings'){results.ratings=items.length?'Variant-specific rating records available':'Not available';}
        else results.recalls=`${items.length} model/year record${items.length===1?'':'s'}`;
      }catch{ /* absence is not zero */ }
    }));return results;
  };
  const saveRecent=()=>{if(selection.length<2)return;let data=[];try{data=JSON.parse(localStorage.getItem(STORE_RECENT)||'[]')}catch{};
    const key=selection.join('|');const arr=[{ids:[...selection],cars:selection.map(getCar).filter(Boolean),date:new Date().toISOString()},...data.filter(x=>x.ids?.join('|')!==key)].slice(0,12);
    try{localStorage.setItem(STORE_RECENT,JSON.stringify(arr))}catch{}renderHistory();
  };
  const runComparison=async(scroll=true)=>{
    if(selection.length<2)return;const ids=[...selection],rid=++activeRequest;$('compareNow').disabled=true;$('pickerStatus').textContent='Preparing your comparison…';
    const specs=await Promise.all(ids.map(fetchSpecs));if(rid!==activeRequest)return;
    lastSpecs=new Map(ids.map((id,i)=>[id,specs[i]]));lastSafety=new Map();$('compareResult').hidden=false;
    drawBattle(ids);drawTable(ids);drawBars(ids);drawRadar(ids);drawInsights(ids);saveRecent();$('compareNow').disabled=false;$('pickerStatus').textContent='Your comparison is ready.';
    if(scroll)$('compareResult').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    Promise.all(ids.map(fetchSafety)).then(data=>{if(rid!==activeRequest)return;lastSafety=new Map(ids.map((id,i)=>[id,data[i]]));drawTable(ids);});
  };
  const saveComparison=()=>{let data=[];try{data=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{};const selected=selection.map(id=>getCar(id)).filter(Boolean);
    // Save selected data as well so researched VIN/model selections survive a reload on this device.
    const signature=selection.join('|');data=[{ids:[...selection],cars:selected,date:new Date().toISOString()},...data.filter(x=>x.ids?.join('|')!==signature)].slice(0,12);
    try{localStorage.setItem(STORE,JSON.stringify(data));showToast('Comparison saved on this device.');renderHistory()}catch{showToast('Browser storage is unavailable. Use Share instead.')}
  };
  const revive=entry=>{(entry.cars||[]).forEach(c=>{if(!getCar(c.id))catalogue.push(fromServer(c))});selection=(entry.ids||[]).filter(id=>getCar(id)).slice(0,3);sync();if(selection.length>=2)runComparison(true);};
  const renderHistory=()=>{
    const host=$('historyList');host.replaceChildren();let saved=[],recent=[];try{saved=JSON.parse(localStorage.getItem(STORE)||'[]')}catch{};try{recent=JSON.parse(localStorage.getItem(STORE_RECENT)||'[]')}catch{};
    const all=[...saved.map(x=>({...x,kind:'SAVED'})),...recent.filter(x=>!saved.some(s=>s.ids?.join('|')===x.ids?.join('|'))).map(x=>({...x,kind:'RECENT'}))].slice(0,9);
    if(!all.length){let p=document.createElement('p');p.textContent='Your next favorite matchup will appear here after you compare two cars.';host.append(p);return;}
    all.forEach(entry=>{const label=entry.ids.map(id=>getCar(id)||entry.cars?.find(c=>c.id===id)).filter(Boolean).map(c=>`${c.brand} ${c.model}`).join('  vs  ');const button=document.createElement('button');button.type='button';button.className='vc-history-entry';button.innerHTML=`<span>${escapeText(label||'Saved matchup')}</span><small>${entry.kind} ↗</small>`;button.addEventListener('click',()=>revive(entry));host.append(button)});
  };
  const share=async()=>{if(selection.some(id=>id.startsWith('vin:'))&&!window.confirm('This link will include the selected vehicle VIN. Share it only with people you trust. Continue?'))return;const link=new URL(location.href);link.searchParams.set('ids',selection.map(x=>encodeURIComponent(x)).join(','));
    try{await navigator.clipboard.writeText(link.toString());showToast('Comparison link copied.')}catch{showToast('Your comparison link is in the address bar.')}};
  // Inputs + buttons
  ['vehicleSearch','trimFilter'].forEach(id=>$(id).addEventListener('input',renderCards));['brandFilter','yearFilter'].forEach(id=>$(id).addEventListener('change',renderCards));
  $('resetFilters').addEventListener('click',()=>{['vehicleSearch','trimFilter','brandFilter','yearFilter'].forEach(id=>$(id).value='');renderCards();});
  $('clearSelection').addEventListener('click',()=>{selection=[];sync();$('compareResult').hidden=true;});
  $('compareNow').addEventListener('click',()=>runComparison(true));
  $('researchModelsButton').addEventListener('click',researchModels);$('addResearchButton').addEventListener('click',addResearch);$('addVINButton').addEventListener('click',addVIN);
  $('battleStage').addEventListener('click',event=>{const rem=event.target.closest('[data-remove]');const replace=event.target.closest('[data-replace]');if(rem){toggle(rem.dataset.remove)}if(replace){toggle(replace.dataset.replace);$('studio').scrollIntoView({behavior:'smooth'});$('vehicleSearch').focus({preventScroll:true})}});
  $('swapVehicles').addEventListener('click',()=>{selection.reverse();sync();runComparison(false);});
  ['differenceOnly','highlightBest','unitToggle'].forEach(id=>$(id).addEventListener('change',()=>{if(selection.length>=2)drawTable(selection)}));
  $('prioritySelect').addEventListener('change',()=>{if(selection.length>=2)drawInsights(selection)});
  $('saveComparison').addEventListener('click',saveComparison);$('shareComparison').addEventListener('click',share);
  $('exportComparison').addEventListener('click',()=>{showToast('Use your browser Print dialog → Save as PDF.');setTimeout(()=>window.print(),450)});
  $('trendingGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-match]');if(!btn)return;selection=btn.dataset.match.split(',').filter(id=>getCar(id)).slice(0,3);sync();if(selection.length>=2)runComparison(true);});
  $('clearHistory').addEventListener('click',()=>{localStorage.removeItem(STORE);localStorage.removeItem(STORE_RECENT);renderHistory();showToast('Comparison history cleared.')});
  init();
})();
