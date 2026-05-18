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
// cloudPref: 'cloudy' | 'sunny' | 'neutral'
// pressureMult: hur känslig arten är för lufttrycksförändringar (1.0 = standard)
const FISH_DATA = {
  gadda:    { season:'Vår & tidig höst',   time:'Gryning & förmiddag',   optTemp:[4,16],  goodWind:[0,5], cloudPref:'sunny',   pressureMult:2.0 },
  abborre:  { season:'Sommar & höst',       time:'Gryning & skymning',    optTemp:[12,22], goodWind:[0,6], cloudPref:'neutral', pressureMult:1.5 },
  gos:      { season:'Sommar',              time:'Natt & tidig morgon',   optTemp:[18,25], goodWind:[0,4], cloudPref:'cloudy',  pressureMult:1.0 },
  lake:     { season:'Vinter & vår',        time:'Natt',                  optTemp:[0,10],  goodWind:[0,5], cloudPref:'cloudy',  pressureMult:0.5 },
  lax:      { season:'Vår & höst',          time:'Tidig morgon',          optTemp:[6,14],  goodWind:[1,6], cloudPref:'cloudy',  pressureMult:1.0 },
  oring:    { season:'Vår & höst',          time:'Gryning & kväll',       optTemp:[6,16],  goodWind:[1,5], cloudPref:'cloudy',  pressureMult:1.0 },
  rodding:  { season:'Vår & höst',          time:'Morgon & kväll',        optTemp:[4,14],  goodWind:[0,4], cloudPref:'cloudy',  pressureMult:0.8 },
  harr:     { season:'Vår & tidig sommar',  time:'Morgon & kväll',        optTemp:[8,18],  goodWind:[0,4], cloudPref:'neutral', pressureMult:1.0 },
  regnbage: { season:'Hela året',           time:'Morgon & kväll',        optTemp:[8,18],  goodWind:[0,5], cloudPref:'neutral', pressureMult:1.0 },
  mort:     { season:'Sommar',              time:'Förmiddag & kväll',     optTemp:[15,24], goodWind:[0,5], cloudPref:'neutral', pressureMult:0.7 },
  braxen:   { season:'Sommar',              time:'Tidig morgon & kväll',  optTemp:[16,24], goodWind:[0,4], cloudPref:'neutral', pressureMult:1.0 },
  karp:     { season:'Högsommar',           time:'Dag',                   optTemp:[18,26], goodWind:[0,3], cloudPref:'sunny',   pressureMult:1.5 },
  rudor:    { season:'Sommar',              time:'Förmiddag',             optTemp:[18,26], goodWind:[0,4], cloudPref:'sunny',   pressureMult:0.8 },
  id:       { season:'Vår & sommar',        time:'Morgon & kväll',        optTemp:[10,20], goodWind:[0,5], cloudPref:'neutral', pressureMult:1.0 },
  asp:      { season:'Vår & tidig sommar',  time:'Morgon',                optTemp:[12,20], goodWind:[0,5], cloudPref:'neutral', pressureMult:1.0 },
  sik:      { season:'Höst & vinter',       time:'Morgon & kväll',        optTemp:[4,12],  goodWind:[0,5], cloudPref:'neutral', pressureMult:0.8 },
  bjorkna:  { season:'Sommar',              time:'Förmiddag',             optTemp:[16,24], goodWind:[0,4], cloudPref:'neutral', pressureMult:0.7 },
  sarv:     { season:'Sommar',              time:'Förmiddag',             optTemp:[16,24], goodWind:[0,4], cloudPref:'neutral', pressureMult:0.7 },
};

// ── Viktspann per art [min, max, sliderMax] i gram ────────────────
const FISH_WEIGHT_GUIDE = {
  gadda:    { min: 800,  max: 4000,  sliderMax: 15000 },
  abborre:  { min: 100,  max: 600,   sliderMax: 2000  },
  gos:      { min: 400,  max: 2500,  sliderMax: 8000  },
  lake:     { min: 300,  max: 1500,  sliderMax: 5000  },
  lax:      { min: 1500, max: 6000,  sliderMax: 20000 },
  oring:    { min: 300,  max: 2000,  sliderMax: 10000 },
  rodding:  { min: 200,  max: 1200,  sliderMax: 4000  },
  harr:     { min: 150,  max: 800,   sliderMax: 2500  },
  regnbage: { min: 200,  max: 1500,  sliderMax: 5000  },
  mort:     { min: 50,   max: 300,   sliderMax: 600   },
  braxen:   { min: 300,  max: 2000,  sliderMax: 5000  },
  karp:     { min: 2000, max: 8000,  sliderMax: 20000 },
  rudor:    { min: 100,  max: 500,   sliderMax: 1500  },
  id:       { min: 300,  max: 1500,  sliderMax: 4000  },
  asp:      { min: 300,  max: 1500,  sliderMax: 4000  },
  sik:      { min: 200,  max: 1000,  sliderMax: 3000  },
  bjorkna:  { min: 50,   max: 300,   sliderMax: 800   },
  sarv:     { min: 50,   max: 300,   sliderMax: 600   },
};

const CLARITY_LABELS = {
  clear:          { label: '💎 Klart',         tip: 'Naturfärgade beten (silver, grön, brun)' },
  slightly_murky: { label: '🌊 Lätt grumligt', tip: 'Halvljusa färger (orange, perch, chartreuse)' },
  murky:          { label: '🟤 Grumligt',       tip: 'Ljusa kontrasterande beten (chartreuse, vit, gul)' },
  dark:           { label: '⚫ Mycket mörkt',   tip: 'Starkt lysande eller UV-aktiva beten (chartreuse, orange)' },
};

