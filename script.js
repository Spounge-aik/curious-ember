import { renderNav }              from './components/nav.js';
import { renderHeader, isAiEnabled } from './components/header.js';
import { initAuth }               from './components/auth.js';
import { initMap }                from './components/map.js';
import { renderRecommendations }  from './components/recommendations.js';
import { initLibrary, openDetailOverlay } from './components/library.js';

// ── Supabase ─────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mixrkpghedwpjrrlgrxe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M4v29oq3U2RjNVOnWsqlOQ_Y63pTD7c';
let _sb = null;
export function getSupabase() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ── GBIF fiskdata ─────────────────────────────────────────────────
const GBIF_KEYS = {
  gadda:2346633, abborre:8140485, gos:2382155, lake:2415460,
  lax:7595433,   oring:8215487,  rodding:4284021, harr:5203999,
  mort:2359706,  braxen:9809222, rudor:2366645,   id:4409643,
  asp:5851603,   sik:2351211,    bjorkna:2359471,  sarv:2362635, karp:4286975,
  regnbage:2360866,
};
const KEY_TO_ID = Object.fromEntries(Object.entries(GBIF_KEYS).map(([id,k])=>[k,id]));

const FISH_EMOJI = {
  gadda:'🐟', abborre:'🐠', gos:'🐡', lake:'🦑', lax:'🐟',
  oring:'🐟', rodding:'🐟', harr:'🐟', karp:'🐡', rudor:'🐠',
  braxen:'🐟', id:'🐟', asp:'🐟', sik:'🐟', mort:'🐟', sarv:'🐟', bjorkna:'🐟',
  regnbage:'🌈',
};

const FISH_INFO = {
  gadda:   { name:'Gädda',   desc:'Stor rovfisk',            tag:'Vanlig' },
  abborre: { name:'Abborre', desc:'Vanlig i hela Sverige',   tag:'Vanlig' },
  gos:     { name:'Gös',   desc:'Djuplevande rovfisk',     tag:'Vanlig' },
  lake:    { name:'Lake',    desc:'Aktiv på vintern',        tag:'Vanlig' },
  lax:     { name:'Lax',     desc:'Stor sportfisk',          tag:'Vanlig' },
  oring:   { name:'Öring',   desc:'Kräver kallt vatten',     tag:'Vanlig' },
  rodding: { name:'Rödding', desc:'Djupa kalla sjöar',       tag:'Vanlig' },
  harr:    { name:'Harr',    desc:'Strömmande vatten',       tag:'Vanlig' },
  karp:    { name:'Karp',    desc:'Stor fredfisk',           tag:'Inplanterad' },
  rudor:   { name:'Ruda',    desc:'Grunda sjöar',            tag:'Vanlig' },
  braxen:  { name:'Braxen',  desc:'Lugnvatten',              tag:'Vanlig' },
  id:      { name:'Id',      desc:'Silverfärgad fredfisk',   tag:'Vanlig' },
  asp:     { name:'Asp',     desc:'Rovfisk bland fredfisk',  tag:'Vanlig' },
  sik:     { name:'Sik',     desc:'Norra Sverige',           tag:'Vanlig' },
  mort:    { name:'Mört',    desc:'Vanligaste fiskarten',    tag:'Vanlig' },
  sarv:    { name:'Sarv',    desc:'Grunda vegetationsrika',  tag:'Vanlig' },
  bjorkna:  { name:'Björkna',          desc:'Vanlig kustsjö',          tag:'Vanlig'      },
  regnbage: { name:'Regnbåge',         desc:'Inplanterad sportfisk',   tag:'Inplanterad' },
};

// ── Fiskdata per art ──────────────────────────────────────────────
const FISH_DATA = {
  gadda:    { season:'Vår & tidig höst',   time:'Gryning & förmiddag',   optTemp:[4,16],  goodWind:[0,5] },
  abborre:  { season:'Sommar & höst',       time:'Gryning & skymning',    optTemp:[12,22], goodWind:[0,6] },
  gos:      { season:'Sommar',              time:'Natt & tidig morgon',   optTemp:[18,25], goodWind:[0,4] },
  lake:     { season:'Vinter & vår',        time:'Natt',                  optTemp:[0,10],  goodWind:[0,5] },
  lax:      { season:'Vår & höst',          time:'Tidig morgon',          optTemp:[6,14],  goodWind:[1,6] },
  oring:    { season:'Vår & höst',          time:'Gryning & kväll',       optTemp:[6,16],  goodWind:[1,5] },
  rodding:  { season:'Vår & höst',          time:'Morgon & kväll',        optTemp:[4,14],  goodWind:[0,4] },
  harr:     { season:'Vår & tidig sommar',  time:'Morgon & kväll',        optTemp:[8,18],  goodWind:[0,4] },
  regnbage: { season:'Hela året',           time:'Morgon & kväll',        optTemp:[8,18],  goodWind:[0,5] },
  mort:     { season:'Sommar',              time:'Förmiddag & kväll',     optTemp:[15,24], goodWind:[0,5] },
  braxen:   { season:'Sommar',              time:'Tidig morgon & kväll',  optTemp:[16,24], goodWind:[0,4] },
  karp:     { season:'Högsommar',           time:'Dag',                   optTemp:[18,26], goodWind:[0,3] },
  rudor:    { season:'Sommar',              time:'Förmiddag',             optTemp:[18,26], goodWind:[0,4] },
  id:       { season:'Vår & sommar',        time:'Morgon & kväll',        optTemp:[10,20], goodWind:[0,5] },
  asp:      { season:'Vår & tidig sommar',  time:'Morgon',                optTemp:[12,20], goodWind:[0,5] },
  sik:      { season:'Höst & vinter',       time:'Morgon & kväll',        optTemp:[4,12],  goodWind:[0,5] },
  bjorkna:  { season:'Sommar',              time:'Förmiddag',             optTemp:[16,24], goodWind:[0,4] },
  sarv:     { season:'Sommar',              time:'Förmiddag',             optTemp:[16,24], goodWind:[0,4] },
};

// ── Väder (Open-Meteo – ingen API-nyckel, CORS-fri) ──────────────
let _weatherCache = {};
async function fetchWeather(lat, lng) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (_weatherCache[key]) return _weatherCache[key];
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,windspeed_10m,precipitation,weathercode&wind_speed_unit=ms&timezone=Europe%2FStockholm`;
    const r   = await fetch(url);
    if (!r.ok) throw new Error('Open-Meteo API fel');
    const d   = await r.json();
    const cur  = d.current ?? {};
    const get  = name => cur[name] ?? null;
    const w = { temp: get('temperature_2m'), wind: get('windspeed_10m'), precip: get('precipitation'), code: get('weathercode') };
    _weatherCache[key] = w;
    return w;
  } catch { return null; }
}

function assessWeather(fishId, w) {
  if (!w) return null;
  const fd = FISH_DATA[fishId];
  if (!fd) return null;
  let score = 0;

  // Temperatur (0–40 p)
  if (w.temp !== null) {
    const [lo, hi] = fd.optTemp;
    if (w.temp >= lo && w.temp <= hi)         score += 40;
    else if (w.temp < lo && lo - w.temp < 4)  score += 25;
    else if (w.temp > hi && w.temp - hi < 4)  score += 25;
    else if (Math.abs(w.temp - lo) < 8 || Math.abs(w.temp - hi) < 8) score += 10;
  }
  // Vind (0–30 p)
  if (w.wind !== null) {
    const [, wMax] = fd.goodWind;
    if (w.wind <= wMax)            score += 30;
    else if (w.wind <= wMax + 3)   score += 15;
    else if (w.wind <= wMax + 6)   score += 5;
  }
  // Nederbörd (0–20 p)
  if (w.precip !== null) {
    if (w.precip < 0.1)       score += 20;
    else if (w.precip < 0.5)  score += 12;
    else if (w.precip < 2)    score += 4;
  }

  let rating, color;
  if      (score >= 72) { rating = '⭐⭐⭐ Utmärkt';    color = 'var(--success)'; }
  else if (score >= 50) { rating = '⭐⭐ Bra';          color = 'var(--accent)'; }
  else if (score >= 28) { rating = '⭐ Måttlig';        color = '#f59e0b'; }
  else                  { rating = '⚠️ Utmanande';      color = 'var(--error)'; }

  const tempTxt = w.temp !== null ? `${w.temp}°C` : '';
  const windTxt = w.wind !== null ? `${w.wind} m/s` : '';
  const details = [tempTxt, windTxt].filter(Boolean).join(' · ');

  return { rating, color, details };
}

async function fetchFishForLake(lat, lng, lake = null) {
  const MIN_OBS   = 5;
  const RADII     = [0.02, 0.04, 0.07]; // börja litet (~2km), utöka vid behov
  const YEAR_FROM = new Date().getFullYear() - 10;
  const YEAR_TO   = new Date().getFullYear();

  // Inplanterade arter visas alltid oavsett GBIF
  const stocked = (lake?.stockedFish ?? [])
    .map(id => ({ id, ...FISH_INFO[id], tag: 'Inplanterad', _count: 0 }))
    .filter(f => f.name);

  // Taxa att slå upp (exkludera inplanterade som hanteras separat)
  const keysToLookup = Object.entries(GBIF_KEYS)
    .filter(([fishId]) => !lake?.stockedFish?.includes(fishId));

  for (const deg of RADII) {
    try {
      // En enda request med facets – undviker rate-limiting från 17 parallella anrop
      const params = new URLSearchParams({
        decimalLatitude:  `${lat - deg},${lat + deg}`,
        decimalLongitude: `${lng - deg},${lng + deg}`,
        year:             `${YEAR_FROM},${YEAR_TO}`,
        country:          'SE',
        limit:            '0',
        hasCoordinate:    'true',
        facet:            'SPECIES_KEY',
        facetLimit:       '50',
        facetMincount:    String(MIN_OBS),
      });
      keysToLookup.forEach(([, k]) => params.append('taxonKey', k));

      const r = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`);
      if (!r.ok) continue;
      const d = await r.json();

      // Bygg counts från facet-svaret
      const counts = {};
      for (const { name, count } of d.facets?.[0]?.counts ?? []) {
        const fishId = KEY_TO_ID[Number(name)];
        if (fishId && count >= MIN_OBS) counts[fishId] = count;
      }

      if (Object.keys(counts).length >= 3) {
        const maxCount = Math.max(...Object.values(counts));
        const wildFish = Object.entries(counts)
          .map(([id, count]) => ({
            id,
            ...FISH_INFO[id],
            tag: count >= maxCount * 0.3 ? 'Vanlig'
               : count >= maxCount * 0.1 ? 'Ovanlig'
               : 'Sällsynt',
            _count: count,
          }))
          .filter(f => f.name)
          .sort((a, b) => b._count - a._count);

        return [...wildFish, ...stocked];
      }
    } catch { continue; }
  }

  return stocked;
}

