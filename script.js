import { renderNav }              from './components/nav.js';
import { renderHeader }           from './components/header.js';
import { initAuth }               from './components/auth.js';
import { initMap }                from './components/map.js';
import { renderRecommendations }  from './components/recommendations.js';
import { initLibrary }            from './components/library.js';

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
};
const KEY_TO_ID = Object.fromEntries(Object.entries(GBIF_KEYS).map(([id,k])=>[k,id]));

const FISH_EMOJI = {
  gadda:'🐟', abborre:'🐠', gos:'🐡', lake:'🦑', lax:'🐟',
  oring:'🐟', rodding:'🐟', harr:'🐟', karp:'🐡', rudor:'🐠',
  braxen:'🐟', id:'🐟', asp:'🐟', sik:'🐟', mort:'🐟', sarv:'🐟', bjorkna:'🐟',
};

const FISH_INFO = {
  gadda:   { name:'Gädda',   desc:'Stor rovfisk',            tag:'Vanlig' },
  abborre: { name:'Abborre', desc:'Vanlig i hela Sverige',   tag:'Vanlig' },
  gos:     { name:'Gösen',   desc:'Djuplevande rovfisk',     tag:'Vanlig' },
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
  bjorkna: { name:'Björkna', desc:'Vanlig kustsjö',         tag:'Vanlig' },
};