// ── Väder (Open-Meteo – ingen API-nyckel, CORS-fri) ──────────────
let _weatherCache = {};
async function fetchWeather(lat, lng) {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (_weatherCache[key]) return _weatherCache[key];
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}`
      + `&current=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode,surface_pressure,cloudcover`
      + `&hourly=surface_pressure&past_hours=3&forecast_hours=0`
      + `&wind_speed_unit=ms&timezone=Europe%2FStockholm`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('Open-Meteo API fel');
    const d   = await r.json();
    const cur = d.current ?? {};
    const get = name => cur[name] ?? null;

    // Lufttrycksförändring senaste 3 timmar
    const pressureHourly = d.hourly?.surface_pressure ?? [];
    const pressureNow    = get('surface_pressure');
    const pressure3hAgo  = pressureHourly.length >= 3 ? pressureHourly[0] : null;
    const pressureDiff   = (pressureNow !== null && pressure3hAgo !== null)
      ? pressureNow - pressure3hAgo : null;
    const pressureTrend  = pressureDiff === null ? 'unknown'
      : pressureDiff > 2  ? 'rising'
      : pressureDiff < -2 ? 'falling'
      : 'stable';

    const w = {
      temp:          get('temperature_2m'),
      wind:          get('windspeed_10m'),
      windDir:       get('winddirection_10m'),
      precip:        get('precipitation'),
      code:          get('weathercode'),
      cloudcover:    get('cloudcover'),
      pressure:      pressureNow ? Math.round(pressureNow) : null,
      pressureDiff:  pressureDiff !== null ? Math.round(pressureDiff * 10) / 10 : null,
      pressureTrend,
    };
    _weatherCache[key] = w;
    return w;
  } catch { return null; }
}

// ── Månfas ────────────────────────────────────────────────────────
function getMoonPhase(date = new Date()) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle   = 29.530588853;
  const elapsed      = (date - knownNewMoon) / 86400000;
  const phase        = ((elapsed % lunarCycle) + lunarCycle) % lunarCycle;

  let name, emoji, score;
  if (phase < 1.5 || phase > 28)      { name = 'Nymåne';       emoji = '🌑'; score = 10; }
  else if (phase < 7)                  { name = 'Tilltagande';  emoji = '🌒'; score = 4;  }
  else if (phase < 8.5)                { name = 'Halvmåne';     emoji = '🌓'; score = 7;  }
  else if (phase < 13.5)               { name = 'Puckelformad'; emoji = '🌔'; score = 4;  }
  else if (phase < 15.5)               { name = 'Fullmåne';     emoji = '🌕'; score = 10; }
  else if (phase < 21)                 { name = 'Avtagande';    emoji = '🌖'; score = 4;  }
  else if (phase < 22.5)               { name = 'Halvmåne';     emoji = '🌗'; score = 7;  }
  else                                  { name = 'Avtagande';    emoji = '🌘'; score = 4;  }

  return { phase, name, emoji, score };
}

// ── Solupp & solnedgång ───────────────────────────────────────────
function getSunTimes(lat, lng, date = new Date()) {
  const rad  = Math.PI / 180;
  const deg  = x => x / rad;
  const norm = x => ((x % 360) + 360) % 360;

  const dayOfYear = Math.round((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const lngHour   = lng / 15;

  function calc(rising) {
    const t  = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
    const M  = norm(0.9856 * t - 3.289);
    const L  = norm(M + 1.916 * Math.sin(M * rad) + 0.020 * Math.sin(2 * M * rad) + 282.634);
    let   RA = norm(deg(Math.atan(0.91764 * Math.tan(L * rad))));
    RA += (Math.floor(L / 90) - Math.floor(RA / 90)) * 90;
    RA /= 15;
    const sinDec = 0.39782 * Math.sin(L * rad);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH   = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
    if (Math.abs(cosH) > 1) return null; // midnattsol/polarnatt
    const H    = rising ? (360 - deg(Math.acos(cosH))) / 15 : deg(Math.acos(cosH)) / 15;
    const utc  = ((H + RA - 0.06571 * t - 6.622) - lngHour + 24) % 24;
    const local = new Date(date);
    local.setUTCHours(0, 0, 0, 0);
    return new Date(local.getTime() + utc * 3600000);
  }

  const sunrise = calc(true);
  const sunset  = calc(false);
  if (!sunrise || !sunset) return null;

  const now          = date.getTime();
  const goldenWindow = 60 * 60 * 1000; // 60 min
  const isGoldenHour = Math.abs(now - sunrise.getTime()) < goldenWindow
                    || Math.abs(now - sunset.getTime())  < goldenWindow;

  // Nästa event
  let nextEvent, nextLabel;
  if (now < sunrise.getTime())      { nextEvent = sunrise; nextLabel = 'Gryning'; }
  else if (now < sunset.getTime())  { nextEvent = sunset;  nextLabel = 'Skymning'; }
  else                              { nextEvent = null;    nextLabel = 'Gryning imorgon'; }

  const minToNext = nextEvent ? Math.round((nextEvent - now) / 60000) : null;

  return { sunrise, sunset, isGoldenHour, nextLabel, minToNext };
}

function assessWeather(fishId, w, lat, lng) {
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

  // Lufttrycksförändring – artspecifik känslighet (pressureMult)
  const pm = fd.pressureMult ?? 1.0;
  if (w.pressureTrend === 'rising')       score += Math.round(20 * pm);
  else if (w.pressureTrend === 'falling') score = Math.max(0, score - Math.round(15 * pm));

  // Molnighet – artspecifik preferens (0–10 p)
  if (w.cloudcover !== null && fd.cloudPref && fd.cloudPref !== 'neutral') {
    const cloudy = w.cloudcover > 60;
    const sunny  = w.cloudcover < 30;
    if (fd.cloudPref === 'cloudy' && cloudy)  score += 10;
    if (fd.cloudPref === 'cloudy' && sunny)   score = Math.max(0, score - 5);
    if (fd.cloudPref === 'sunny'  && sunny)   score += 10;
    if (fd.cloudPref === 'sunny'  && cloudy)  score = Math.max(0, score - 5);
  }

  // Månfas (0–10 p)
  const moon = getMoonPhase();
  score += moon.score;

  // Gryning / skymning (0–15 p)
  let sunTimes = null;
  if (lat != null && lng != null) {
    sunTimes = getSunTimes(lat, lng);
    if (sunTimes?.isGoldenHour) score += 15;
  }

  // Max möjligt: 40+30+20+40+10+15+10 = 165 (varierar med pressureMult)
  let rating, color;
  if      (score >= 110) { rating = '⭐⭐⭐ Utmärkt';  color = 'var(--success)'; }
  else if (score >= 75)  { rating = '⭐⭐ Bra';        color = 'var(--accent)'; }
  else if (score >= 40)  { rating = '⭐ Måttlig';      color = '#f59e0b'; }
  else                   { rating = '⚠️ Utmanande';    color = 'var(--error)'; }

  const tempTxt     = w.temp     !== null ? `${w.temp}°C` : '';
  const windTxt     = w.wind     !== null ? `${w.wind} m/s` : '';
  const pressArr    = { rising: '↗ Stigande', stable: '→ Stabilt', falling: '↘ Fallande', unknown: '' };
  const pressureTxt = w.pressure   !== null ? `${w.pressure} hPa ${pressArr[w.pressureTrend] ?? ''}` : '';

  let cloudTxt = '';
  if (w.cloudcover !== null) {
    const icon = w.cloudcover > 70 ? '☁️' : w.cloudcover > 30 ? '⛅' : '☀️';
    const prefMap = { cloudy: 'föredrar mulet', sunny: 'föredrar soligt', neutral: '' };
    const match = fd.cloudPref === 'cloudy' ? w.cloudcover > 60
                : fd.cloudPref === 'sunny'  ? w.cloudcover < 30 : null;
    const matchTxt = match === true ? ' ✓' : match === false ? ' –' : '';
    cloudTxt = `${icon} ${w.cloudcover}%${matchTxt}`;
  }

  return { rating, color, score, moon, sunTimes,
           details: [tempTxt, windTxt].filter(Boolean).join(' · '),
           pressureTxt, cloudTxt };
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

  // Kräv att användaren valt användarnamn innan de når appen
  if (page !== 'profile.html') {
    const { data: profile } = await _sb.from('profiles').select('id').eq('id', session.user.id).single();
    if (!profile) {
      location.replace('profile.html');
      return;
    }
  }

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
  if (page === 'forecast.html')    return initForecastPage();
  if (page === 'profile.html')     return initProfilePage();
  if (page === 'social.html')      return initSocialPage();
  if (page === 'crew.html')        return initCrewPage();
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
        if (fish) openFishOverlay(fish, selectedLake);
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

// ── Fiskvals-overlay (global, används från wizard och lake.html) ──
function fmtW(g) {
  return g >= 1000 ? (g/1000).toFixed(g % 1000 === 0 ? 0 : 1) + ' kg' : g + ' g';
}

function openFishOverlay(f, lake) {
  const overlay = document.getElementById('fish-overlay');
  if (!overlay) return;
  overlay.style.display = 'block';
  overlay.scrollTop     = 0;
  document.body.style.overflow = 'hidden';
  if (window.lucide) lucide.createIcons();

  document.getElementById('fo-emoji').textContent = FISH_EMOJI[f.id] ?? '🐟';
  document.getElementById('fo-name').textContent  = f.name;
  document.getElementById('fo-tag').textContent   = f.tag ?? 'Vanlig';

  const fd = FISH_DATA[f.id] ?? {};
  document.getElementById('fo-info-rows').innerHTML = `
    <div class="fic-row"><span>📅 Bästa säsong</span><span>${fd.season ?? '—'}</span></div>
    <div class="fic-row"><span>⏰ Aktivast</span><span>${fd.time ?? '—'}</span></div>
    <div class="fic-row" id="fo-weather-row">
      <span>🌤️ Väder nu</span><span class="text-muted" style="font-size:.78rem">Hämtar…</span>
    </div>`;

  if (lake?.lat && lake?.lng) {
    fetchWeather(lake.lat, lake.lng).then(w => {
      const a   = assessWeather(f.id, w, lake.lat, lake.lng);
      const row = document.getElementById('fo-weather-row');
      if (!row || !a) return;
      row.innerHTML = `<span>🌤️ Väder nu</span><span style="color:${a.color};font-weight:700">${a.rating}</span>`;
      let extra = `<div class="fic-row"><span></span><span class="text-muted" style="font-size:.72rem">${a.details}</span></div>`;
      if (a.pressureTxt) extra += `<div class="fic-row"><span>🌡 Lufttryck</span><span style="font-size:.8rem">${a.pressureTxt}</span></div>`;
      if (a.cloudTxt)    extra += `<div class="fic-row"><span>☁️ Molnighet</span><span style="font-size:.8rem">${a.cloudTxt}</span></div>`;
      extra += `<div class="fic-row"><span>🌙 Månfas</span><span style="font-size:.8rem">${a.moon.emoji} ${a.moon.name}</span></div>`;
      if (a.sunTimes) {
        const fmt  = d => d.toLocaleTimeString('sv-SE', { hour:'2-digit', minute:'2-digit' });
        const win  = 60 * 60 * 1000;
        const riseFrom = fmt(new Date(a.sunTimes.sunrise.getTime() - win));
        const riseTo   = fmt(new Date(a.sunTimes.sunrise.getTime() + win));
        const setFrom  = fmt(new Date(a.sunTimes.sunset.getTime()  - win));
        const setTo    = fmt(new Date(a.sunTimes.sunset.getTime()  + win));
        extra += `<div class="fic-row"><span>🌅 Gryning</span><span style="font-size:.8rem">${fmt(a.sunTimes.sunrise)} <span class="text-muted">(${riseFrom}–${riseTo})</span></span></div>`;
        extra += `<div class="fic-row"><span>🌇 Skymning</span><span style="font-size:.8rem">${fmt(a.sunTimes.sunset)} <span class="text-muted">(${setFrom}–${setTo})</span></span></div>`;
        if (a.sunTimes.isGoldenHour) extra += `<div class="fic-row"><span></span><span style="color:var(--accent);font-weight:700;font-size:.8rem">⚡ Aktivt fisketillfälle!</span></div>`;
      }
      row.insertAdjacentHTML('afterend', extra);
    });
  }

  // Vattenklarhet – slider
  const CLARITY_LEVELS = ['clear', 'slightly_murky', 'murky', 'dark'];
  const claritySlider  = document.getElementById('fo-clarity-slider');
  const clarityLabel   = document.getElementById('fo-clarity-label');
  const clarityTip     = document.getElementById('fo-clarity-tip');
  let selectedClarity  = CLARITY_LEVELS[0];
  claritySlider.value  = 0;

  function updateClarity() {
    selectedClarity = CLARITY_LEVELS[parseInt(claritySlider.value)];
    const cl = CLARITY_LABELS[selectedClarity];
    if (clarityLabel) clarityLabel.textContent = cl.label;
    if (clarityTip)   clarityTip.textContent   = cl.tip;
  }
  claritySlider.oninput = updateClarity;
  updateClarity();

  // Viktslider
  const wg     = FISH_WEIGHT_GUIDE[f.id] ?? { min: 200, max: 1000, sliderMax: 3000 };
  const slider = document.getElementById('fo-weight-slider');
  slider.min   = 0;
  slider.max   = wg.sliderMax;
  slider.step  = Math.max(1, Math.round(wg.sliderMax / 200));
  slider.value = Math.round((wg.min + wg.max) / 2);
  document.getElementById('fo-weight-max').textContent = fmtW(wg.sliderMax);
  document.getElementById('fo-rec-label').textContent  = `Rekommenderat: ${fmtW(wg.min)}–${fmtW(wg.max)}`;

  function updateSlider() {
    const val    = parseInt(slider.value);
    const minPct = (wg.min / wg.sliderMax) * 100;
    const maxPct = (wg.max / wg.sliderMax) * 100;
    slider.style.background = `linear-gradient(to right,
      rgba(255,255,255,.15) 0%, rgba(255,255,255,.15) ${minPct}%,
      var(--accent) ${minPct}%, var(--accent) ${maxPct}%,
      rgba(255,255,255,.15) ${maxPct}%, rgba(255,255,255,.15) 100%)`;
    document.getElementById('fo-weight-value').textContent = fmtW(val);
  }
  slider.oninput = updateSlider;
  updateSlider();

  // Starta fiske
  document.getElementById('fo-start-btn').onclick = () => {
    sessionStorage.setItem('selectedFish',  JSON.stringify(f));
    sessionStorage.setItem('selectedLake',  JSON.stringify(lake));
    sessionStorage.setItem('waterClarity',  selectedClarity ?? '');
    sessionStorage.setItem('targetWeight',  slider.value);
    document.body.style.overflow = '';
    location.href = `session.html?lakeId=${lake?.id ?? ''}&fishId=${f.id}`;
  };

  // Stäng
  const closeBtn = document.getElementById('fish-overlay-close');
  if (closeBtn) closeBtn.onclick = () => {
    overlay.style.display        = 'none';
    document.body.style.overflow = '';
  };
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
        const f = fish.find(x => x.id === card.dataset.id);
        if (f) openFishOverlay(f, lake);
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
    const a = assessWeather(f.id, w, lake.lat, lake.lng);
    if (!a) {
      row.innerHTML = `<span>🌤️ Väder nu</span><span class="text-muted">Ej tillgängligt</span>`;
      return;
    }
    row.innerHTML = `<span>🌤️ Väder nu</span><span style="color:${a.color};font-weight:700">${a.rating}</span>`;
    let extra = `<div class="fic-row"><span></span><span class="text-muted" style="font-size:.72rem">${a.details}</span></div>`;
    if (a.pressureTxt)
      extra += `<div class="fic-row"><span>🌡 Lufttryck</span><span style="font-size:.8rem">${a.pressureTxt}</span></div>`;
    extra += `<div class="fic-row"><span>🌙 Månfas</span><span style="font-size:.8rem">${a.moon.emoji} ${a.moon.name}</span></div>`;
    if (a.sunTimes) {
      const fmt = d => d.toLocaleTimeString('sv-SE', { hour:'2-digit', minute:'2-digit' });
      const goldenTxt = a.sunTimes.isGoldenHour
        ? `<span style="color:var(--accent);font-weight:700">⚡ Aktivt fisketillfälle!</span>`
        : a.sunTimes.minToNext !== null
          ? `${a.sunTimes.nextLabel} om ${a.sunTimes.minToNext < 60 ? a.sunTimes.minToNext + ' min' : Math.round(a.sunTimes.minToNext/60) + ' h'}`
          : a.sunTimes.nextLabel;
      const win2    = 60 * 60 * 1000;
      const riseFrom2 = fmt(new Date(a.sunTimes.sunrise.getTime() - win2));
      const riseTo2   = fmt(new Date(a.sunTimes.sunrise.getTime() + win2));
      const setFrom2  = fmt(new Date(a.sunTimes.sunset.getTime()  - win2));
      const setTo2    = fmt(new Date(a.sunTimes.sunset.getTime()  + win2));
      extra += `<div class="fic-row"><span>🌅 Gryning</span><span style="font-size:.8rem">${fmt(a.sunTimes.sunrise)} <span class="text-muted">(${riseFrom2}–${riseTo2})</span></span></div>`;
      extra += `<div class="fic-row"><span>🌇 Skymning</span><span style="font-size:.8rem">${fmt(a.sunTimes.sunset)} <span class="text-muted">(${setFrom2}–${setTo2})</span></span></div>`;
      extra += `<div class="fic-row"><span></span><span style="font-size:.78rem">${goldenTxt}</span></div>`;
    }
    row.insertAdjacentHTML('afterend', extra);
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

  let currentFish = fish;

  function updateFishHeader(f) {
    document.getElementById('session-fish').textContent       = f?.name ?? 'Okänd fisk';
    document.getElementById('session-fish-emoji').textContent = FISH_EMOJI[f?.id] ?? '🐟';
  }

  document.getElementById('session-lake').textContent = lake?.name ?? 'Okänd sjö';
  updateFishHeader(currentFish);
  document.getElementById('session-time').textContent =
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

  // ── Byt fiskart ──────────────────────────────────────────────────
  const FISH_LIST = Object.entries(FISH_INFO).map(([id, info]) => ({ id, ...info })).filter(f => f.name);
  const picker     = document.getElementById('fish-picker');
  const pickerList = document.getElementById('fish-picker-list');

  if (picker && pickerList) {
    pickerList.innerHTML = FISH_LIST.map(f => `
      <button class="fish-picker-item" data-id="${f.id}"
              style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius);
                     background:none;border:1px solid var(--border-soft);cursor:pointer;width:100%;text-align:left;
                     color:var(--text);font-family:inherit;transition:border-color .15s">
        <span style="font-size:22px">${FISH_EMOJI[f.id] ?? '🐟'}</span>
        <span style="font-weight:600;font-size:.9rem">${f.name}</span>
      </button>`).join('');

    document.getElementById('btn-change-fish')?.addEventListener('click', () => {
      picker.style.display = 'block';
      if (window.lucide) lucide.createIcons();
    });
    document.getElementById('fish-picker-close')?.addEventListener('click', () => {
      picker.style.display = 'none';
    });
    picker.addEventListener('click', e => { if (e.target === picker) picker.style.display = 'none'; });

    pickerList.querySelectorAll('.fish-picker-item').forEach(btn =>
      btn.addEventListener('click', async () => {
        const newFish = FISH_LIST.find(f => f.id === btn.dataset.id);
        if (!newFish) return;
        currentFish = newFish;
        sessionStorage.setItem('selectedFish', JSON.stringify(newFish));
        updateFishHeader(newFish);
        picker.style.display = 'none';
        await fetchRecommendations(newFish);
      }));
  }

  // ── Hämta rekommendationer ────────────────────────────────────────
  async function fetchRecommendations(targetFish) {
    if (!isAiEnabled()) {
      document.getElementById('loading-state').style.display = 'none';
      document.getElementById('rec-content').style.display   = 'block';
      document.getElementById('tip-box').style.display       = 'block';
      document.getElementById('tip-text').textContent        =
        'AI-rekommendationer är avstängda. Slå på AI-knappen (✨) i toppen för att aktivera.';
      return;
    }

    document.getElementById('loading-state').style.display = 'flex';
    document.getElementById('rec-content').style.display   = 'none';
    document.getElementById('error-state').style.display   = 'none';

    try {
      const w        = await fetchWeather(lake?.lat, lake?.lng).catch(() => null);
      const moon     = getMoonPhase();
      const sun      = lake?.lat ? getSunTimes(lake.lat, lake.lng) : null;
      const pressMap = { rising: 'Stigande lufttryck (↗ bra fiskeförhållanden)', stable: 'Stabilt lufttryck', falling: 'Fallande lufttryck (↘ fisken äter sällan)', unknown: '' };
      const storedClarity = sessionStorage.getItem('waterClarity') || '';
      const storedWeight  = sessionStorage.getItem('targetWeight')  || '';
      const clarityMap    = {
        clear:          'Klart vatten – naturfärgade beten fungerar bäst',
        slightly_murky: 'Lätt grumligt vatten – halvljusa färger rekommenderas',
        murky:          'Grumligt vatten – ljusa kontrasterande beten ger bäst resultat',
        dark:           'Mycket mörkt vatten – starkt lysande eller UV-aktiva beten krävs',
      };
      const conditions = [
        w?.temp       !== null ? `Temp: ${w.temp}°C`             : '',
        w?.wind       !== null ? `Vind: ${w.wind} m/s`           : '',
        w?.cloudcover !== null ? `Molnighet: ${w.cloudcover}% (${w.cloudcover > 70 ? 'mulet' : w.cloudcover > 30 ? 'halvmulet' : 'klart'})` : '',
        w?.pressure   !== null ? pressMap[w.pressureTrend] ?? '' : '',
        `Månfas: ${moon.emoji} ${moon.name}`,
        sun?.isGoldenHour ? 'Just nu: gryning/skymning – fisken är extra aktiv' : '',
        sun ? `Gryning ${sun.sunrise.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})}, skymning ${sun.sunset.toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'})}` : '',
        storedClarity ? clarityMap[storedClarity] ?? '' : '',
        storedWeight  ? `Fiskar siktar på ${parseInt(storedWeight) >= 1000 ? (parseInt(storedWeight)/1000).toFixed(1) + ' kg' : storedWeight + ' g'} fisk` : '',
      ].filter(Boolean).join('. ');

      const res = await fetch('/api/recommend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          lakeName: lake?.name, fishName: targetFish?.name,
          rods: rods ?? [], lures: lures ?? [],
          conditions,
        }),
      });
      if (res.status === 401) { location.href = 'auth.html'; return; }
      const recData = await res.json();
      renderRecommendations(recData);

      sb.from('sessions').insert({
        user_id:          user.id,
        lake_id:          lake?.id ?? 'unknown',
        lake_name:        lake?.name ?? '?',
        target_fish_id:   targetFish?.id ?? 'unknown',
        target_fish_name: targetFish?.name ?? '?',
        recommendations:  recData,
      }).select('id').single().then(({ data }) => {
        if (data?.id) sessionStorage.setItem('currentSessionId', data.id);
      });

    } catch {
      document.getElementById('loading-state').style.display = 'none';
      const err = document.getElementById('error-state');
      err.style.display = 'block';
      err.textContent   = 'Kunde inte hämta rekommendationer. Kontrollera din anslutning.';
    }
  }

  // Starta med vald fiskart
  fetchRecommendations(currentFish);
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
    imgEl.src     = `/api/lake-map?id=${lake.smhiId}`;
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

      // Bygg fullständig kontextstrings med alla nya parametrar
      const w        = weatherRef?.current ?? null;
      const moon     = getMoonPhase();
      const sun      = lake?.lat ? getSunTimes(lake.lat, lake.lng) : null;
      const pressMap = { rising: 'Stigande (↗ bra)', stable: 'Stabilt', falling: 'Fallande (↘ fisken äter sällan)', unknown: '' };
      const clarity  = sessionStorage.getItem('waterClarity') || '';
      const targetW  = sessionStorage.getItem('targetWeight')  || '';
      const clarityMap = {
        clear:          'Klart vatten – fiskar nära ytan och i vegetation',
        slightly_murky: 'Lätt grumligt – fiskar lite djupare strukturer',
        murky:          'Grumligt – fiskar djupkanter och tydliga strukturer',
        dark:           'Mycket mörkt – fiskar nära botten och skydd',
      };
      const fmtTime = d => d.toLocaleTimeString('sv-SE', { hour:'2-digit', minute:'2-digit' });

      const conditions = [
        w?.temp       != null ? `Lufttemp: ${w.temp}°C`                            : '',
        w?.wind       != null ? `Vind: ${w.wind} m/s`                              : '',
        w?.cloudcover != null ? `Molnighet: ${w.cloudcover}% (${w.cloudcover > 70 ? 'mulet' : w.cloudcover > 30 ? 'halvmulet' : 'klart'})` : '',
        w?.pressure   != null ? `Lufttryck: ${w.pressure} hPa, ${pressMap[w.pressureTrend] ?? ''}` : '',
        `Månfas: ${moon.emoji} ${moon.name} (fiskepoäng: ${moon.score}/10)`,
        sun ? `Gryning: ${fmtTime(sun.sunrise)}, Skymning: ${fmtTime(sun.sunset)}` : '',
        sun?.isGoldenHour ? 'Just nu är det gryning/skymning – fisken är extra aktiv' : '',
        clarity ? clarityMap[clarity] ?? '' : '',
        targetW ? `Fiskar siktar på ca ${parseInt(targetW) >= 1000 ? (parseInt(targetW)/1000).toFixed(1) + ' kg' : targetW + ' g'} fisk` : '',
      ].filter(Boolean).join('. ');

      const resp = await fetch('/api/analyze-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fishName:   fish?.name ?? 'Okänd fisk',
          fishData:   fishDataStr,
          lakeName:   lake.name,
          weather:    w,
          season:     getSeason(),
          conditions,
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

  const fishNameInput  = document.getElementById('catch-fish-name');
  const fishDisplay    = document.getElementById('catch-fish-display');
  const datetimeInput  = document.getElementById('catch-datetime');

  function setSelectedFishName(name) {
    fishNameInput.value  = name;
    fishDisplay.textContent = name || 'Välj fiskart…';
    fishDisplay.style.color = name ? 'var(--text)' : 'var(--text-3)';
  }

  if (fish?.name) setSelectedFishName(fish.name);
  datetimeInput.value = new Date().toISOString().slice(0, 16);

  // ── Fiskarts-picker ──────────────────────────────────────────────
  const picker     = document.getElementById('catch-fish-picker');
  const pickerList = document.getElementById('catch-fish-picker-list');

  if (picker && pickerList) {
    // Hämta sjöns arter (cachas) + alla FISH_INFO-arter
    let lakeFishIds = new Set();
    if (lake?.lat && lake?.lng) {
      fetchFishForLake(lake.lat, lake.lng, lake).then(lakeFish => {
        lakeFishIds = new Set(lakeFish.map(f => f.id));
        buildPickerList();
      }).catch(() => buildPickerList());
    } else {
      buildPickerList();
    }

    function buildPickerList() {
      const allFish = Object.entries(FISH_INFO)
        .map(([id, info]) => ({ id, name: info.name }))
        .filter(f => f.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'sv'));

      const lakeFish  = allFish.filter(f => lakeFishIds.has(f.id));
      const otherFish = allFish.filter(f => !lakeFishIds.has(f.id));

      const renderGroup = (label, items) => {
        if (!items.length) return '';
        return `
          <p style="font-size:.7rem;font-weight:700;color:var(--text-3);
                    letter-spacing:.08em;padding:8px 4px 4px;text-transform:uppercase">${label}</p>
          ${items.map(f => `
            <button class="catch-fish-pick-btn" data-name="${f.name}" data-id="${f.id}"
                    style="display:flex;align-items:center;gap:10px;padding:10px 12px;
                           border-radius:var(--radius);background:none;
                           border:1px solid var(--border-soft);cursor:pointer;width:100%;
                           text-align:left;color:var(--text);font-family:inherit;
                           transition:border-color .15s">
              <span style="font-size:20px">${FISH_EMOJI[f.id] ?? '🐟'}</span>
              <span style="font-size:.9rem;font-weight:600">${f.name}</span>
            </button>`).join('')}`;
      };

      pickerList.innerHTML =
        renderGroup(lake?.name ? `I ${lake.name}` : 'Sjöns arter', lakeFish) +
        renderGroup('Övriga arter', otherFish);

      pickerList.querySelectorAll('.catch-fish-pick-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          setSelectedFishName(btn.dataset.name);
          picker.style.display = 'none';
        }));
    }

    document.getElementById('btn-pick-fish').addEventListener('click', () => {
      picker.style.display = 'block';
      if (window.lucide) lucide.createIcons();
    });
    document.getElementById('catch-fish-picker-close').addEventListener('click', () => {
      picker.style.display = 'none';
    });
    picker.addEventListener('click', e => { if (e.target === picker) picker.style.display = 'none'; });
  }

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