// ── Sjödata ───────────────────────────────────────────────────────
const SEED_LAKES = [
  {id:'trekanten',name:'Trekanten',lat:59.308,lng:18.005,county:'Stockholm',stockedFish:['regnbage'],smhiId:'657902-162594'},
  {id:'judarn',name:'Judarn',lat:59.343,lng:17.924,county:'Stockholm'},
  {id:'drevviken',name:'Drevviken',lat:59.208,lng:18.105,county:'Stockholm'},
  {id:'magelungen',name:'Magelungen',lat:59.229,lng:18.088,county:'Stockholm'},
  {id:'flaten',name:'Flaten',lat:59.244,lng:18.163,county:'Stockholm'},
  {id:'orlången',name:'Orlången',lat:59.218,lng:18.012,county:'Stockholm'},
  {id:'norrviken',name:'Norrviken',lat:59.473,lng:17.953,county:'Stockholm'},
  {id:'vallentunasjön',name:'Vallentunasjön',lat:59.537,lng:18.075,county:'Stockholm'},
  {id:'malaren',name:'Mälaren',lat:59.5,lng:17.1,county:'Stockholm'},
  {id:'yngern',name:'Yngern',lat:59.0,lng:17.43,county:'Stockholm'},
  {id:'erken',name:'Erken',lat:59.83,lng:18.6,county:'Uppsala'},
  {id:'hjalmaren',name:'Hjälmaren',lat:59.18,lng:15.8,county:'Örebro'},
  {id:'vattern',name:'Vättern',lat:58.3,lng:14.6,county:'Jönköping'},
  {id:'vanern',name:'Vänern',lat:58.85,lng:13.5,county:'Västra Götaland'},
  {id:'siljan',name:'Siljan',lat:60.8,lng:14.9,county:'Dalarna'},
  {id:'svinevattnet',name:'Svinevattnet',lat:58.038,lng:11.592,county:'Västra Götaland'},
  {id:'hålsjön-tjörn',name:'Hålsjön (Tjörn)',lat:58.022,lng:11.575,county:'Västra Götaland'},
  {id:'svartedalen',name:'Svartedalssjön',lat:58.122,lng:11.873,county:'Västra Götaland'},
  {id:'väsman',name:'Väsman',lat:60.048,lng:15.583,county:'Dalarna/Västmanland'},
  {id:'åmänningen',name:'Åmänningen',lat:59.832,lng:15.928,county:'Västmanland'},
  {id:'stora-haggen',name:'Stora Haggen',lat:59.952,lng:15.835,county:'Västmanland'},
  {id:'saxen',name:'Saxen',lat:60.118,lng:15.483,county:'Dalarna'},
  {id:'delsjön',name:'Delsjön',lat:57.688,lng:12.047,county:'Västra Götaland'},
  {id:'vombsjön',name:'Vombsjön',lat:55.672,lng:13.563,county:'Skåne'},
  {id:'ringsjön',name:'Ringsjön',lat:55.875,lng:13.508,county:'Skåne'},
  {id:'storsjön-z',name:'Storsjön',lat:63.15,lng:14.38,county:'Jämtland'},
  {id:'dagarn',name:'Dagarn',lat:59.9082,lng:15.7035,county:'Västmanland',smhiId:'664197-149337'},
  {id:'dammsjön-fagersta',name:'Dammsjön',lat:59.9309,lng:15.7238,county:'Västmanland'},
  {id:'svarttjärnen',name:'Svarttjärnen',lat:59.9256,lng:15.7128,county:'Västmanland'},
];

function haversine(a,b,c,d){
  const R=6371,dL=((c-a)*Math.PI)/180,dG=((d-b)*Math.PI)/180;
  const x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)));
}
function getNearby(lat,lng){
  return SEED_LAKES.map(l=>({...l,distance_km:haversine(lat,lng,l.lat,l.lng)}))
    .sort((a,b)=>a.distance_km-b.distance_km).slice(0,12);
}
function searchLakes(q){
  return SEED_LAKES.filter(l=>l.name.toLowerCase().includes(q.toLowerCase()));
}

// ── Router & init ─────────────────────────────────────────────────
const page = location.pathname.split('/').pop() || 'index.html';

// Fade-in på varje sida
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('main').forEach(m => m.classList.add('page-content'));
});

// Initierar Lucide-ikoner när biblioteket laddats
function initIcons() {
  if (window.lucide) lucide.createIcons();
}

renderNav();
if (document.getElementById('app-header')) renderHeader();

// Kör createIcons efter DOM + Lucide är redo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcons);
} else {
  // Lucide laddas som vanligt script — vänta lite om det inte syns än
  if (window.lucide) lucide.createIcons();
  else window.addEventListener('load', initIcons);
}

// Ladda Supabase SDK dynamiskt
const sbScript = document.createElement('script');
sbScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
sbScript.onload = () => {
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  guardAuth();
};
document.head.appendChild(sbScript);

// ── Global auth-gate ──────────────────────────────────────────────
// auth.html är enda sidan utan skydd
async function guardAuth() {
  if (page === 'auth.html') {
    return initAuth();
  }

  // Kontrollera session – Supabase cachar i localStorage automatiskt
  const { data: { session } } = await _sb.auth.getSession();

  if (!session) {
    // Spara vilken sida användaren försökte nå
    sessionStorage.setItem('redirectAfterLogin', location.href);
    location.replace('auth.html');
    return;
  }

  // Lyssna på auth-ändringar (utloggning i annat fönster etc.)
  _sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') location.replace('auth.html');
  });

  initPage();
}

function initPage() {
  if (page === 'library.html')     return initLibrary();
  if (page === 'lake.html')        return initLakePage();
  if (page === 'session.html')     return initSessionPage();
  if (page === 'end-session.html') return initEndSessionPage();
  if (page === 'history.html')     return initHistoryPage();
  if (page === 'catch.html')       return initCatchPage();
  if (page === 'catches.html')     return initCatchesPage();
  if (page === 'lakes.html')       return initHomePage();
  // index.html = landing page, ingen init behövs
}

