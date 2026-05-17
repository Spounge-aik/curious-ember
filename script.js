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
  const MIN_OBS   = 5;
  const RADII     = [0.02, 0.04, 0.07]; // börja litet (~2km), utöka vid behov
  const YEAR_FROM = new Date().getFullYear() - 10; // senaste 10 åren
  const YEAR_TO   = new Date().getFullYear();

  for (const deg of RADII) {
    const counts = {};

    // Hämta observationsantal per art individuellt → exakt count per art
    await Promise.all(
      Object.entries(GBIF_KEYS).map(async ([fishId, gbifKey]) => {
        try {
          const url = `https://api.gbif.org/v1/occurrence/search?taxonKey=${gbifKey}` +
            `&decimalLatitude=${lat-deg},${lat+deg}` +
            `&decimalLongitude=${lng-deg},${lng+deg}` +
            `&year=${YEAR_FROM},${YEAR_TO}` +
            `&country=SE&limit=0&hasCoordinate=true`;
          const r = await fetch(url);
          const d = await r.json();
          if ((d.count ?? 0) >= MIN_OBS) counts[fishId] = d.count;
        } catch { /* nätverksfel – skippa arten */ }
      })
    );

    // Om vi hittade minst 3 arter i denna radie → nöjda
    if (Object.keys(counts).length >= 3) {
      const maxCount = Math.max(...Object.values(counts));
      return Object.entries(counts)
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
    }
  }

  // Fallback: inga fynd ens vid 7km de senaste 10 åren
  return [];
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
  {id:'dagarn',name:'Dagarn',lat:59.9082,lng:15.7035,county:'Västmanland'},
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
  if (page === 'library.html') return initLibrary();
  if (page === 'lake.html')    return initLakePage();
  if (page === 'session.html') return initSessionPage();
  if (page === 'history.html') return initHistoryPage();
  initHomePage();
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
      allFish = await fetchFishForLake(lake.lat, lake.lng);
    } catch { allFish = []; }

    if (!allFish.length) allFish = [
      { id:'gadda',   name:'Gädda',   tag:'Vanlig' },
      { id:'abborre', name:'Abborre', tag:'Vanlig' },
      { id:'gos',     name:'Gösen',   tag:'Vanlig' },
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
        selectedFish = selectedFish?.id === card.dataset.fid
          ? null
          : allFish.find(f => f.id === card.dataset.fid);
        renderFishGrid();
        if (selectedFish) {
          setTimeout(() => selectFish(selectedFish), 180);
        }
      }));
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
               data-lake='${JSON.stringify({id:s.lake_id,name:s.lake_name,lat:0,lng:0,county:""})}'
               data-lid="${s.lake_id}" data-fid="${s.target_fish_id}">
            <div style="font-weight:700;font-size:.9rem">${s.lake_name}</div>
            <div class="sh-fish-row">
              <span>${FISH_EMOJI[s.target_fish_id] ?? '🐟'}</span>
              <span style="font-size:.8rem;color:var(--text-2)">${s.target_fish_name}</span>
            </div>
            <div class="text-xs" style="color:var(--text-3);margin-top:4px">${date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <span class="sh-badge session-nav" style="cursor:pointer"
                  data-lake='${JSON.stringify({id:s.lake_id,name:s.lake_name,lat:0,lng:0,county:""})}'
                  data-lid="${s.lake_id}" data-fid="${s.target_fish_id}">→</span>
            <button class="btn-delete-session" data-id="${s.id}"
                    style="background:var(--error-dim);border:1px solid rgba(248,113,113,.2);border-radius:10px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;color:var(--error);transition:all .15s"
                    title="Radera session">
              <i data-lucide="trash-2" style="width:15px;height:15px;stroke:currentColor"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    // Navigera till session
    list.querySelectorAll('.session-nav').forEach(el =>
      el.addEventListener('click', () => {
        sessionStorage.setItem('selectedLake', el.dataset.lake);
        location.href = `session.html?lakeId=${el.dataset.lid}&fishId=${el.dataset.fid}`;
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