// ── Hjälp: avatar-initial ─────────────────────────────────────────
function avatarHtml(username, size = 40) {
  const initial = (username ?? '?')[0].toUpperCase();
  const colors  = ['#E8701A','#4A9ECA','#5DBB6A','#CA4A9E','#E8C81A'];
  const color   = colors[initial.charCodeAt(0) % colors.length];
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};
    display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(size*0.4)}px;
    color:#fff;flex-shrink:0">${initial}</div>`;
}

// ── Profil ────────────────────────────────────────────────────────
async function initProfilePage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const params   = new URLSearchParams(location.search);
  const targetId = params.get('id') ?? user.id;
  const isOwn    = targetId === user.id;

  // Hämta profil
  let { data: profile } = await sb.from('profiles').select('*').eq('id', targetId).single();

  if (!profile && isOwn) {
    // Visa username-setup
    document.getElementById('setup-section').style.display = 'block';
    document.getElementById('btn-save-username').addEventListener('click', async () => {
      const val = document.getElementById('username-input').value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
      const errEl = document.getElementById('username-error');
      if (val.length < 2) { errEl.textContent = 'Minst 2 tecken'; errEl.style.display = 'block'; return; }
      const btn = document.getElementById('btn-save-username');
      btn.disabled = true; btn.textContent = 'Sparar…';
      const { error } = await sb.from('profiles').upsert({ id: user.id, username: val });
      if (error) {
        errEl.textContent = 'Användarnamnet är taget – välj ett annat';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Fortsätt →';
        return;
      }
      location.replace('index.html');
    });
    return;
  }
  if (!profile) { document.querySelector('main').innerHTML = '<p class="text-muted" style="padding:40px 16px">Profil hittades inte</p>'; return; }

  // Visa profil-header
  const headerEl = document.getElementById('profile-header');
  headerEl.style.display = 'block';
  document.getElementById('profile-avatar').innerHTML = avatarHtml(profile.username, 64);
  document.getElementById('profile-avatar').style.background = 'none';

  // Hämta fångster + crews parallellt
  const [{ data: catches }, { data: memberships }] = await Promise.all([
    sb.from('catches').select('*').eq('user_id', targetId).order('caught_at', { ascending: false }),
    sb.from('crew_members').select('crew_id, crews(id,name)').eq('user_id', targetId),
  ]);

  document.getElementById('profile-username').textContent = profile.username;
  document.getElementById('profile-stats').textContent    = `${catches?.length ?? 0} fångster registrerade`;

  // Vän-knapp (andras profil)
  if (!isOwn) {
    const actEl = document.getElementById('profile-actions');
    const { data: fs } = await sb.from('friendships').select('*')
      .or(`and(requester.eq.${user.id},addressee.eq.${targetId}),and(requester.eq.${targetId},addressee.eq.${user.id})`).single();
    if (!fs) {
      actEl.innerHTML = `<button id="btn-add-friend" class="btn btn-primary btn-sm">Lägg till vän</button>`;
      document.getElementById('btn-add-friend').addEventListener('click', async () => {
        await sb.from('friendships').insert({ requester: user.id, addressee: targetId });
        actEl.innerHTML = `<span class="tag">Förfrågan skickad</span>`;
      });
    } else if (fs.status === 'accepted') {
      actEl.innerHTML = `<span class="tag" style="color:var(--success)">✓ Vänner</span>`;
    } else {
      actEl.innerHTML = `<span class="tag">Förfrågan skickad</span>`;
    }
  }

  // Rekord
  if (catches?.length) {
    const records = {};
    catches.forEach(c => {
      if (!records[c.fish_name]) records[c.fish_name] = { weight: 0, length: 0 };
      if ((c.weight_g ?? 0)  > records[c.fish_name].weight) records[c.fish_name].weight = c.weight_g;
      if ((c.length_cm ?? 0) > records[c.fish_name].length) records[c.fish_name].length = c.length_cm;
    });
    const recEl = document.getElementById('profile-records');
    recEl.innerHTML = Object.entries(records).map(([name, r]) => {
      const emoji = FISH_EMOJI[Object.keys(FISH_DATA).find(k => catches.find(c => c.fish_name === name && c.fish_id === k))] ?? '🐟';
      return `<div style="flex-shrink:0;background:var(--surface);border:1px solid var(--border-soft);
               border-radius:var(--radius-lg);padding:10px 14px;min-width:120px;text-align:center">
        <div style="font-size:24px;margin-bottom:4px">${emoji}</div>
        <div style="font-weight:700;font-size:.78rem;margin-bottom:4px">${name}</div>
        ${r.weight ? `<div style="font-size:.7rem;color:var(--accent);font-weight:700">🏆 ${r.weight.toLocaleString('sv-SE')} g</div>` : ''}
        ${r.length ? `<div style="font-size:.7rem;color:var(--text-3)">${r.length} cm</div>` : ''}
      </div>`;
    }).join('');
    document.getElementById('profile-records-section').style.display = 'block';
  }

  // Crews
  if (memberships?.length) {
    const crewEl = document.getElementById('profile-crews');
    crewEl.innerHTML = memberships.map(m => `
      <a href="crew.html?id=${m.crews.id}" style="display:flex;align-items:center;gap:10px;
         background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius);
         padding:10px 14px;text-decoration:none;color:var(--text)">
        <i data-lucide="users" style="width:18px;height:18px;color:var(--accent)"></i>
        <span class="font-bold" style="font-size:.9rem">${m.crews.name}</span>
      </a>`).join('');
    document.getElementById('profile-crews-section').style.display = 'block';
  }

  // Senaste 5 fångster
  if (catches?.length) {
    const cEl = document.getElementById('profile-catches');
    cEl.innerHTML = catches.slice(0, 5).map(c => {
      const date = new Date(c.caught_at).toLocaleDateString('sv-SE', { day:'numeric', month:'short' });
      return `<div style="display:flex;align-items:center;gap:10px;background:var(--surface);
               border:1px solid var(--border-soft);border-radius:var(--radius);padding:10px 14px">
        ${c.image_url ? `<img src="${c.image_url}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;flex-shrink:0">` : `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px">🐟</div>`}
        <div style="flex:1">
          <div class="font-bold" style="font-size:.88rem">${c.fish_name}</div>
          <div class="text-xs text-muted">${[c.weight_g ? c.weight_g+'g' : null, c.lake_name, date].filter(Boolean).join(' · ')}</div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('profile-catches-section').style.display = 'block';
  }

  if (window.lucide) lucide.createIcons();
}

// ── Social feed ───────────────────────────────────────────────────
async function initSocialPage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  // Hämta vänner
  const { data: friendships } = await sb.from('friendships').select('*')
    .or(`requester.eq.${user.id},addressee.eq.${user.id}`)
    .eq('status', 'accepted');
  const friendIds = (friendships ?? []).map(f => f.requester === user.id ? f.addressee : f.requester);

  // Inkommande förfrågningar
  const { data: incoming } = await sb.from('friendships').select('*, profiles!requester(username)')
    .eq('addressee', user.id).eq('status', 'pending');
  if (incoming?.length) {
    const reqSec = document.getElementById('requests-section');
    reqSec.style.display = 'block';
    document.getElementById('requests-list').innerHTML = incoming.map(r => `
      <div style="display:flex;align-items:center;gap:10px;background:var(--surface);
                  border:1px solid var(--border-soft);border-radius:var(--radius);padding:10px 14px">
        ${avatarHtml(r.profiles?.username, 36)}
        <span class="font-bold" style="flex:1;font-size:.9rem">${r.profiles?.username ?? '?'}</span>
        <button class="btn btn-primary btn-sm accept-btn" data-id="${r.id}" data-uid="${r.requester}">Acceptera</button>
        <button class="btn btn-surface btn-sm decline-btn" data-id="${r.id}">Avvisa</button>
      </div>`).join('');
    reqSec.querySelectorAll('.accept-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        await sb.from('friendships').update({ status: 'accepted' }).eq('id', btn.dataset.id);
        location.reload();
      }));
    reqSec.querySelectorAll('.decline-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        await sb.from('friendships').delete().eq('id', btn.dataset.id);
        btn.closest('div').remove();
      }));
  }

  // Feed
  const skeleton = document.getElementById('feed-skeleton');
  const feedList  = document.getElementById('feed-list');
  const feedEmpty = document.getElementById('feed-empty');

  if (!friendIds.length) {
    skeleton.style.display = 'none';
    feedEmpty.style.display = 'block';
    if (window.lucide) lucide.createIcons();
  } else {
    const { data: feed } = await sb.from('catches').select('*, profiles!user_id(username)')
      .in('user_id', friendIds).eq('is_public', true)
      .order('caught_at', { ascending: false }).limit(50);

    skeleton.style.display = 'none';
    if (!feed?.length) { feedEmpty.style.display = 'block'; }
    else {
      feedList.style.display = 'flex';
      feedList.innerHTML = feed.map(c => {
        const date = new Date(c.caught_at).toLocaleDateString('sv-SE', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        const username = c.profiles?.username ?? '?';
        return `
          <div style="background:var(--surface);border:1px solid var(--border-soft);
                      border-radius:var(--radius-lg);overflow:hidden">
            ${c.image_url ? `<img src="${c.image_url}" style="width:100%;height:180px;object-fit:cover">` : ''}
            <div style="padding:12px 14px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                ${avatarHtml(username, 28)}
                <a href="profile.html?id=${c.user_id}" style="font-weight:700;font-size:.85rem;color:var(--text);text-decoration:none">${username}</a>
                <span class="text-xs text-muted" style="margin-left:auto">${date}</span>
              </div>
              <div style="font-weight:700">${FISH_EMOJI[c.fish_id]??'🐟'} ${c.fish_name}</div>
              <div class="text-sm text-muted">${[c.weight_g ? c.weight_g+'g' : null, c.length_cm ? c.length_cm+'cm' : null, c.lake_name].filter(Boolean).join(' · ')}</div>
            </div>
          </div>`;
      }).join('');
    }
  }

  // Hämta alla befintliga förfrågningar (skickade + mottagna) för att visa rätt knappstatus
  const { data: allFs } = await sb.from('friendships').select('*')
    .or(`requester.eq.${user.id},addressee.eq.${user.id}`);
  const sentTo    = new Set((allFs ?? []).filter(f => f.requester === user.id).map(f => f.addressee));
  const acceptedS = new Set((allFs ?? []).filter(f => f.status === 'accepted')
    .map(f => f.requester === user.id ? f.addressee : f.requester));

  // Ladda alla profiler alphabetiskt
  const { data: allProfiles } = await sb.from('profiles').select('*')
    .neq('id', user.id).order('username', { ascending: true });

  const resEl = document.getElementById('search-results');

  function renderUserList(profiles) {
    if (!profiles?.length) { resEl.innerHTML = '<p class="text-xs text-muted">Inga användare hittades</p>'; return; }
    resEl.innerHTML = profiles.map(p => {
      const isFriend  = acceptedS.has(p.id);
      const isPending = sentTo.has(p.id) && !isFriend;
      const btn = isFriend
        ? `<span class="tag" style="color:var(--success)">✓ Vänner</span>`
        : isPending
        ? `<button class="btn btn-surface btn-sm" disabled>Skickat</button>`
        : `<button class="btn btn-surface btn-sm add-friend-btn" data-id="${p.id}">+ Lägg till</button>`;
      return `
        <div style="display:flex;align-items:center;gap:10px;background:var(--surface);
                    border:1px solid var(--border-soft);border-radius:var(--radius);padding:10px 14px">
          ${avatarHtml(p.username, 32)}
          <a href="profile.html?id=${p.id}" style="font-weight:700;font-size:.9rem;flex:1;color:var(--text);text-decoration:none">${p.username}</a>
          ${btn}
        </div>`;
    }).join('');
    resEl.querySelectorAll('.add-friend-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        const { error } = await sb.from('friendships').insert({ requester: user.id, addressee: btn.dataset.id });
        if (!error) {
          sentTo.add(btn.dataset.id);
          btn.textContent = '✓ Skickat';
          btn.disabled = true;
        }
      }));
  }

  renderUserList(allProfiles);

  // Filtrera lokalt vid sökning
  function filterUsers() {
    const q = document.getElementById('friend-search').value.trim().toLowerCase();
    const filtered = q ? (allProfiles ?? []).filter(p => p.username.includes(q)) : allProfiles;
    renderUserList(filtered);
  }
  document.getElementById('btn-friend-search').addEventListener('click', filterUsers);
  document.getElementById('friend-search').addEventListener('input', filterUsers);

  if (window.lucide) lucide.createIcons();
}