// ── Hemsida – Wizard ──────────────────────────────────────────────
function initHomePage() {
  let selectedLake = null;
  let selectedFish = null;
  let allLakes     = [];
  let allFish      = [];

  // ── Wizard-navigation ─────────────────────────
  function goToStep(n) {
    [1, 2, 3].forEach(i => {
      const step = document.getElementById(`step-${i}`);
      const dot  = document.getElementById(`dot-${i}`);
      if (i < n) {
        step.classList.remove('active');
        dot.classList.remove('active');
        dot.classList.add('done');
      } else if (i === n) {
        step.classList.add('active');
        dot.classList.add('active');
        dot.classList.remove('done');
      } else {
        step.classList.remove('active');
        dot.classList.remove('active', 'done');
      }
    });
    if (window.lucide) lucide.createIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.__goToStep = goToStep;

  // ── Steg 1: Välj sjö ──────────────────────────
  const gpsBtn       = document.getElementById('btn-gps');
  const searchToggle = document.getElementById('btn-search-toggle');
  const searchBox    = document.getElementById('search-box');
  const searchInput  = document.getElementById('search-input');
  const statusMsg    = document.getElementById('status-msg');
  const mapDiv       = document.getElementById('map');
  const lakeSection  = document.getElementById('lake-section');
  const lakeList     = document.getElementById('lake-list');
  const listTitle    = document.getElementById('lake-list-title');
  const gpsSkeleton  = document.getElementById('gps-skeleton');
  const gpsWidget    = document.getElementById('gps-widget');
  const lakeSkeleton = document.getElementById('lake-skeleton');

  function setStatus(msg) {
    statusMsg.textContent   = msg;
    statusMsg.style.display = msg ? 'block' : 'none';
  }

  function renderLakes(lakes, isSearch = false) {
    allLakes = lakes;
    gpsSkeleton.style.display  = 'none';
    lakeSkeleton.style.display = 'none';
    mapDiv.style.display       = 'block';
    lakeSection.style.display  = 'block';
    listTitle.textContent      = isSearch ? 'Sökresultat' : 'Närmaste sjöar';

    if (!isSearch && lakes[0]) {
      document.getElementById('gps-lake-name').textContent = lakes[0].name;
      document.getElementById('gps-lake-dist').textContent = `${lakes[0].distance_km} km bort · ${lakes[0].county}`;
      gpsWidget.style.display = 'block';
      document.getElementById('gps-select-btn').onclick = () => selectLake(lakes[0], lakes);
    }

    lakeList.innerHTML = lakes.map(l => `
      <button class="lake-btn ${selectedLake?.id === l.id ? 'active' : ''}" data-id="${l.id}">
        <div>
          <div class="lake-name">${l.name}</div>
          <div class="lake-meta">${l.county}${l.distance_km != null ? ' · ' + l.distance_km + ' km' : ''}</div>
        </div>
        ${selectedLake?.id === l.id ? `<i data-lucide="check" style="width:18px;height:18px;color:var(--accent)"></i>` : ''}
      </button>`).join('');

    lakeList.querySelectorAll('.lake-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const lake = lakes.find(l => l.id === btn.dataset.id);
        if (lake) selectLake(lake, lakes);
      }));

    const center = lakes[0] ? [lakes[0].lat, lakes[0].lng] : [62.5, 16];
    initMap(center, lakes, lake => selectLake(lake, lakes));
    if (window.lucide) lucide.createIcons();
  }

  function selectLake(lake, lakes) {
    selectedLake = lake;
    sessionStorage.setItem('selectedLake', JSON.stringify(lake));
    renderLakes(lakes, listTitle.textContent === 'Sökresultat');

    // Uppdatera chip i steg 2
    document.getElementById('chip-lake-name').textContent   = lake.name;
    document.getElementById('chip-lake-name-3').textContent = lake.name;

    // Gå till steg 2
    goToStep(2);
    loadFishForLake(lake);
  }

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus('GPS stöds ej i din webbläsare.'); return; }
    gpsSkeleton.style.display  = 'block';
    lakeSkeleton.style.display = 'block';
    setStatus('');
    navigator.geolocation.getCurrentPosition(
      pos => renderLakes(getNearby(pos.coords.latitude, pos.coords.longitude)),
      () => {
        gpsSkeleton.style.display  = 'none';
        lakeSkeleton.style.display = 'none';
        setStatus('Kunde inte hämta plats. Kontrollera GPS-behörighet.');
      }
    );
  });

  searchToggle.addEventListener('click', () => {
    const open = searchBox.style.display === 'none';
    searchBox.style.display = open ? 'block' : 'none';
    if (open) searchInput.focus();
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = searchInput.value.trim();
      if (q.length < 2) return;
      renderLakes(searchLakes(q), true);
    }, 280);
  });

  // ── Steg 2: Välj fisk ─────────────────────────
  async function loadFishForLake(lake) {
    const fishGrid = document.getElementById('fish-grid');
    const fishSkel = document.getElementById('fish-skeleton');
    const countTxt = document.getElementById('fish-count-text');

    fishGrid.style.display = 'none';
    fishSkel.style.display = 'grid';
    countTxt.textContent   = 'Hämtar fiskarter från Artportalen…';

    try {
      allFish = await fetchFishForLake(lake.lat, lake.lng, lake);
    } catch { allFish = []; }

    if (!allFish.length) allFish = [
      { id:'gadda',   name:'Gädda',   tag:'Vanlig' },
      { id:'abborre', name:'Abborre', tag:'Vanlig' },
      { id:'gos',     name:'Gös',   tag:'Vanlig' },
    ];

    countTxt.textContent   = `${allFish.length} fiskarter registrerade i denna sjö`;
    fishSkel.style.display = 'none';
    fishGrid.style.display = 'grid';
    renderFishGrid();
  }

  function renderFishGrid() {
    const fishGrid = document.getElementById('fish-grid');
    fishGrid.innerHTML = allFish.map(f => `
      <div class="home-fish-card ${selectedFish?.id === f.id ? 'selected' : ''}" data-fid="${f.id}">
        <span class="hfc-emoji">${FISH_EMOJI[f.id] ?? '🐟'}</span>
        <div class="hfc-name">${f.name}</div>
        <div class="hfc-tag">${f.tag ?? 'Vanlig'}</div>
      </div>`).join('');

    fishGrid.querySelectorAll('.home-fish-card').forEach(card =>
      card.addEventListener('click', () => {
        const fish = allFish.find(f => f.id === card.dataset.fid);
        if (!fish) return;
        const same = selectedFish?.id === fish.id;
        selectedFish = same ? null : fish;
        renderFishGrid();
        showFishPanel(selectedFish, selectedLake);
      }));
  }

  async function showFishPanel(fish, lake) {
    const panel = document.getElementById('fish-info-panel');
    if (!fish) { panel.style.display = 'none'; return; }

    const fd = FISH_DATA[fish.id] ?? {};
    panel.style.display = 'block';
    panel.innerHTML = `
      <div class="fish-info-card">
        <div class="fic-header">
          <span style="font-size:26px">${FISH_EMOJI[fish.id] ?? '🐟'}</span>
          <div>
            <div class="fic-name">${fish.name}</div>
            <div class="fic-sub">${fish.tag ?? 'Vanlig'}</div>
          </div>
        </div>
        <div class="fic-rows">
          <div class="fic-row"><span>📅 Bästa säsong</span><span>${fd.season ?? '—'}</span></div>
          <div class="fic-row"><span>⏰ Aktivast</span><span>${fd.time ?? '—'}</span></div>
          <div class="fic-row" id="fic-weather-row">
            <span>🌤️ Väder nu</span>
            <span class="text-muted" style="font-size:.78rem">Hämtar…</span>
          </div>
        </div>
        <button class="btn btn-primary btn-full" id="btn-fish-select" style="margin-top:14px;font-size:1rem">
          Välj ${fish.name}
        </button>
      </div>`;

    document.getElementById('btn-fish-select').addEventListener('click', () => selectFish(fish));
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Hämta väder asynkront
    if (lake) {
      const w   = await fetchWeather(lake.lat, lake.lng);
      const row = document.getElementById('fic-weather-row');
      if (!row) return;
      const a = assessWeather(fish.id, w);
      row.innerHTML = a
        ? `<span>🌤️ Väder nu</span>
           <span style="color:${a.color};font-weight:700">${a.rating}</span>`
        : `<span>🌤️ Väder nu</span><span class="text-muted">Ej tillgängligt</span>`;
      if (a?.details) {
        row.insertAdjacentHTML('afterend',
          `<div class="fic-row"><span></span><span class="text-muted" style="font-size:.72rem">${a.details}</span></div>`);
      }
    }
  }

  function selectFish(fish) {
    sessionStorage.setItem('selectedFish', JSON.stringify(fish));

    // Uppdatera chips i steg 3
    document.getElementById('chip-fish-name').textContent  = fish.name;
    document.getElementById('chip-fish-emoji').textContent = FISH_EMOJI[fish.id] ?? '🐟';
    document.getElementById('hero-title').textContent =
      `Bästa valet för ${fish.name} i ${selectedLake?.name ?? '—'}`;

    goToStep(3);
    loadEquipmentPreview(fish);
  }

  // ── Steg 3: Utrustning & start ─────────────────
  async function loadEquipmentPreview(fish) {
    const section  = document.getElementById('eq-preview-section');
    const grid     = document.getElementById('eq-preview-grid');
    const hint     = document.getElementById('login-hint');

    const { data: { user } } = await _sb.auth.getUser();
    if (!user) {
      hint.style.display    = 'flex';
      section.style.display = 'none';
      return;
    }

    hint.style.display = 'none';
    const fishTag = fish.name.toLowerCase();

    const [{ data: rods }, { data: lures }] = await Promise.all([
      _sb.from('rods').select('*').eq('user_id', user.id),
      _sb.from('lures').select('*').eq('user_id', user.id),
    ]);

    // Filtrera på fisk-tagg eller visa alla om inga matchningar
    const matchRods  = (rods  ?? []).filter(r => r.tags?.some(t => t.includes(fishTag))).slice(0,2);
    const matchLures = (lures ?? []).filter(l => l.tags?.some(t => t.includes(fishTag))).slice(0,4);

    const allItems = [
      ...matchRods.map(r  => ({...r, kind:'rod'})),
      ...matchLures.map(l => ({...l, kind:'lure'})),
    ];

    if (!allItems.length) {
      // Visa de senaste om inga matchningar
      const recent = [
        ...(rods ?? []).slice(0,2).map(r  => ({...r, kind:'rod'})),
        ...(lures ?? []).slice(0,2).map(l => ({...l, kind:'lure'})),
      ];
      if (!recent.length) { section.style.display = 'none'; return; }
      renderEqPreview(grid, recent);
    } else {
      renderEqPreview(grid, allItems);
    }

    section.style.display = 'block';
  }

  function renderEqPreview(grid, items) {
    grid.innerHTML = items.map((item, i) => `
      <div class="eq-preview-card">
        <div class="eq-preview-img">
          ${item.image_url
            ? `<img src="${item.image_url}" alt="${item.name}">`
            : `<span style="font-size:28px">${item.kind === 'rod' ? '🎣' : '🪝'}</span>`}
          ${i === 0 ? `<div style="position:absolute;top:6px;right:6px" class="best-badge">Bäst</div>` : ''}
        </div>
        <div class="eq-preview-body" style="position:relative">
          <div class="eq-preview-name">${item.name}</div>
          <div class="eq-preview-meta">${item.kind === 'rod' ? 'Spö' : `Bete${item.type ? ' · ' + item.type : ''}`}</div>
        </div>
      </div>`).join('');
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    if (!selectedLake || !selectedFish) return;
    const btn = document.getElementById('btn-start');
    btn.textContent = 'Startar…';
    btn.classList.remove('btn-pulse');
    btn.classList.add('btn-fishing');
    setTimeout(() => {
      location.href = `session.html?lakeId=${selectedLake.id}&fishId=${selectedFish.id}`;
    }, 500);
  });
}

