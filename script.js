import { renderNav }          from './components/nav.js';
import { initAuth }           from './components/auth.js';
import { initMap }            from './components/map.js';
import { renderFishGrid, setupFishGridCallback } from './components/fishGrid.js';
import { initLibrary }        from './components/library.js';
import { renderRecommendations } from './components/recommendations.js';

// ── Supabase ────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://mixrkpghedwpjrrlgrxe.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_M4v29oq3U2RjNVOnWsqlOQ_Y63pTD7c';

let _sb = null;
export function getSupabase() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return _sb;
}

// ── GBIF fisknycklar ────────────────────────────────────────────
const GBIF_KEYS = {
  gadda:2346633, abborre:8140485, gos:2382155, lake:2415460,
  lax:7595433, oring:8215487, rodding:4284021, harr:5203999,
  mort:2359706, braxen:9809222, rudor:2366645, id:4409643,
  asp:5851603, sik:2351211, bjorkna:2359471, sarv:2362635, karp:4286975,
};
const KEY_TO_ID = Object.fromEntries(Object.entries(GBIF_KEYS).map(([id,k])=>[k,id]));

const FISH_INFO = {
  gadda:   { name:'Gädda',   desc:'Stor rovfisk, finns i de flesta svenska sjöar' },
  abborre: { name:'Abborre', desc:'Vanlig i svenska sjöar och åar' },
  gos:     { name:'Gösen',   desc:'Rovfisk som gärna håller till i djupare vatten' },
  lake:    { name:'Lake',    desc:'Bottenfisk, aktiv på vintern' },
  lax:     { name:'Lax',     desc:'Stor sportfisk i rinnande vatten' },
  oring:   { name:'Öring',   desc:'Kräver syrerikt kallt vatten' },
  rodding: { name:'Rödding', desc:'Kräsen fisk i kalla och djupa sjöar' },
  harr:    { name:'Harr',    desc:'Vacker sportfisk i strömmande vatten' },
  karp:    { name:'Karp',    desc:'Stor fredfisk, populär bland sportfiskare' },
  rudor:   { name:'Ruda',    desc:'Tålig fredfisk i grunda vatten' },
  braxen:  { name:'Braxen',  desc:'Fredfisk som trivs i lugnflytande vatten' },
  id:      { name:'Id',      desc:'Silverfärgad fredfisk' },
  asp:     { name:'Asp',     desc:'Rovfisk bland fredfiskarna' },
  sik:     { name:'Sik',     desc:'Populär fisk i norra Sverige' },
  mort:    { name:'Mört',    desc:'En av Sveriges vanligaste fiskarter' },
  sarv:    { name:'Sarv',    desc:'Vanlig i grunda sjöar med rik vegetation' },
  bjorkna: { name:'Björkna', desc:'Fredfisk, vanlig i Bohuslänska sjöar' },
};