async function fetchFishForLake(lat, lng) {
  const deg = 0.07;
  const params = new URLSearchParams({
    decimalLatitude: `${lat-deg},${lat+deg}`,
    decimalLongitude:`${lng-deg},${lng+deg}`,
    country:'SE', limit:'300', hasCoordinate:'true', occurrenceStatus:'PRESENT',
  });
  Object.values(GBIF_KEYS).forEach(k => params.append('taxonKey', k));
  const r    = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`);
  const data = await r.json();
  const found = new Set();
  for (const occ of data.results ?? []) {
    const id = KEY_TO_ID[occ.speciesKey] ?? KEY_TO_ID[occ.taxonKey];
    if (id) found.add(id);
  }
  return [...found].map(id => ({ id, ...FISH_INFO[id] })).filter(f => f.name);
}

// ── Sjödata ───────────────────────────────────────────────────────
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

renderNav();
if (document.getElementById('app-header')) renderHeader();

// Ladda Supabase SDK dynamiskt
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
  if (page === 'history.html') return initHistoryPage();
  initHomePage();
}

// ── Hemsida ───────────────────────────────────────────────────────
function initHomePage() {
  let selectedLake = null;
  let allLakes     = [];

  const gpsBtn       = document.getElementById('btn-gps');
  const searchToggle = document.getElementById('btn-search-toggle');
  const searchBox    = document.getElementById('search-box');
  const searchInput  = document.getElementById('search-input');
  const statusMsg    = document.getElementById('status-msg');
  const mapDiv       = document.getElementById('map');
  const lakeSection  = document.getElementById('lake-section');
  const lakeList     = document.getElementById('lake-list');
  const ctaWrap      = document.getElementById('cta-wrap');
  const startBtn     = document.getElementById('btn-start');
  const emptyState   = document.getElementById('empty-state');
  const listTitle    = document.getElementById('lake-list-title');
  const gpsSkeleton  = document.getElementById('gps-skeleton');
  const gpsWidget    = document.getElementById('gps-widget');
  const lakeSkeleton = document.getElementById('lake-skeleton');

  function setStatus(msg) {
    statusMsg.textContent    = msg;
    statusMsg.style.display  = msg ? 'block' : 'none';
  }

  function showSkeletons() {
    emptyState.style.display  = 'none';
    gpsSkeleton.style.display = 'block';
    lakeSkeleton.style.display = 'block';
  }

  function renderLakes(lakes, isSearch = false) {
    allLakes = lakes;
    gpsSkeleton.style.display  = 'none';
    lakeSkeleton.style.display = 'none';
    emptyState.style.display   = 'none';
    mapDiv.style.display       = 'block';
    lakeSection.style.display  = 'block';
    listTitle.textContent      = isSearch ? 'Sökresultat' : 'Närmaste sjöar';

    // GPS-widget: visa närmaste sjö
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
        ${selectedLake?.id === l.id ? `<span style="color:var(--accent);font-size:1.1rem">✓</span>` : ''}
      </button>`).join('');

    lakeList.querySelectorAll('.lake-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const lake = lakes.find(l => l.id === btn.dataset.id);
        if (lake) selectLake(lake, lakes);
      }));

    const center = lakes[0] ? [lakes[0].lat, lakes[0].lng] : [62.5, 16];
    initMap(center, lakes, lake => selectLake(lake, lakes));
  }

  function selectLake(lake, lakes) {
    selectedLake = lake;
    renderLakes(lakes, listTitle.textContent === 'Sökresultat');
    ctaWrap.style.display = 'block';
    startBtn.textContent  = `🎣 Starta fiske vid ${lake.name}`;
    sessionStorage.setItem('selectedLake', JSON.stringify(lake));
  }

  gpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus('GPS stöds ej i din webbläsare.'); return; }
    showSkeletons();
    setStatus('');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        renderLakes(getNearby(lat, lng));
      },
      () => {
        gpsSkeleton.style.display  = 'none';
        lakeSkeleton.style.display = 'none';
        emptyState.style.display   = 'block';
        setStatus('Kunde inte hämta plats. Kontrollera GPS-behörighet.');
      }
    );
  });

  searchToggle.addEventListener('click', () => {
    const open = searchBox.style.display === 'none';
    searchBox.style.display = open ? 'block' : 'none';
    if (open) searchInput.focus();
  });

  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = searchInput.value.trim();
      if (q.length < 2) return;
      renderLakes(searchLakes(q), true);
    }, 280);
  });

  startBtn.addEventListener('click', () => {
    if (!selectedLake) return;
    location.href = `lake.html?id=${selectedLake.id}`;
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
  fishSkel.style.display = 'flex';

  let fish = [];
  try {
    fish = await fetchFishForLake(lake.lat, lake.lng);
    srcBadge.style.display = fish.length ? 'inline-flex' : 'none';
  } catch { fish = []; }

  if (!fish.length) fish = [
    {id:'gadda',name:'Gädda',tag:'Vanlig'},{id:'abborre',name:'Abborre',tag:'Vanlig'},{id:'gos',name:'Gösen',tag:'Vanlig'}
  ];

  countTxt.textContent    = `🐟 ${fish.length} fiskarter registrerade`;
  fishSkel.style.display = 'none';
  fishGrid.style.display = 'grid';

  function renderFish() {
    fishGrid.innerHTML = fish.map(f => `
      <div class="fish-card ${selectedFish?.id === f.id ? 'selected' : ''}" data-id="${f.id}"
           style="display:flex;flex-direction:column;align-items:center;padding:18px 12px;cursor:pointer;border-radius:var(--radius-lg);background:var(--surface);border:1.5px solid ${selectedFish?.id===f.id?'var(--accent)':'var(--border-soft)'};transition:all .15s">
        <div style="font-size:34px;margin-bottom:8px">${FISH_EMOJI[f.id] ?? '🐟'}</div>
        <div style="font-weight:700;font-size:.85rem;color:${selectedFish?.id===f.id?'var(--accent)':'var(--text)'}">${f.name}</div>
        <div style="font-size:.65rem;margin-top:4px;background:var(--surface-2);color:var(--text-3);border-radius:var(--radius-full);padding:2px 8px">${f.tag ?? 'Vanlig'}</div>
      </div>`).join('');

    fishGrid.querySelectorAll('.fish-card').forEach(card =>
      card.addEventListener('click', () => {
        selectedFish = selectedFish?.id === card.dataset.id
          ? null
          : fish.find(x => x.id === card.dataset.id);
        renderFish();
        if (selectedFish) {
          selWrap.style.display = 'block';
          selName.textContent   = selectedFish.name;
          selEmoji.textContent  = FISH_EMOJI[selectedFish.id] ?? '🐟';
        } else {
          selWrap.style.display = 'none';
        }
      }));
  }
  renderFish();

  startBtn.addEventListener('click', () => {
    if (!selectedFish) return;

    // Knapp-animation → fishing state
    startBtn.textContent = '🟢 Fiske pågår…';
    startBtn.classList.remove('btn-pulse');
    startBtn.classList.add('btn-fishing');

    sessionStorage.setItem('selectedFish', JSON.stringify(selectedFish));
    setTimeout(() => location.href = `session.html?lakeId=${lake.id}&fishId=${selectedFish.id}`, 600);
  });
}

// ── Sessionssida ──────────────────────────────────────────────────
async function initSessionPage() {
  const params = new URLSearchParams(location.search);
  const lake   = JSON.parse(sessionStorage.getItem('selectedLake') || 'null')
    ?? SEED_LAKES.find(l => l.id === params.get('lakeId'));
  const fish   = JSON.parse(sessionStorage.getItem('selectedFish') || 'null');

  document.getElementById('session-lake').textContent       = lake?.name ?? 'Okänd sjö';
  document.getElementById('session-fish').textContent       = fish?.name ?? 'Okänd fisk';
  document.getElementById('session-fish-emoji').textContent = FISH_EMOJI[fish?.id] ?? '🐟';
  document.getElementById('session-time').textContent       =
    new Date().toLocaleDateString('sv-SE',{weekday:'long',hour:'2-digit',minute:'2-digit'});

  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  // Spara session
  sb.from('sessions').insert({
    user_id:          user.id,
    lake_id:          lake?.id ?? 'unknown',
    lake_name:        lake?.name ?? '?',
    target_fish_id:   fish?.id ?? 'unknown',
    target_fish_name: fish?.name ?? '?',
  }).then(() => {});

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
    renderRecommendations(await res.json());
  } catch {
    document.getElementById('loading-state').style.display = 'none';
    const err = document.getElementById('error-state');
    err.style.display  = 'block';
    err.textContent    = 'Kunde inte hämta rekommendationer. Kontrollera din anslutning.';
  }
}