// ── Sjösida ───────────────────────────────────────────────────────
async function initLakePage() {
  const params = new URLSearchParams(location.search);
  const lake   = JSON.parse(sessionStorage.getItem('selectedLake') || 'null')
    ?? SEED_LAKES.find(l => l.id === params.get('id'));

  if (!lake) { document.getElementById('lake-name').textContent = 'Sjön hittades inte'; return; }

  document.getElementById('lake-name').textContent   = lake.name;
  document.getElementById('lake-county').textContent = lake.county;

  let selectedFish = null;
  const fishGrid   = document.getElementById('fish-grid');
  const fishSkel   = document.getElementById('fish-skeleton');
  const selWrap    = document.getElementById('selected-wrap');
  const selName    = document.getElementById('selected-fish-name');
  const selEmoji   = document.getElementById('selected-fish-emoji');
  const startBtn   = document.getElementById('btn-start');
  const countTxt   = document.getElementById('fish-count-text');
  const srcBadge   = document.getElementById('source-badge');

  // Visa skeleton
  fishSkel.style.display = 'grid';

  let fish = [];
  try {
    fish = await fetchFishForLake(lake.lat, lake.lng, lake);
    srcBadge.style.display = fish.length ? 'inline-flex' : 'none';
  } catch { fish = []; }

  if (!fish.length) fish = [
    {id:'gadda',name:'Gädda',tag:'Vanlig'},{id:'abborre',name:'Abborre',tag:'Vanlig'},{id:'gos',name:'Gös',tag:'Vanlig'}
  ];

  countTxt.textContent    = `🐟 ${fish.length} fiskarter registrerade`;
  fishSkel.style.display = 'none';
  fishGrid.style.display = 'grid';

  function renderFish() {
    fishGrid.innerHTML = fish.map(f => `
      <div class="fish-card ${selectedFish?.id === f.id ? 'selected' : ''}" data-id="${f.id}"
           style="display:flex;flex-direction:column;align-items:center;padding:18px 12px;cursor:pointer;
                  border-radius:var(--radius-lg);background:var(--surface);transition:all .15s;
                  border:1.5px solid ${selectedFish?.id===f.id?'var(--accent)':'var(--border-soft)'}">
        <div style="font-size:34px;margin-bottom:8px">${FISH_EMOJI[f.id] ?? '🐟'}</div>
        <div style="font-weight:700;font-size:.85rem;color:${selectedFish?.id===f.id?'var(--accent)':'var(--text)'}">${f.name}</div>
        <div style="font-size:.65rem;margin-top:4px;background:var(--surface-2);color:var(--text-3);border-radius:var(--radius-full);padding:2px 8px">${f.tag ?? 'Vanlig'}</div>
      </div>`).join('');

    fishGrid.querySelectorAll('.fish-card').forEach(card =>
      card.addEventListener('click', () => {
        const same = selectedFish?.id === card.dataset.id;
        selectedFish = same ? null : fish.find(x => x.id === card.dataset.id);
        renderFish();
        showLakeFishPanel(selectedFish, lake);
      }));
  }
  renderFish();

  // ── Sjöanteckningar ───────────────────────────
  const sb2 = getSupabase();
  const { data: { user: noteUser } } = await sb2.auth.getUser();

  async function loadNotes() {
    const list = document.getElementById('lake-notes-list');
    if (!list || !noteUser) return;
    const { data: notes } = await sb2.from('lake_notes')
      .select('*').eq('user_id', noteUser.id).eq('lake_id', lake.id)
      .order('created_at', { ascending: false });
    if (!notes?.length) {
      list.innerHTML = '<p class="text-xs text-muted" style="padding:4px 0">Inga anteckningar ännu.</p>';
      return;
    }
    list.innerHTML = notes.map(n => {
      const d = new Date(n.created_at).toLocaleDateString('sv-SE', { day:'numeric', month:'short', year:'numeric' });
      return `
        <div style="background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius);
                    padding:10px 12px;display:flex;gap:10px;align-items:flex-start" data-note-id="${n.id}">
          <div style="flex:1">
            <p style="font-size:.83rem;color:var(--text);line-height:1.5;white-space:pre-wrap">${n.note}</p>
            <p style="font-size:.7rem;color:var(--text-3);margin-top:4px">${d}</p>
          </div>
          <button class="btn-del-note" data-id="${n.id}"
                  style="background:none;border:none;color:var(--text-3);cursor:pointer;padding:2px 4px;flex-shrink:0"
                  title="Ta bort">
            <i data-lucide="x" style="width:14px;height:14px;stroke:currentColor"></i>
          </button>
        </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
    list.querySelectorAll('.btn-del-note').forEach(btn =>
      btn.addEventListener('click', async () => {
        await sb2.from('lake_notes').delete().eq('id', btn.dataset.id);
        btn.closest('[data-note-id]').remove();
        if (!list.children.length)
          list.innerHTML = '<p class="text-xs text-muted" style="padding:4px 0">Inga anteckningar ännu.</p>';
      }));
  }

  const saveNoteBtn = document.getElementById('btn-save-note');
  if (saveNoteBtn && noteUser) {
    loadNotes();
    saveNoteBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('lake-note-input');
      const text = textarea.value.trim();
      if (!text) return;
      saveNoteBtn.disabled = true;
      await sb2.from('lake_notes').insert({ user_id: noteUser.id, lake_id: lake.id, note: text });
      textarea.value = '';
      saveNoteBtn.disabled = false;
      loadNotes();
    });
  }

  async function showLakeFishPanel(f, lake) {
    if (!f) { selWrap.style.display = 'none'; return; }
    const fd = FISH_DATA[f.id] ?? {};

    selWrap.style.display = 'block';
    selWrap.innerHTML = `
      <div class="fish-info-card">
        <div class="fic-header">
          <span style="font-size:26px">${FISH_EMOJI[f.id] ?? '🐟'}</span>
          <div>
            <div class="fic-name">${f.name}</div>
            <div class="fic-sub">${f.tag ?? 'Vanlig'}</div>
          </div>
        </div>
        <div class="fic-rows">
          <div class="fic-row"><span>📅 Bästa säsong</span><span>${fd.season ?? '—'}</span></div>
          <div class="fic-row"><span>⏰ Aktivast</span><span>${fd.time ?? '—'}</span></div>
          <div class="fic-row" id="fic-weather-row">
            <span>🌤️ Väder nu</span>
            <span class="text-muted" style="font-size:.78rem">Hämtar…</span>
          </div>
        </div>
        <button class="btn btn-primary btn-full btn-lg btn-pulse" id="btn-lake-start" style="margin-top:14px">
          Välj ${f.name}
        </button>
      </div>`;

    document.getElementById('btn-lake-start').addEventListener('click', () => {
      const btn = document.getElementById('btn-lake-start');
      btn.textContent = '🟢 Fiske pågår…';
      btn.classList.remove('btn-pulse');
      btn.classList.add('btn-fishing');
      sessionStorage.setItem('selectedFish', JSON.stringify(f));
      setTimeout(() => location.href = `session.html?lakeId=${lake.id}&fishId=${f.id}`, 600);
    });

    selWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const w   = await fetchWeather(lake.lat, lake.lng);
    const row = document.getElementById('fic-weather-row');
    if (!row) return;
    const a = assessWeather(f.id, w);
    row.innerHTML = a
      ? `<span>🌤️ Väder nu</span><span style="color:${a.color};font-weight:700">${a.rating}</span>`
      : `<span>🌤️ Väder nu</span><span class="text-muted">Ej tillgängligt</span>`;
    if (a?.details) {
      row.insertAdjacentHTML('afterend',
        `<div class="fic-row"><span></span><span class="text-muted" style="font-size:.72rem">${a.details}</span></div>`);
    }
  }
}

// ── Sessionssida ──────────────────────────────────────────────────
async function initSessionPage() {
  const params    = new URLSearchParams(location.search);
  const sessionId = params.get('sessionId'); // satt när man öppnar historisk tur

  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  // ── HISTORISK TUR: ladda sparade rekommendationer ──────────────
  if (sessionId) {
    const { data: s } = await sb.from('sessions')
      .select('*').eq('id', sessionId).single();

    if (s) {
      document.getElementById('session-lake').textContent       = s.lake_name;
      document.getElementById('session-fish').textContent       = s.target_fish_name;
      document.getElementById('session-fish-emoji').textContent = FISH_EMOJI[s.target_fish_id] ?? '🐟';
      document.getElementById('session-time').textContent       =
        new Date(s.started_at).toLocaleDateString('sv-SE',
          { weekday:'long', hour:'2-digit', minute:'2-digit' });

      // Sätt sessionStorage så att "Registrera fångst" fungerar
      sessionStorage.setItem('selectedLake',
        JSON.stringify({ id: s.lake_id, name: s.lake_name, lat: 0, lng: 0, county: '' }));
      sessionStorage.setItem('selectedFish',
        JSON.stringify({ id: s.target_fish_id, name: s.target_fish_name }));

      const histFish    = { id: s.target_fish_id, name: s.target_fish_name };
      const histWeather = {};
      initDepthMap(s.lake_id, histFish, histWeather);

      if (s.recommendations) {
        renderRecommendations(s.recommendations);
      } else {
        document.getElementById('loading-state').style.display = 'none';
        const err = document.getElementById('error-state');
        err.style.display = 'block';
        err.textContent   = 'Rekommendationerna från denna tur är inte sparade.';
      }
    }
    return; // Öppna inte ny session, anropa inte API
  }

  // ── NY TUR: hämta rekommendationer och spara ───────────────────
  const lake = JSON.parse(sessionStorage.getItem('selectedLake') || 'null')
    ?? SEED_LAKES.find(l => l.id === params.get('lakeId'));
  const fish = JSON.parse(sessionStorage.getItem('selectedFish') || 'null');

  document.getElementById('session-lake').textContent       = lake?.name ?? 'Okänd sjö';
  document.getElementById('session-fish').textContent       = fish?.name ?? 'Okänd fisk';
  document.getElementById('session-fish-emoji').textContent = FISH_EMOJI[fish?.id] ?? '🐟';
  document.getElementById('session-time').textContent       =
    new Date().toLocaleDateString('sv-SE', { weekday:'long', hour:'2-digit', minute:'2-digit' });

  const weatherRef = {};
  if (lake?.lat && lake?.lng) {
    fetchWeather(lake.lat, lake.lng).then(w => { if (w) weatherRef.current = w; });
  }
  initDepthMap(lake?.id, fish, weatherRef);

  const [{ data: rods }, { data: lures }] = await Promise.all([
    sb.from('rods').select('*').eq('user_id', user.id),
    sb.from('lures').select('*').eq('user_id', user.id),
  ]);

  // Hoppa över AI om det är avstängt
  if (!isAiEnabled()) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('rec-content').style.display   = 'block';
    document.getElementById('tip-box').style.display       = 'block';
    document.getElementById('tip-text').textContent        =
      'AI-rekommendationer är avstängda. Slå på AI-knappen (✨) i toppen för att aktivera.';
    return;
  }

  try {
    const res = await fetch('/api/recommend', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        lakeName: lake?.name, fishName: fish?.name,
        rods: rods ?? [], lures: lures ?? [],
      }),
    });
    if (res.status === 401) { location.href = 'auth.html'; return; }
    const recData = await res.json();
    renderRecommendations(recData);

    // Spara session + rekommendationer i ett anrop
    sb.from('sessions').insert({
      user_id:          user.id,
      lake_id:          lake?.id ?? 'unknown',
      lake_name:        lake?.name ?? '?',
      target_fish_id:   fish?.id ?? 'unknown',
      target_fish_name: fish?.name ?? '?',
      recommendations:  recData,
    }).then(() => {});

  } catch {
    document.getElementById('loading-state').style.display = 'none';
    const err = document.getElementById('error-state');
    err.style.display = 'block';
    err.textContent   = 'Kunde inte hämta rekommendationer. Kontrollera din anslutning.';
  }
}

// ── Djupkarta (sessionssidan) ─────────────────────────────────────
function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5)  return 'Vår';
  if (m >= 6 && m <= 8)  return 'Sommar';
  if (m >= 9 && m <= 11) return 'Höst';
  return 'Vinter';
}

function initDepthMap(lakeId, fish, weatherRef) {
  const lake    = SEED_LAKES.find(l => l.id === lakeId);
  if (!lake?.smhiId) return;
  const section = document.getElementById('depth-map-section');
  if (!section) return;
  section.style.display = 'block';
  if (window.lucide) lucide.createIcons();

  let mapLoaded = false;
  document.getElementById('btn-show-depth').addEventListener('click', async () => {
    const canvasWrap = document.getElementById('depth-map-canvas-wrap');
    const chevron    = document.getElementById('depth-chevron');
    const open       = canvasWrap.style.display !== 'none';

    canvasWrap.style.display    = open ? 'none' : 'block';
    if (chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
    if (open || mapLoaded) return;

    const loading = document.getElementById('depth-map-loading');
    const imgEl   = document.getElementById('depth-map-img');
    imgEl.onload = () => {
      loading.style.display = 'none';
      imgEl.style.display   = 'block';
      mapLoaded = true;

      // Öppna lightbox vid klick/tryck
      imgEl.addEventListener('click', () => {
        const lb    = document.getElementById('map-lightbox');
        const lbImg = document.getElementById('map-lightbox-img');
        lbImg.src              = imgEl.src;
        lb.style.display       = 'flex';
        document.body.style.overflow = 'hidden';
        // Tillåt pinch-zoom i lightboxen
        document.querySelector('meta[name=viewport]').content =
          'width=device-width, initial-scale=1';
      });
    };
    imgEl.onerror = () => { loading.innerHTML = '<span style="color:var(--error)">Djupkarta saknas för denna sjö</span>'; };
    imgEl.src     = `/maps/${lakeId}.png`;
  });

  // ── Analysera fiskeplatser ────────────────────────────────────────
  const btnSpots    = document.getElementById('btn-analyze-spots');
  const spotsResult = document.getElementById('spots-result');
  const spotsLoad   = document.getElementById('spots-loading');
  const spotsList   = document.getElementById('spots-list');
  if (!btnSpots) return;

  btnSpots.addEventListener('click', async () => {
    if (!isAiEnabled()) {
      spotsResult.style.display = 'block';
      spotsList.innerHTML = '<p class="text-sm text-muted" style="padding:8px 0">Slå på AI-knappen (✨) i toppen för att använda denna funktion.</p>';
      return;
    }

    btnSpots.disabled = true;
    btnSpots.innerHTML = '<i data-lucide="loader" class="icon" style="animation:spin 1s linear infinite"></i> Analyserar…';
    if (window.lucide) lucide.createIcons();
    spotsResult.style.display = 'block';
    spotsLoad.style.display   = 'block';
    spotsList.innerHTML       = '';

    try {
      // Hämta kartan som base64
      let mapBase64 = null;
      try {
        const imgResp = await fetch(`/maps/${lakeId}.png`);
        const blob    = await imgResp.blob();
        mapBase64 = await new Promise(r => {
          const reader = new FileReader();
          reader.onload = () => r(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } catch { /* kör utan bild */ }

      const fd = FISH_DATA[fish?.id] ?? {};
      const fishDataStr = `Bästa säsong: ${fd.season ?? '?'}, aktivast: ${fd.time ?? '?'}, optimaltemperatur: ${fd.optTemp?.[0] ?? '?'}–${fd.optTemp?.[1] ?? '?'}°C, maxvind: ${fd.goodWind?.[1] ?? '?'} m/s.`;

      const resp = await fetch('/api/analyze-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fishName:  fish?.name ?? 'Okänd fisk',
          fishData:  fishDataStr,
          lakeName:  lake.name,
          weather:   weatherRef?.current ?? null,
          season:    getSeason(),
          mapBase64,
        }),
      });

      const data = await resp.json();
      spotsLoad.style.display = 'none';

      if (!resp.ok || !data.spots) {
        spotsList.innerHTML = `<p class="text-sm" style="color:var(--error);padding:8px 0">${data.error ?? 'Analys misslyckades'}</p>`;
        return;
      }

      spotsList.innerHTML = data.spots.map((s, i) => `
        <div style="background:var(--surface-2);border-radius:var(--radius);padding:12px 14px;border-left:3px solid var(--accent)">
          <div style="font-weight:700;font-size:.85rem;margin-bottom:4px;color:var(--accent)">
            ${['①','②','③'][i] ?? (i+1+'.')} ${s.name}
          </div>
          <div style="font-size:.78rem;color:var(--text-2);line-height:1.5">${s.description}</div>
        </div>`).join('');

    } catch (e) {
      spotsLoad.style.display = 'none';
      spotsList.innerHTML = `<p class="text-sm" style="color:var(--error);padding:8px 0">Fel: ${e.message}</p>`;
    } finally {
      btnSpots.disabled = false;
      btnSpots.innerHTML = '<i data-lucide="sparkles" style="width:15px;height:15px;color:var(--accent)"></i> Analysera fiskeplatser';
      if (window.lucide) lucide.createIcons();
    }
  });
}

// ── Historik ──────────────────────────────────────────────────────
async function initHistoryPage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  async function loadSessions() {
    const { data: sessions } = await sb.from('sessions')
      .select('*').eq('user_id', user.id)
      .order('started_at', { ascending: false }).limit(30);

    document.getElementById('hist-skeleton').style.display = 'none';

    if (!sessions?.length) {
      document.getElementById('hist-content').style.display = 'none';
      document.getElementById('hist-empty').style.display   = 'block';
      return;
    }

    document.getElementById('hist-empty').style.display   = 'none';
    document.getElementById('hist-content').style.display = 'block';

    const list = document.getElementById('hist-list');
    list.innerHTML = sessions.map(s => {
      const date = new Date(s.started_at).toLocaleDateString('sv-SE',
        { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      return `
        <div class="session-hist-card" data-id="${s.id}">
          <div style="flex:1;cursor:pointer" class="session-nav"
               data-sid="${s.id}">
            <div style="font-weight:700;font-size:.9rem">${s.lake_name}</div>
            <div class="sh-fish-row">
              <span>${FISH_EMOJI[s.target_fish_id] ?? '🐟'}</span>
              <span style="font-size:.8rem;color:var(--text-2)">${s.target_fish_name}</span>
            </div>
            <div class="text-xs" style="color:var(--text-3);margin-top:4px">${date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span class="sh-badge session-nav" style="cursor:pointer"
                  data-sid="${s.id}">→</span>
            <button class="btn-delete-session" data-id="${s.id}"
                    style="background:var(--error-dim);border:1px solid rgba(248,113,113,.2);border-radius:10px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;color:var(--error);transition:all .15s"
                    title="Radera session">
              <i data-lucide="trash-2" style="width:15px;height:15px;stroke:currentColor"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    // Navigera till historisk session (utan att starta ny)
    list.querySelectorAll('.session-nav').forEach(el =>
      el.addEventListener('click', () => {
        location.href = `session.html?sessionId=${el.dataset.sid}`;
      }));

    // Radera session
    list.querySelectorAll('.btn-delete-session').forEach(btn =>
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id   = btn.dataset.id;
        const card = list.querySelector(`.session-hist-card[data-id="${id}"]`);

        // Animera bort
        card.style.transition = 'opacity .25s, transform .25s';
        card.style.opacity    = '0';
        card.style.transform  = 'translateX(20px)';

        await sb.from('sessions').delete().eq('id', id);
        setTimeout(() => loadSessions(), 260);
      }));

    if (window.lucide) lucide.createIcons();
  }

  loadSessions();
}

// ── Fångstregistrering ────────────────────────────────────────────
async function initCatchPage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  // Förifyll fiskart från sessionStorage
  const fish = JSON.parse(sessionStorage.getItem('selectedFish') || 'null');
  const lake = JSON.parse(sessionStorage.getItem('selectedLake') || 'null');

  const fishNameInput = document.getElementById('catch-fish-name');
  const datetimeInput = document.getElementById('catch-datetime');

  if (fish?.name) fishNameInput.value = fish.name;
  datetimeInput.value = new Date().toISOString().slice(0, 16);

  // Hämta väder i bakgrunden
  let currentWeather = null;
  if (lake?.lat && lake?.lng) {
    fetchWeather(lake.lat, lake.lng).then(w => { currentWeather = w; });
  }

  // ── Platskarta ────────────────────────────────
  let catchLat = null, catchLng = null;
  const mapWrap   = document.getElementById('catch-map-wrap');
  const noLakeMsg = document.getElementById('catch-no-lake');

  if (lake?.lat && lake?.lng && window.L) {
    mapWrap.style.display   = 'block';
    noLakeMsg.style.display = 'none';

    // Fix Leaflet marker icon paths
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const catchMap = L.map('catch-map').setView([lake.lat, lake.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    }).addTo(catchMap);

    let pinMarker = null;
    const coordsEl = document.getElementById('catch-coords');
    catchMap.on('click', e => {
      catchLat = parseFloat(e.latlng.lat.toFixed(6));
      catchLng = parseFloat(e.latlng.lng.toFixed(6));
      if (pinMarker) pinMarker.setLatLng(e.latlng);
      else pinMarker = L.marker(e.latlng).addTo(catchMap);
      coordsEl.textContent = `📍 ${catchLat}, ${catchLng}`;
      coordsEl.style.color = 'var(--accent)';
    });
  }

  // ── Foto ──────────────────────────────────────
  let catchImageFile = null;

  const btnCamera   = document.getElementById('btn-catch-camera');
  const btnGallery  = document.getElementById('btn-catch-gallery');
  const fileCamera  = document.getElementById('catch-file-camera');
  const fileGallery = document.getElementById('catch-file-gallery');
  const previewWrap = document.getElementById('catch-img-preview-wrap');
  const previewImg  = document.getElementById('catch-img-preview');
  const btnClear    = document.getElementById('btn-clear-image');

  function handleImageFile(file) {
    if (!file) return;
    catchImageFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      previewImg.src = e.target.result;
      previewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  btnCamera.addEventListener('click',  () => fileCamera.click());
  btnGallery.addEventListener('click', () => fileGallery.click());
  fileCamera.addEventListener('change',  e => handleImageFile(e.target.files[0]));
  fileGallery.addEventListener('change', e => handleImageFile(e.target.files[0]));
  btnClear.addEventListener('click', () => {
    catchImageFile = null;
    previewImg.src = '';
    previewWrap.style.display = 'none';
    fileCamera.value  = '';
    fileGallery.value = '';
  });

  // ── Spö & betesvval ──────────────────────────
  let selectedRod  = null;
  let selectedLure = null;

  function renderGearList(containerId, items, emoji, onSelect) {
    const container = document.getElementById(containerId);
    if (!items.length) {
      container.innerHTML = `<p class="text-xs text-muted" style="padding:8px 0">Inga tillagda ännu</p>`;
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="catch-gear-card" data-gear-id="${item.id}">
        ${item.image_url
          ? `<img class="cgc-img" src="${item.image_url}" alt="${item.name}">`
          : `<div class="cgc-emoji">${emoji}</div>`}
        <div class="cgc-name">${item.name}</div>
      </div>`).join('');
    container.querySelectorAll('.catch-gear-card').forEach(card =>
      card.addEventListener('click', () => {
        const id   = card.dataset.gearId;
        const item = items.find(x => x.id === id);
        const same = onSelect(item, card);
        container.querySelectorAll('.catch-gear-card').forEach(c => c.classList.remove('selected'));
        if (!same) card.classList.add('selected');
      }));
  }

  const [{ data: rods }, { data: lures }] = await Promise.all([
    sb.from('rods').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    sb.from('lures').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);

  renderGearList('catch-rod-list', rods ?? [], '🎣', (item, card) => {
    const same = selectedRod?.id === item.id;
    selectedRod = same ? null : item;
    return same;
  });
  renderGearList('catch-lure-list', lures ?? [], '🪝', (item, card) => {
    const same = selectedLure?.id === item.id;
    selectedLure = same ? null : item;
    return same;
  });

  // ── Spara ─────────────────────────────────────
  document.getElementById('btn-save-catch').addEventListener('click', async () => {
    const saveBtn   = document.getElementById('btn-save-catch');
    const successEl = document.getElementById('catch-success-msg');
    const errorEl   = document.getElementById('catch-error-msg');

    const fishName = fishNameInput.value.trim();
    if (!fishName) {
      errorEl.textContent  = 'Ange fiskart.';
      errorEl.style.display = 'block';
      return;
    }

    saveBtn.disabled    = true;
    saveBtn.textContent = 'Sparar…';
    errorEl.style.display = 'none';

    // Ladda upp bild om det finns en (tyst fel – fångsten sparas ändå)
    let imageUrl = null;
    if (catchImageFile) {
      try {
        const ext      = (catchImageFile.name?.split('.').pop() || 'jpg').toLowerCase();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await sb.storage
          .from('catch-images')
          .upload(filePath, catchImageFile, { upsert: true, contentType: catchImageFile.type || 'image/jpeg' });
        if (!uploadErr) {
          const { data: urlData } = sb.storage.from('catch-images').getPublicUrl(filePath);
          imageUrl = urlData?.publicUrl ?? null;
        } else {
          console.warn('Bilduppladdning misslyckades (fångsten sparas utan bild):', uploadErr.message);
        }
      } catch (e) {
        console.warn('Bilduppladdning fel:', e);
      }
    }

    const lengthVal   = document.getElementById('catch-length').value;
    const weightVal   = document.getElementById('catch-weight').value;
    const datetimeVal = document.getElementById('catch-datetime').value;

    const newWeight = weightVal  ? parseFloat(weightVal)  : null;
    const newLength = lengthVal  ? parseFloat(lengthVal)  : null;

    // Hämta PB-data INNAN insert
    let prevMax = { weight: 0, length: 0 };
    if (newWeight || newLength) {
      const { data: prev } = await sb.from('catches')
        .select('weight_g, length_cm')
        .eq('user_id', user.id)
        .eq('fish_name', fishName);
      prevMax.weight = Math.max(0, ...(prev?.map(c => c.weight_g  ?? 0) ?? []));
      prevMax.length = Math.max(0, ...(prev?.map(c => c.length_cm ?? 0) ?? []));
    }

    const { error } = await sb.from('catches').insert({
      user_id:        user.id,
      fish_name:      fishName,
      fish_id:        fish?.id ?? null,
      length_cm:      newLength,
      weight_g:       newWeight,
      caught_at:      datetimeVal ? new Date(datetimeVal).toISOString() : new Date().toISOString(),
      image_url:      imageUrl,
      lake_name:      lake?.name ?? null,
      lake_id:        lake?.id   ?? null,
      rod_id:         selectedRod?.id   ?? null,
      rod_name:       selectedRod?.name ?? null,
      rod_image_url:  selectedRod?.image_url ?? null,
      lure_id:        selectedLure?.id   ?? null,
      lure_name:      selectedLure?.name ?? null,
      lure_image_url: selectedLure?.image_url ?? null,
      weather_temp:   currentWeather?.temp   ?? null,
      weather_wind:   currentWeather?.wind   ?? null,
      weather_precip: currentWeather?.precip ?? null,
      catch_lat:      catchLat,
      catch_lng:      catchLng,
    });

    if (error) {
      const isNoTable = error.message?.includes('relation') || error.code === '42P01';
      errorEl.textContent   = isNoTable
        ? 'Tabellen "catches" saknas – kör SQL-migreringen i Supabase Dashboard.'
        : `Fel: ${error.message}`;
      errorEl.style.display = 'block';
      saveBtn.disabled      = false;
      saveBtn.innerHTML     = '<i data-lucide="save" class="icon"></i> Spara fångst';
      if (window.lucide) lucide.createIcons();
      return;
    }

    // PB-detektering
    const isPbWeight = newWeight && newWeight > prevMax.weight;
    const isPbLength = newLength && newLength > prevMax.length;
    if (isPbWeight || isPbLength) {
      const pbEl = document.getElementById('catch-pb-msg');
      let txt = `🏆 Nytt rekord – ${fishName}!`;
      if (newWeight) txt += `  ${newWeight.toLocaleString('sv-SE')} g`;
      if (newLength) txt += ` · ${newLength} cm`;
      pbEl.textContent     = txt;
      pbEl.style.display   = 'block';
      setTimeout(() => { pbEl.style.display = 'none'; }, 5000);
    }

    successEl.style.display = 'flex';
    saveBtn.classList.remove('btn-pulse');
    setTimeout(() => history.back(), isPbWeight || isPbLength ? 2500 : 1200);
  });
}

// ── Fångstlista & statistik ───────────────────────────────────────
async function initCatchesPage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const skeleton  = document.getElementById('catches-skeleton');
  const content   = document.getElementById('catches-content');
  const emptyEl   = document.getElementById('catches-empty');
  const catchList = document.getElementById('catches-list');

  const { data: catches } = await sb.from('catches')
    .select('*')
    .eq('user_id', user.id)
    .order('caught_at', { ascending: false });

  skeleton.style.display = 'none';

  if (!catches?.length) {
    emptyEl.style.display = 'block';
    if (window.lucide) lucide.createIcons();
    return;
  }

  content.style.display = 'block';

  // ── Rekord per art (spara hela fångst-objektet) ───────────────────
  const recordCatch = {}; // fish_name → bästa fångsten (tyngst, annars längst)
  const byFish      = {};
  catches.forEach(c => {
    byFish[c.fish_name] = (byFish[c.fish_name] ?? 0) + 1;
    const prev = recordCatch[c.fish_name];
    if (!prev ||
        (c.weight_g  ?? 0) > (prev.weight_g  ?? 0) ||
        (!prev.weight_g && (c.length_cm ?? 0) > (prev.length_cm ?? 0))) {
      recordCatch[c.fish_name] = c;
    }
  });

  const recordsRow = document.getElementById('records-row');
  if (recordsRow) {
    recordsRow.innerHTML = Object.entries(recordCatch).map(([name, c]) => {
      const emoji = FISH_EMOJI[Object.keys(FISH_DATA).find(k =>
        catches.find(x => x.fish_name === name && x.fish_id === k)
      )] ?? '🐟';
      const wTxt = c.weight_g  ? `${c.weight_g.toLocaleString('sv-SE')} g` : '—';
      const lTxt = c.length_cm ? `${c.length_cm} cm` : '—';
      return `
        <div class="record-card" data-id="${c.id}"
             style="flex-shrink:0;background:var(--surface);border:1px solid var(--border-soft);
                    border-radius:var(--radius-lg);padding:12px 16px;min-width:130px;text-align:center;
                    cursor:pointer;transition:border-color .15s"
             onmouseenter="this.style.borderColor='var(--accent)'"
             onmouseleave="this.style.borderColor='var(--border-soft)'">
          <div style="font-size:28px;margin-bottom:4px">${emoji}</div>
          <div style="font-weight:700;font-size:.8rem;margin-bottom:6px">${name}</div>
          <div style="font-size:.72rem;color:var(--accent);font-weight:700">🏆 ${wTxt}</div>
          <div style="font-size:.72rem;color:var(--text-3)">${lTxt}</div>
        </div>`;
    }).join('');

    // Klick → öppna detalj-overlay för den aktuella rekord-fångsten
    recordsRow.querySelectorAll('.record-card').forEach(card => {
      card.addEventListener('click', () => {
        const c = catches.find(x => x.id === card.dataset.id);
        if (!c) return;
        const hero = c.image_url
          ? `<img class="detail-img" src="${c.image_url}" alt="${c.fish_name}">`
          : `<div class="detail-emoji-hero">🐟</div>`;
        const dateStr = new Date(c.caught_at).toLocaleDateString('sv-SE',
          { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
        const fields = [
          c.length_cm      && { label: 'Längd',  value: c.length_cm + ' cm' },
          c.weight_g       && { label: 'Vikt',   value: c.weight_g.toLocaleString('sv-SE') + ' g' },
          c.lake_name      && { label: 'Sjö',    value: c.lake_name },
                              { label: 'Datum',  value: dateStr },
          c.rod_name       && { label: 'Spö',    value: c.rod_name },
          c.lure_name      && { label: 'Bete',   value: c.lure_name },
          c.weather_temp != null && { label: 'Väder', value: `${c.weather_temp}°C · ${c.weather_wind ?? '?'} m/s` },
        ].filter(Boolean);
        openDetailOverlay(c.fish_name, hero, fields);
      });
    });
  }

  // ── Chart.js global mörkt tema ────────────────
  if (window.Chart) {
    Chart.defaults.color           = 'rgba(255,255,255,0.55)';
    Chart.defaults.borderColor     = 'rgba(255,255,255,0.08)';
    Chart.defaults.font.family     = "'Space Mono', monospace";
    Chart.defaults.font.size       = 11;
  }

  // ── Månadsdiagram ─────────────────────────────
  const CHART_COLORS = ['#E8701A','#4A9ECA','#5DBB6A','#E8C21A','#CA4A9E'];
  const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
  const year   = new Date().getFullYear();
  const thisYear = catches.filter(c => new Date(c.caught_at).getFullYear() === year);
  const topFish  = Object.entries(byFish).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);

  const monthlyCtx = document.getElementById('chart-monthly');
  if (monthlyCtx && window.Chart) {
    new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: MONTHS,
        datasets: topFish.map((name, i) => ({
          label: name,
          data: Array.from({ length: 12 }, (_, m) =>
            thisYear.filter(c => c.fish_name === name && new Date(c.caught_at).getMonth() === m).length
          ),
          backgroundColor: CHART_COLORS[i] + 'bb',
          borderColor:     CHART_COLORS[i],
          borderWidth: 1,
          borderRadius: 4,
        })),
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } },
        scales: {
          x: { stacked: false, grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }

  // ── Dygnsfördelning ───────────────────────────
  const hourData  = Array(24).fill(0);
  catches.forEach(c => { hourData[new Date(c.caught_at).getHours()]++; });
  const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2,'0'));

  const hourlyCtx = document.getElementById('chart-hourly');
  if (hourlyCtx && window.Chart) {
    new Chart(hourlyCtx, {
      type: 'bar',
      data: {
        labels: hourLabels,
        datasets: [{
          label: 'Fångster',
          data: hourData,
          backgroundColor: '#E8701Abb',
          borderColor: '#E8701A',
          borderWidth: 1,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    });
  }

  // ── Väderkoppling ─────────────────────────────
  const withWeather = catches
    .filter(c => c.weather_temp != null)
    .sort((a, b) => (b.weight_g ?? 0) - (a.weight_g ?? 0))
    .slice(0, 10);
  if (withWeather.length >= 2) {
    const avgTemp = (withWeather.reduce((s,c) => s + c.weather_temp, 0) / withWeather.length).toFixed(1);
    const avgWind = (withWeather.reduce((s,c) => s + (c.weather_wind ?? 0), 0) / withWeather.length).toFixed(1);
    const weatherSec = document.getElementById('weather-stats-section');
    const weatherCnt = document.getElementById('weather-stats-content');
    if (weatherSec && weatherCnt) {
      weatherSec.style.display = 'block';
      weatherCnt.innerHTML = `
        🌡️ Dina toppfångster skedde vid snitt <strong>${avgTemp}°C</strong><br>
        💨 Genomsnittlig vind: <strong>${avgWind} m/s</strong><br>
        📊 Baserat på dina ${withWeather.length} tyngsta fångster`;
    }
  }

  // ── Lista ──────────────────────────────────────
  catchList.innerHTML = catches.map(c => {
    const date = new Date(c.caught_at).toLocaleDateString('sv-SE', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const lengthTxt = c.length_cm ? `${c.length_cm} cm` : null;
    const weightTxt = c.weight_g  ? `${c.weight_g} g`   : null;
    const meta = [lengthTxt, weightTxt, c.lake_name].filter(Boolean);

    const thumb = c.image_url
      ? `<img class="catch-img" src="${c.image_url}" alt="${c.fish_name}">`
      : `<div class="catch-emoji-thumb">🐟</div>`;

    return `
      <div class="catch-card" data-id="${c.id}">
        ${thumb}
        <div class="catch-info">
          <div class="catch-fish-name">${c.fish_name}</div>
          <div class="catch-meta">
            ${meta.map(m => `<span class="catch-meta-item">${m}</span>`).join('')}
          </div>
          <div class="catch-date">${date}</div>
          ${c.weather_temp != null ? `<div style="font-size:.7rem;color:var(--text-3);margin-top:2px">🌡 ${c.weather_temp}°C · 💨 ${c.weather_wind ?? '?'} m/s</div>` : ''}
        </div>
        <button class="btn-del-catch" data-id="${c.id}"
                style="background:none;border:none;color:var(--text-3);cursor:pointer;padding:8px;flex-shrink:0;transition:color .15s"
                title="Ta bort fångst">
          <i data-lucide="trash-2" style="width:16px;height:16px;stroke:currentColor"></i>
        </button>
      </div>`;
  }).join('');

  // Klick på kort → detaljvy
  catchList.querySelectorAll('.catch-card').forEach(card =>
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-del-catch')) return;
      const c = catches.find(x => x.id === card.dataset.id);
      if (!c) return;
      const hero = c.image_url
        ? `<img class="detail-img" src="${c.image_url}" alt="${c.fish_name}">`
        : `<div class="detail-emoji-hero">🐟</div>`;
      const dateStr = new Date(c.caught_at).toLocaleDateString('sv-SE',
        { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
      const fields = [
        c.length_cm  && { label: 'Längd',       value: c.length_cm + ' cm' },
        c.weight_g   && { label: 'Vikt',        value: c.weight_g  + ' g'  },
        c.lake_name  && { label: 'Sjö',         value: c.lake_name          },
                        { label: 'Datum & tid', value: dateStr              },
        c.rod_name       && { label: 'Spö',     value: c.rod_name                    },
        c.lure_name      && { label: 'Bete',    value: c.lure_name                   },
        c.weather_temp != null && { label: 'Väder', value: `${c.weather_temp}°C · ${c.weather_wind ?? '?'} m/s vind` },
        c.catch_lat    != null && { label: 'Plats', value: `<a href="https://www.openstreetmap.org/?mlat=${c.catch_lat}&mlon=${c.catch_lng}&zoom=16" target="_blank" style="color:var(--accent);text-decoration:none">📍 Visa på karta</a>` },
      ].filter(Boolean);
      openDetailOverlay(c.fish_name, hero, fields);
    }));

  // Radera med bekräftelse
  catchList.querySelectorAll('.btn-del-catch').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id   = btn.dataset.id;
      const card = catchList.querySelector(`.catch-card[data-id="${id}"]`);
      const name = card?.querySelector('.catch-fish-name')?.textContent ?? 'fångsten';

      if (!confirm(`Vill du verkligen ta bort ${name}?`)) return;

      card.style.transition = 'opacity .2s, transform .2s';
      card.style.opacity    = '0';
      card.style.transform  = 'translateX(20px)';

      await sb.from('catches').delete().eq('id', id);
      setTimeout(() => location.reload(), 220);
    }));

  if (window.lucide) lucide.createIcons();
}

// ── Knapp i session.html: Navigera till catch.html ────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btnRegister = document.getElementById('btn-register-catch');
  if (btnRegister) {
    btnRegister.addEventListener('click', () => {
      location.href = 'catch.html';
    });
  }

  // Avsluta tur-knapp
  const btnEnd = document.getElementById('btn-end-session');
  if (btnEnd) {
    btnEnd.addEventListener('click', () => { location.href = 'end-session.html'; });
  }

  // Djupkarta lightbox – stäng
  const lb    = document.getElementById('map-lightbox');
  const close = document.getElementById('map-lightbox-close');
  if (lb && close) {
    const closeLb = () => {
      lb.style.display = 'none';
      document.body.style.overflow = '';
      // Återställ viewport – blockera zoom på bassidan
      document.querySelector('meta[name=viewport]').content =
        'width=device-width, initial-scale=1, maximum-scale=1';
    };
    close.addEventListener('click', closeLb);
    lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });
  }
});

// ── Avsluta tur ───────────────────────────────────────────────────
async function initEndSessionPage() {
  const sb   = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const lake = JSON.parse(sessionStorage.getItem('selectedLake') || 'null');
  const fish = JSON.parse(sessionStorage.getItem('selectedFish') || 'null');

  document.getElementById('end-lake-name').textContent = lake?.name ?? 'Okänd sjö';
  document.getElementById('end-fish-name').textContent = fish?.name ?? '';
  document.getElementById('end-fish-emoji').textContent = FISH_EMOJI[fish?.id] ?? '🐟';
  document.getElementById('end-session-meta').textContent =
    lake?.name ? `${lake.name} · ${new Date().toLocaleDateString('sv-SE')}` : '';

  async function saveAndLeave() {
    const note = document.getElementById('end-note').value.trim();
    if (note && lake?.id) {
      await sb.from('lake_notes').insert({ user_id: user.id, lake_id: lake.id, note });
      document.getElementById('end-success').style.display = 'flex';
      await new Promise(r => setTimeout(r, 800));
    }
    location.href = 'history.html';
  }

  document.getElementById('btn-save-end').addEventListener('click', saveAndLeave);
  document.getElementById('btn-skip-end').addEventListener('click', () => { location.href = 'history.html'; });
}