async function fetchFishForLake(lat, lng) {
  const deg = 0.07;
  const keys = Object.values(GBIF_KEYS);
  const params = new URLSearchParams({
    decimalLatitude:  `${lat-deg},${lat+deg}`,
    decimalLongitude: `${lng-deg},${lng+deg}`,
    country: 'SE', limit: '300', hasCoordinate: 'true', occurrenceStatus: 'PRESENT',
  });
  keys.forEach(k => params.append('taxonKey', k));
  const r = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`);
  const data = await r.json();
  const found = new Set();
  for (const occ of data.results ?? []) {
    const id = KEY_TO_ID[occ.speciesKey] ?? KEY_TO_ID[occ.taxonKey];
    if (id) found.add(id);
  }
  return [...found].map(id => ({ id, ...FISH_INFO[id] })).filter(f => f.name);
}

// ── Sjödata (seed) ──────────────────────────────────────────────
const SEED_LAKES = [
  {id:'trekanten',name:'Trekanten',lat:59.308,lng:18.005,county:'Stockholm'},
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
];

function haversine(lat1,lng1,lat2,lng2){
  const R=6371,dL=((lat2-lat1)*Math.PI)/180,dG=((lng2-lng1)*Math.PI)/180;
  const a=Math.sin(dL/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dG/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}
function getNearby(lat,lng){
  return SEED_LAKES.map(l=>({...l,distance_km:haversine(lat,lng,l.lat,l.lng)}))
    .sort((a,b)=>a.distance_km-b.distance_km).slice(0,12);
}
function searchLakes(q){
  return SEED_LAKES.filter(l=>l.name.toLowerCase().includes(q.toLowerCase()));
}

// ── Router ──────────────────────────────────────────────────────
const page = location.pathname.split('/').pop() || 'index.html';
renderNav();

// Ladda Supabase CDN dynamiskt
const sbScript = document.createElement('script');
sbScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
sbScript.onload = () => {
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  initPage();
};
document.head.appendChild(sbScript);

function initPage() {
  if (page === 'auth.html')    return initAuth();
  if (page === 'library.html') return initLibrary();
  if (page === 'lake.html')    return initLakePage();
  if (page === 'session.html') return initSessionPage();
  initHomePage();
}

// ── Hemsida ─────────────────────────────────────────────────────
function initHomePage() {
  let selectedLake = null;
  let showSearch   = false;

  const gpsBtn     = document.getElementById('btn-gps');
  const searchToggle = document.getElementById('btn-search-toggle');
  const searchBox  = document.getElementById('search-box');
  const searchInput= document.getElementById('search-input');
  const statusMsg  = document.getElementById('status-msg');
  const mapDiv     = document.getElementById('map');
  const lakeSection= document.getElementById('lake-section');
  const lakeList   = document.getElementById('lake-list');
  const ctaWrap    = document.getElementById('cta-wrap');
  const startBtn   = document.getElementById('btn-start');
  const emptyState = document.getElementById('empty-state');
  const listTitle  = document.getElementById('lake-list-title');

  function setStatus(msg) {
    statusMsg.textContent = msg;
    statusMsg.style.display = msg ? 'block' : 'none';
  }

  function renderLakes(lakes) {
    emptyState.style.display = 'none';
    mapDiv.style.display  = 'block';
    lakeSection.style.display = 'block';
    lakeList.innerHTML = lakes.map(l => `
      <button class="card card-body lake-btn" data-id="${l.id}"
        style="text-align:left;width:100%;cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:all .15s;border:1.5px solid ${selectedLake?.id===l.id?'#0284c7':'#f3f4f6'};background:${selectedLake?.id===l.id?'#e0f2fe':'#fff'}">
        <div>
          <p style="font-weight:600;${selectedLake?.id===l.id?'color:#075985':''}">${l.name}</p>
          <p style="font-size:12px;color:${selectedLake?.id===l.id?'#0284c7':'#9ca3af'}">${l.county}${l.distance_km!=null?' · '+l.distance_km+' km':''}</p>
        </div>
        ${selectedLake?.id===l.id?'<span style="color:#0284c7">✓</span>':''}
      </button>`).join('');
    lakeList.querySelectorAll('.lake-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedLake = lakes.find(l => l.id === btn.dataset.id);
        renderLakes(lakes);
        ctaWrap.style.display = 'block';
        startBtn.textContent = `🎣 Starta fiske vid ${selectedLake.name}`;
      });
    });
    const center = lakes[0] ? [lakes[0].lat, lakes[0].lng] : [62.5, 16];
    initMap(center, lakes, lake => {
      selectedLake = lake;
      renderLakes(lakes);
      ctaWrap.style.display = 'block';
      startBtn.textContent = `🎣 Starta fiske vid ${selectedLake.name}`;
    });
  }

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus('GPS stöds ej.'); return; }
    setStatus('Lokaliserar dig…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setStatus('');
      listTitle.textContent = 'Närmaste sjöar';
      renderLakes(getNearby(lat, lng));
    }, () => setStatus('Kunde inte hämta plats. Kontrollera GPS-behörighet.'));
  });

  searchToggle.addEventListener('click', () => {
    showSearch = !showSearch;
    searchBox.style.display = showSearch ? 'block' : 'none';
    if (showSearch) searchInput.focus();
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = searchInput.value.trim();
      if (q.length < 2) return;
      listTitle.textContent = 'Sökresultat';
      renderLakes(searchLakes(q));
    }, 300);
  });

  startBtn.addEventListener('click', () => {
    if (!selectedLake) return;
    sessionStorage.setItem('selectedLake', JSON.stringify(selectedLake));
    location.href = `lake.html?id=${selectedLake.id}`;
  });
}

// ── Sjösida ─────────────────────────────────────────────────────
async function initLakePage() {
  const params = new URLSearchParams(location.search);
  const lakeId = params.get('id');
  const lake   = JSON.parse(sessionStorage.getItem('selectedLake') || 'null')
    ?? SEED_LAKES.find(l => l.id === lakeId);

  if (!lake) { document.getElementById('lake-name').textContent = 'Sjön hittades inte'; return; }

  document.getElementById('lake-name').textContent   = lake.name;
  document.getElementById('lake-county').textContent = lake.county;

  let selectedFish = null;
  const grid    = document.getElementById('fish-grid');
  const selWrap = document.getElementById('selected-wrap');
  const selName = document.getElementById('selected-fish-name');
  const startBtn= document.getElementById('btn-start');
  const countTxt= document.getElementById('fish-count-text');
  const srcBadge= document.getElementById('source-badge');

  // Hämta fisk från GBIF
  let fish = [];
  try {
    fish = await fetchFishForLake(lake.lat, lake.lng);
    srcBadge.style.display = fish.length ? 'inline' : 'none';
  } catch { fish = []; }

  if (!fish.length) fish = [
    {id:'gadda',name:'Gädda',desc:''},{id:'abborre',name:'Abborre',desc:''},{id:'gos',name:'Gösen',desc:''}
  ];

  countTxt.textContent = `🐟 ${fish.length} fiskarter registrerade`;

  setupFishGridCallback(fish, f => {
    selectedFish = selectedFish?.id === f.id ? null : f;
    grid.innerHTML = renderFishGrid(fish, null, selectedFish?.id);
    if (selectedFish) {
      selWrap.style.display = 'block';
      selName.textContent   = selectedFish.name;
    } else {
      selWrap.style.display = 'none';
    }
  });
  grid.innerHTML = renderFishGrid(fish, null, null);

  startBtn.addEventListener('click', () => {
    if (!selectedFish) return;
    sessionStorage.setItem('selectedFish', JSON.stringify(selectedFish));
    location.href = `session.html?lakeId=${lake.id}&fishId=${selectedFish.id}`;
  });
}

// ── Sessionssida ────────────────────────────────────────────────
async function initSessionPage() {
  const params   = new URLSearchParams(location.search);
  const lake     = JSON.parse(sessionStorage.getItem('selectedLake') || 'null')
    ?? SEED_LAKES.find(l => l.id === params.get('lakeId'));
  const fish     = JSON.parse(sessionStorage.getItem('selectedFish') || 'null');

  document.getElementById('session-lake').textContent = lake?.name ?? 'Okänd sjö';
  document.getElementById('session-fish').textContent = fish?.name ?? 'Okänd fisk';
  document.getElementById('session-time').textContent = new Date().toLocaleDateString('sv-SE',
    {weekday:'long',hour:'2-digit',minute:'2-digit'});

  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const [{ data: rods }, { data: lures }] = await Promise.all([
    sb.from('rods').select('*').eq('user_id', user.id),
    sb.from('lures').select('*').eq('user_id', user.id),
  ]);

  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lakeName: lake?.name, fishName: fish?.name,
        rods: rods ?? [], lures: lures ?? [],
      }),
    });
    if (res.status === 401) { location.href = 'auth.html'; return; }
    const rec = await res.json();
    renderRecommendations(rec);
  } catch {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display   = 'block';
    document.getElementById('error-state').textContent     = 'Kunde inte hämta rekommendationer.';
  }
}