// ── Crew ──────────────────────────────────────────────────────────
async function initCrewPage() {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const params = new URLSearchParams(location.search);
  const crewId = params.get('id');

  if (!crewId) {
    // Skapa crew eller visa egna crews
    await showMyCrews(sb, user);
    return;
  }

  // Visa specifikt crew
  const [{ data: crew }, { data: members }] = await Promise.all([
    sb.from('crews').select('*').eq('id', crewId).single(),
    sb.from('crew_members').select('user_id, role, profiles(username)').eq('crew_id', crewId),
  ]);

  if (!crew) { document.querySelector('main').innerHTML = '<p class="text-muted" style="padding:40px 16px">Crew hittades inte</p>'; return; }

  document.getElementById('crew-skeleton').style.display = 'none';
  document.getElementById('crew-header').style.display   = 'block';
  document.getElementById('crew-tabs').style.display     = 'flex';
  document.getElementById('crew-name').textContent  = crew.name;
  document.getElementById('crew-desc').textContent  = crew.description ?? '';
  document.getElementById('crew-meta').textContent  = `${members?.length ?? 0} medlemmar`;

  const isAdmin   = crew.created_by === user.id;
  const isMember  = members?.some(m => m.user_id === user.id);
  const actEl     = document.getElementById('crew-actions');

  if (isAdmin) {
    actEl.innerHTML = `<button id="btn-invite" class="btn btn-surface btn-sm"><i data-lucide="user-plus" style="width:14px;height:14px"></i> Bjud in</button>`;
    document.getElementById('btn-invite').addEventListener('click', () => {
      document.getElementById('invite-modal').style.display = 'block';
    });
    document.getElementById('invite-close').addEventListener('click', () => {
      document.getElementById('invite-modal').style.display = 'none';
    });
    document.getElementById('btn-invite-search').addEventListener('click', () => searchInvite(sb, user, crewId, members));
  } else if (isMember) {
    actEl.innerHTML = `<button id="btn-leave" class="btn btn-surface btn-sm">Lämna</button>`;
    document.getElementById('btn-leave').addEventListener('click', async () => {
      if (!confirm('Lämna crew?')) return;
      await sb.from('crew_members').delete().eq('crew_id', crewId).eq('user_id', user.id);
      location.href = 'social.html';
    });
  } else {
    actEl.innerHTML = `<button id="btn-join" class="btn btn-primary btn-sm">Gå med</button>`;
    document.getElementById('btn-join').addEventListener('click', async () => {
      await sb.from('crew_members').insert({ crew_id: crewId, user_id: user.id });
      location.reload();
    });
  }

  // Hämta fångster för alla medlemmar
  const memberIds = (members ?? []).map(m => m.user_id);
  const { data: catches } = memberIds.length
    ? await sb.from('catches').select('*').in('user_id', memberIds)
    : { data: [] };

  // Flikar
  document.querySelectorAll('.crew-tab').forEach(tab =>
    tab.addEventListener('click', () => {
      document.querySelectorAll('.crew-tab').forEach(t => {
        t.style.background = 'none'; t.style.color = 'var(--text-2)';
      });
      tab.style.background = 'var(--accent)'; tab.style.color = '#fff';
      document.querySelectorAll('.crew-panel').forEach(p => p.style.display = 'none');
      document.getElementById(`crew-${tab.dataset.tab}`).style.display = 'block';
    }));

  // Leaderboard – rekord per art
  const records = {};
  (catches ?? []).forEach(c => {
    const key = c.fish_name;
    if (!records[key] || (c.weight_g ?? 0) > (records[key].weight_g ?? 0)) {
      records[key] = c;
    }
  });
  const lbEl = document.getElementById('crew-leaderboard');
  if (!Object.keys(records).length) {
    lbEl.innerHTML = '<p class="text-muted text-sm" style="padding:12px 0">Inga fångster registrerade ännu</p>';
  } else {
    lbEl.innerHTML = Object.entries(records)
      .sort((a,b) => (b[1].weight_g??0) - (a[1].weight_g??0))
      .map(([name, c], i) => {
        const holder = members?.find(m => m.user_id === c.user_id)?.profiles?.username ?? '?';
        const emoji  = FISH_EMOJI[c.fish_id] ?? '🐟';
        return `<div style="display:flex;align-items:center;gap:12px;background:var(--surface);
                  border:1px solid var(--border-soft);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">
          <span style="font-size:1.2rem;font-weight:700;color:var(--text-3);min-width:24px">${i+1}</span>
          <span style="font-size:24px">${emoji}</span>
          <div style="flex:1">
            <div class="font-bold" style="font-size:.88rem">${name}</div>
            <div class="text-xs text-muted">@${holder}</div>
          </div>
          <div style="text-align:right">
            ${c.weight_g  ? `<div style="font-weight:700;color:var(--accent)">${c.weight_g.toLocaleString('sv-SE')} g</div>` : ''}
            ${c.length_cm ? `<div class="text-xs text-muted">${c.length_cm} cm</div>` : ''}
          </div>
        </div>`;
      }).join('');
  }

  // Topplista – flest fångster per person
  const countByUser = {};
  (catches ?? []).forEach(c => { countByUser[c.user_id] = (countByUser[c.user_id] ?? 0) + 1; });
  const tlEl = document.getElementById('crew-toplist');
  tlEl.innerHTML = Object.entries(countByUser)
    .sort((a,b) => b[1]-a[1])
    .map(([uid, count], i) => {
      const username = members?.find(m => m.user_id === uid)?.profiles?.username ?? '?';
      const medal    = ['🥇','🥈','🥉'][i] ?? `${i+1}.`;
      return `<div style="display:flex;align-items:center;gap:12px;background:var(--surface);
                border:1px solid var(--border-soft);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px">
        <span style="font-size:1.3rem">${medal}</span>
        ${avatarHtml(username, 36)}
        <a href="profile.html?id=${uid}" style="flex:1;font-weight:700;font-size:.9rem;color:var(--text);text-decoration:none">@${username}</a>
        <span style="font-weight:700;color:var(--accent)">${count} 🐟</span>
      </div>`;
    }).join('') || '<p class="text-muted text-sm" style="padding:12px 0">Inga fångster ännu</p>';

  // Medlemmar
  const mEl = document.getElementById('crew-members');
  mEl.innerHTML = (members ?? []).map(m => `
    <div style="display:flex;align-items:center;gap:10px;background:var(--surface);
                border:1px solid var(--border-soft);border-radius:var(--radius);padding:10px 14px;margin-bottom:6px">
      ${avatarHtml(m.profiles?.username, 36)}
      <a href="profile.html?id=${m.user_id}" style="font-weight:700;font-size:.9rem;flex:1;color:var(--text);text-decoration:none">@${m.profiles?.username ?? '?'}</a>
      ${m.role === 'admin' ? '<span class="tag" style="color:var(--accent)">Admin</span>' : ''}
    </div>`).join('');

  if (window.lucide) lucide.createIcons();
}