// ── Historik ──────────────────────────────────────────────────────
async function initHistoryPage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const { data: sessions } = await sb.from('sessions')
    .select('*').eq('user_id', user.id)
    .order('started_at', { ascending: false }).limit(30);

  document.getElementById('hist-skeleton').style.display = 'none';

  if (!sessions?.length) {
    document.getElementById('hist-empty').style.display = 'block';
    return;
  }

  document.getElementById('hist-content').style.display = 'block';
  document.getElementById('hist-list').innerHTML = sessions.map(s => {
    const date = new Date(s.started_at).toLocaleDateString('sv-SE',
      {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
    return `
      <div class="session-hist-card card-interactive"
           onclick="sessionStorage.setItem('selectedLake',JSON.stringify({id:'${s.lake_id}',name:'${s.lake_name}',lat:0,lng:0,county:''}));location.href='session.html?lakeId=${s.lake_id}&fishId=${s.target_fish_id}'">
        <div>
          <div style="font-weight:700;font-size:.9rem">${s.lake_name}</div>
          <div class="sh-fish-row">
            <span>${FISH_EMOJI[s.target_fish_id] ?? '🐟'}</span>
            <span style="font-size:.8rem;color:var(--text-2)">${s.target_fish_name}</span>
          </div>
          <div class="text-xs" style="color:var(--text-3);margin-top:4px">${date}</div>
        </div>
        <span class="sh-badge">→</span>
      </div>`;
  }).join('');
}