async function showMyCrews(sb, user) {
  const { data: memberships } = await sb.from('crew_members')
    .select('crew_id, role, crews(id,name,description)').eq('user_id', user.id);

  document.getElementById('crew-skeleton').style.display = 'none';
  const main = document.querySelector('main');
  main.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h1 class="text-xl font-bold">Mina Crews</h1>
      <button id="btn-create-crew" class="btn btn-primary btn-sm">+ Skapa crew</button>
    </div>
    <div id="my-crew-list" style="display:flex;flex-direction:column;gap:10px"></div>
    ${!memberships?.length ? '<p class="text-muted text-sm" style="padding:12px 0">Du är inte med i något crew ännu</p>' : ''}`;

  if (memberships?.length) {
    document.getElementById('my-crew-list').innerHTML = memberships.map(m => `
      <a href="crew.html?id=${m.crews.id}" style="display:flex;align-items:center;gap:12px;
         background:var(--surface);border:1px solid var(--border-soft);border-radius:var(--radius-lg);
         padding:14px 16px;text-decoration:none;color:var(--text)">
        <i data-lucide="users" style="width:22px;height:22px;color:var(--accent);flex-shrink:0"></i>
        <div style="flex:1">
          <div class="font-bold">${m.crews.name}</div>
          ${m.crews.description ? `<div class="text-xs text-muted">${m.crews.description}</div>` : ''}
        </div>
        <i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--text-3)"></i>
      </a>`).join('');
  }

  document.getElementById('btn-create-crew').addEventListener('click', () => {
    main.innerHTML = `
      <button onclick="history.back()" class="back-btn mb-5">
        <i data-lucide="chevron-left" class="icon"></i> Tillbaka
      </button>
      <h1 class="text-xl font-bold mb-5">Skapa crew</h1>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label class="section-title" style="display:block;margin-bottom:6px">Crewnamn</label>
          <input id="crew-name-input" type="text" placeholder="T.ex. Fagersta Fiskare" maxlength="40">
        </div>
        <div>
          <label class="section-title" style="display:block;margin-bottom:6px">Beskrivning (valfritt)</label>
          <input id="crew-desc-input" type="text" placeholder="Kort beskrivning…" maxlength="100">
        </div>
        <button id="btn-do-create-crew" class="btn btn-primary btn-full">Skapa crew</button>
        <p id="crew-create-err" style="color:var(--error);font-size:.82rem;display:none"></p>
      </div>`;
    if (window.lucide) lucide.createIcons();

    document.getElementById('btn-do-create-crew').addEventListener('click', async () => {
      const name = document.getElementById('crew-name-input').value.trim();
      const desc = document.getElementById('crew-desc-input').value.trim();
      if (!name) { document.getElementById('crew-create-err').textContent = 'Ange ett crewnamn'; document.getElementById('crew-create-err').style.display = 'block'; return; }
      const { data: newCrew, error } = await sb.from('crews').insert({ name, description: desc || null, created_by: user.id }).select().single();
      if (error) { document.getElementById('crew-create-err').textContent = error.message; document.getElementById('crew-create-err').style.display = 'block'; return; }
      await sb.from('crew_members').insert({ crew_id: newCrew.id, user_id: user.id, role: 'admin' });
      location.href = `crew.html?id=${newCrew.id}`;
    });
  });

  if (window.lucide) lucide.createIcons();
}

async function searchInvite(sb, user, crewId, members) {
  const q = document.getElementById('invite-search').value.trim().toLowerCase();
  if (!q) return;
  const existingIds = (members ?? []).map(m => m.user_id);
  const { data: results } = await sb.from('profiles').select('*').ilike('username', `%${q}%`).neq('id', user.id).limit(5);
  const resEl = document.getElementById('invite-results');
  if (!results?.length) { resEl.innerHTML = '<p class="text-xs text-muted">Inga användare hittades</p>'; return; }
  resEl.innerHTML = results.map(p => {
    const already = existingIds.includes(p.id);
    return `<div style="display:flex;align-items:center;gap:10px;background:var(--surface-2);
                border-radius:var(--radius);padding:10px 12px">
      ${avatarHtml(p.username, 32)}
      <span class="font-bold" style="flex:1;font-size:.9rem">${p.username}</span>
      ${already ? '<span class="tag">Medlem</span>' : `<button class="btn btn-primary btn-sm invite-add-btn" data-id="${p.id}">Bjud in</button>`}
    </div>`;
  }).join('');
  resEl.querySelectorAll('.invite-add-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      await sb.from('crew_members').insert({ crew_id: crewId, user_id: btn.dataset.id });
      btn.textContent = '✓ Inbjuden'; btn.disabled = true;
    }));
}

// ── Fiskeprognos ──────────────────────────────────────────────────
async function initForecastPage() {
  const WMO_ICON = { 0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️',
    51:'🌦️', 53:'🌦️', 55:'🌧️', 61:'🌧️', 63:'🌧️', 65:'🌧️',
    71:'❄️', 73:'❄️', 75:'❄️', 80:'🌦️', 81:'🌧️', 82:'🌧️',
    95:'⛈️', 96:'⛈️', 99:'⛈️' };
  const wmoIcon  = c => WMO_ICON[c] ?? WMO_ICON[Object.keys(WMO_ICON).reverse().find(k => +k <= c)] ?? '🌡️';
  const DAYS_SV  = ['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
  const MONTHS_SV = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'];

  // Populera sjölista
  const lakeSelect = document.getElementById('fc-lake');
  SEED_LAKES.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id; opt.textContent = `${l.name} (${l.county})`;
    lakeSelect.appendChild(opt);
  });

  // Försök pre-välja senast valda sjö
  const stored = JSON.parse(sessionStorage.getItem('selectedLake') || 'null');
  if (stored) lakeSelect.value = stored.id;

  // Fiskart-chips
  const chipsEl    = document.getElementById('fc-fish-chips');
  let   selectedFishId = 'abborre';
  const fishList   = Object.entries(FISH_INFO).map(([id,i]) => ({id,name:i.name})).filter(f=>f.name)
                       .sort((a,b)=>a.name.localeCompare(b.name,'sv'));

  chipsEl.innerHTML = fishList.map(f => `
    <button class="fc-fish-chip tag" data-id="${f.id}"
            style="cursor:pointer;border:none;font-family:inherit;
                   background:${f.id===selectedFishId?'var(--accent)':'var(--surface-2)'};
                   color:${f.id===selectedFishId?'#fff':'var(--text-2)'}">
      ${FISH_EMOJI[f.id]??'🐟'} ${f.name}
    </button>`).join('');

  function updateChips() {
    chipsEl.querySelectorAll('.fc-fish-chip').forEach(b => {
      const active = b.dataset.id === selectedFishId;
      b.style.background = active ? 'var(--accent)' : 'var(--surface-2)';
      b.style.color      = active ? '#fff' : 'var(--text-2)';
    });
  }
  chipsEl.querySelectorAll('.fc-fish-chip').forEach(b =>
    b.addEventListener('click', () => { selectedFishId = b.dataset.id; updateChips(); loadForecast(); }));

  async function loadForecast() {
    const lake = SEED_LAKES.find(l => l.id === lakeSelect.value);
    if (!lake) {
      document.getElementById('fc-empty').style.display   = 'block';
      document.getElementById('fc-list').style.display    = 'none';
      document.getElementById('fc-skeleton').style.display = 'none';
      if (window.lucide) lucide.createIcons();
      return;
    }

    document.getElementById('fc-empty').style.display    = 'none';
    document.getElementById('fc-list').style.display     = 'none';
    document.getElementById('fc-skeleton').style.display = 'flex';

    try {
      const url = `https://api.open-meteo.com/v1/forecast`
        + `?latitude=${lake.lat.toFixed(4)}&longitude=${lake.lng.toFixed(4)}`
        + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,cloudcover_mean,weathercode`
        + `&forecast_days=7&timezone=Europe%2FStockholm`;
      const r = await fetch(url);
      if (!r.ok) throw new Error('Nätverksfel');
      const d = await r.json();
      const daily = d.daily;

      const fd  = FISH_DATA[selectedFishId] ?? {};
      const list = document.getElementById('fc-list');

      list.innerHTML = daily.time.map((dateStr, i) => {
        const date    = new Date(dateStr);
        const dayName = DAYS_SV[date.getDay()];
        const dateLabel = `${date.getDate()} ${MONTHS_SV[date.getMonth()]}`;
        const tMax    = daily.temperature_2m_max[i];
        const tMin    = daily.temperature_2m_min[i];
        const tAvg    = (tMax + tMin) / 2;
        const wind    = daily.windspeed_10m_max[i];
        const precip  = daily.precipitation_sum[i];
        const cloud   = daily.cloudcover_mean[i];
        const code    = daily.weathercode[i];
        const moon    = getMoonPhase(date);

        // Poängberäkning
        let score = 0;
        // Temp
        if (tAvg !== null && fd.optTemp) {
          const [lo,hi] = fd.optTemp;
          if (tAvg>=lo && tAvg<=hi)                                    score += 40;
          else if (Math.abs(tAvg-lo)<4 || Math.abs(tAvg-hi)<4)        score += 25;
          else if (Math.abs(tAvg-lo)<8 || Math.abs(tAvg-hi)<8)        score += 10;
        }
        // Vind
        if (wind !== null && fd.goodWind) {
          const [,wMax] = fd.goodWind;
          if (wind <= wMax)          score += 30;
          else if (wind <= wMax+3)   score += 15;
          else if (wind <= wMax+6)   score += 5;
        }
        // Regn
        if (precip !== null) {
          if (precip < 1)       score += 20;
          else if (precip < 5)  score += 10;
          else if (precip < 15) score += 3;
        }
        // Moln (artspecifikt)
        if (cloud !== null && fd.cloudPref && fd.cloudPref !== 'neutral') {
          if (fd.cloudPref === 'cloudy' && cloud > 60) score += 10;
          if (fd.cloudPref === 'cloudy' && cloud < 30) score = Math.max(0, score - 5);
          if (fd.cloudPref === 'sunny'  && cloud < 30) score += 10;
          if (fd.cloudPref === 'sunny'  && cloud > 60) score = Math.max(0, score - 5);
        }
        // Månfas
        score += moon.score;

        const maxScore = 40+30+20+10+10;
        const pct      = Math.min(100, Math.round(score / maxScore * 100));
        let ratingLabel, ratingColor;
        if      (pct >= 75) { ratingLabel = 'Utmärkt';   ratingColor = 'var(--success)'; }
        else if (pct >= 52) { ratingLabel = 'Bra';       ratingColor = 'var(--accent)';  }
        else if (pct >= 30) { ratingLabel = 'Måttlig';   ratingColor = '#f59e0b';         }
        else                { ratingLabel = 'Utmanande'; ratingColor = 'var(--error)';    }

        const isToday = i === 0;

        return `
          <div style="background:var(--surface);border-radius:var(--radius-lg);
                      border:1px solid ${isToday?'var(--accent)':'var(--border-soft)'};
                      padding:14px 16px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              <div style="min-width:52px">
                <div style="font-weight:700;font-size:.9rem;color:${isToday?'var(--accent)':'var(--text)'}">${isToday?'Idag':dayName}</div>
                <div style="font-size:.72rem;color:var(--text-3)">${dateLabel}</div>
              </div>
              <div style="font-size:28px">${wmoIcon(code)}</div>
              <div style="flex:1">
                <div style="font-size:.82rem;font-weight:600">${Math.round(tMin)}° – ${Math.round(tMax)}°C
                  <span style="color:var(--text-3);font-weight:400"> · 💨 ${Math.round(wind)} m/s</span>
                  ${precip > 0.5 ? `<span style="color:var(--text-3);font-weight:400"> · 🌧 ${precip.toFixed(1)} mm</span>` : ''}
                </div>
                <div style="font-size:.72rem;color:var(--text-3);margin-top:2px">${moon.emoji} ${moon.name}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-weight:700;font-size:.85rem;color:${ratingColor}">${ratingLabel}</div>
                <div style="font-size:.7rem;color:var(--text-3)">${pct}%</div>
              </div>
            </div>
            <!-- Poängbar -->
            <div style="height:4px;background:var(--surface-2);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${ratingColor};border-radius:2px;transition:width .4s"></div>
            </div>
          </div>`;
      }).join('');

      document.getElementById('fc-skeleton').style.display = 'none';
      document.getElementById('fc-list').style.display     = 'flex';
    } catch (e) {
      document.getElementById('fc-skeleton').style.display = 'none';
      document.getElementById('fc-empty').style.display    = 'block';
      document.getElementById('fc-empty').innerHTML = `<p style="color:var(--error)">Kunde inte hämta prognos: ${e.message}</p>`;
    }
    if (window.lucide) lucide.createIcons();
  }

  lakeSelect.addEventListener('change', loadForecast);
  if (lakeSelect.value) loadForecast();
  else { document.getElementById('fc-empty').style.display = 'block'; if (window.lucide) lucide.createIcons(); }
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

  // Säkerställ att sessionen alltid sparas (AI kan vara av)
  const existingId = sessionStorage.getItem('currentSessionId');
  if (!existingId && lake?.id) {
    sb.from('sessions').insert({
      user_id:          user.id,
      lake_id:          lake.id,
      lake_name:        lake.name,
      target_fish_id:   fish?.id   ?? 'unknown',
      target_fish_name: fish?.name ?? 'Okänd fisk',
      recommendations:  null,
    }).select('id').single().then(({ data }) => {
      if (data?.id) sessionStorage.setItem('currentSessionId', data.id);
    });
  }

  async function saveAndLeave() {
    const note = document.getElementById('end-note').value.trim();
    if (note && lake?.id) {
      await sb.from('lake_notes').insert({ user_id: user.id, lake_id: lake.id, note });
      document.getElementById('end-success').style.display = 'flex';
      await new Promise(r => setTimeout(r, 600));
    }
    sessionStorage.removeItem('currentSessionId');
    location.href = 'history.html';
  }

  document.getElementById('btn-save-end').addEventListener('click', saveAndLeave);
  document.getElementById('btn-skip-end').addEventListener('click', () => {
    sessionStorage.removeItem('currentSessionId');
    location.href = 'history.html';
  });
}
