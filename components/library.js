import { getSupabase } from '../script.js';

let currentTab = 'rods';
let editingId  = null;
let tags       = [];
let imageUrl   = null;
let _cropperInstance = null;
let _sbRef = null;

// ── Filterstatus ───────────────────────────────────────────────────
let filterFish  = new Set();
let filterType  = new Set();
let searchQuery = '';
let _allLures   = []; // orfiltrerat, för chips

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export function initLibrary() {
  const sb = getSupabase();
  _sbRef = sb;
  loadItems(sb);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      // Återställ filter vid flikbyte
      filterFish.clear(); filterType.clear(); searchQuery = '';
      const s = document.getElementById('filter-search');
      if (s) s.value = '';
      loadItems(sb);
    });
  });

  // Sökfält
  document.getElementById('filter-search')?.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderGroupedLures(_allLures, sb);
  });

  document.getElementById('btn-add').addEventListener('click', () => openModal(null));
  document.getElementById('btn-add-empty')?.addEventListener('click', () => openModal(null));
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', () => saveItem(sb));
  document.getElementById('btn-add-tag').addEventListener('click', addTag);
  document.getElementById('tag-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTag(); });
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Kamera & galleri → öppna crop-vy direkt
  document.getElementById('btn-camera').addEventListener('click', () =>
    document.getElementById('file-camera').click());
  document.getElementById('btn-gallery').addEventListener('click', () =>
    document.getElementById('file-gallery').click());
  document.getElementById('file-camera').addEventListener('change', e =>
    openCropper(e.target.files[0]));
  document.getElementById('file-gallery').addEventListener('change', e =>
    openCropper(e.target.files[0]));

  // Crop-modal knappar
  document.getElementById('crop-cancel').addEventListener('click', closeCropper);
  document.getElementById('crop-confirm').addEventListener('click', () => confirmCrop(sb));

  // Rensa bild
  window.__clearImage = () => {
    imageUrl = null;
    document.getElementById('img-preview-wrap').style.display = 'none';
    document.getElementById('img-buttons').style.display = 'grid';
    document.getElementById('ai-suggestion-banner').style.display = 'none';
    document.getElementById('file-camera').value = '';
    document.getElementById('file-gallery').value = '';
  };
}

// ── Cropper ────────────────────────────────────────────────────────
function openCropper(file) {
  if (!file) return;
  const overlay  = document.getElementById('crop-overlay');
  const cropImg  = document.getElementById('crop-img');

  const url = URL.createObjectURL(file);
  cropImg.src = url;
  overlay.style.display = 'flex';

  // Vänta på att bilden laddas innan Cropper initieras
  cropImg.onload = () => {
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    _cropperInstance = new Cropper(cropImg, {
      aspectRatio: 1,          // kvadratisk beskärning
      viewMode:    1,
      autoCropArea: 0.9,
      movable:     true,
      zoomable:    true,
      rotatable:   false,
      scalable:    false,
    });
  };
}

function closeCropper() {
  document.getElementById('crop-overlay').style.display = 'none';
  if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
  document.getElementById('file-camera').value  = '';
  document.getElementById('file-gallery').value = '';
}

async function confirmCrop(sb) {
  if (!_cropperInstance) return;

  // Hämta beskuren canvas → konvertera till Blob
  const canvas = _cropperInstance.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });
  closeCropper();

  canvas.toBlob(async blob => {
    if (!blob) return;

    // Visa preview direkt
    showImagePreview(URL.createObjectURL(blob));

    // Starta AI-analys parallellt med uppladdning
    const analyzePromise = analyzeImageBlob(blob);

    // Ladda upp till Supabase
    try {
      const { data: { user } } = await sb.auth.getUser();
      const path = `${user.id}/${Date.now()}-crop.jpg`;
      const { error } = await sb.storage.from('equipment-images').upload(path, blob, { contentType: 'image/jpeg' });
      if (!error) {
        const { data } = sb.storage.from('equipment-images').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    } catch { /* tyst uppladdningsfel */ }

    await analyzePromise;
  }, 'image/jpeg', 0.88);
}

async function loadItems(sb) {
  const grid    = document.getElementById('item-grid');
  const spinner = document.getElementById('list-spinner');
  const empty   = document.getElementById('empty-lib');
  const filterSection = document.getElementById('filter-section');

  grid.style.display    = 'none';
  empty.style.display   = 'none';
  spinner.style.display = 'block';
  if (filterSection) filterSection.style.display = currentTab === 'lures' ? 'block' : 'none';

  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const { data } = await sb.from(currentTab).select('*')
    .eq('user_id', user.id).order('created_at', { ascending: false });
  const items = data ?? [];

  document.getElementById(currentTab === 'rods' ? 'rod-count' : 'lure-count').textContent = items.length;
  spinner.style.display = 'none';

  if (!items.length) {
    empty.style.display = 'block';
    document.getElementById('empty-icon').textContent = currentTab === 'rods' ? '🎣' : '🪝';
    document.getElementById('empty-text').textContent = currentTab === 'rods' ? 'Inga spön ännu' : 'Inga beten ännu';
    return;
  }

  if (currentTab === 'lures') {
    _allLures = items;
    renderGroupedLures(items, sb);
  } else {
    renderRods(items, sb);
  }
}

// ── Spön – vanligt rutnät ─────────────────────────────────────────
function renderRods(items, sb) {
  const grid  = document.getElementById('item-grid');
  const empty = document.getElementById('empty-lib');
  empty.style.display = 'none';
  grid.className      = 'equipment-grid';
  grid.style.display  = 'grid';
  grid.innerHTML      = items.map(item => lureCard(item, false)).join('');
  attachActions(grid, items, sb);
}

// ── Beten – grupperat per fiskart → betestyp ──────────────────────
function renderGroupedLures(items, sb) {
  const grid  = document.getElementById('item-grid');
  const empty = document.getElementById('empty-lib');

  buildFilterChips(items, sb);

  // Applicera filter
  const filtered = items.filter(l => {
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery) &&
        !(l.description ?? '').toLowerCase().includes(searchQuery)) return false;
    if (filterFish.size > 0 && !l.tags?.some(t => filterFish.has(t.toLowerCase()))) return false;
    if (filterType.size > 0 && !filterType.has((l.type ?? '').toLowerCase())) return false;
    return true;
  });

  if (!filtered.length) {
    grid.style.display  = 'none';
    empty.style.display = 'block';
    document.getElementById('empty-icon').textContent = '🪝';
    document.getElementById('empty-text').textContent = 'Inga beten matchar filtret';
    return;
  }

  // Bygg grupper: fiskart → typ → [beten]
  const groups  = new Map(); // fish → Map(type → item[])
  const noFish  = [];

  for (const lure of filtered) {
    const fishTags = (lure.tags ?? []).map(t => t.toLowerCase()).filter(Boolean);
    if (!fishTags.length) {
      noFish.push(lure);
    } else {
      for (const fish of fishTags) {
        if (!groups.has(fish)) groups.set(fish, new Map());
        const typeKey = (lure.type || 'Övrigt').toLowerCase();
        if (!groups.get(fish).has(typeKey)) groups.get(fish).set(typeKey, []);
        groups.get(fish).get(typeKey).push(lure);
      }
    }
  }

  let html = '';

  // Sortera fiskarter alfabetiskt
  for (const [fish, typeMap] of [...groups.entries()].sort()) {
    const total = new Set([...typeMap.values()].flat().map(l => l.id)).size;
    html += `<div class="lib-fish-section">
      <div class="lib-fish-header">
        <span>${cap(fish)}</span>
        <span class="lib-fish-count">${total} ${total === 1 ? 'bete' : 'beten'}</span>
      </div>`;

    for (const [type, lures] of [...typeMap.entries()].sort()) {
      html += `<p class="lib-type-header">${cap(type)}</p>
        <div class="equipment-grid">${lures.map(l => lureCard(l, true)).join('')}</div>`;
    }
    html += `</div>`;
  }

  if (noFish.length) {
    html += `<div class="lib-fish-section">
      <div class="lib-fish-header">
        <span>Utan kategori</span>
        <span class="lib-fish-count">${noFish.length}</span>
      </div>
      <div class="equipment-grid">${noFish.map(l => lureCard(l, true)).join('')}</div>
    </div>`;
  }

  empty.style.display = 'none';
  grid.className      = '';
  grid.style.display  = 'block';
  grid.innerHTML      = html;
  attachActions(grid, filtered, sb);
}

// ── Filterknappar ─────────────────────────────────────────────────
function buildFilterChips(items, sb) {
  const fishSet = new Set();
  const typeSet = new Set();
  items.forEach(l => {
    (l.tags ?? []).forEach(t => t && fishSet.add(t.toLowerCase()));
    if (l.type) typeSet.add(l.type.toLowerCase());
  });

  const renderChips = (containerId, wrapId, dataSet, activeSet, onToggle) => {
    const wrap = document.getElementById(wrapId);
    const cont = document.getElementById(containerId);
    if (!dataSet.size) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    cont.innerHTML = [...dataSet].sort().map(v =>
      `<button class="filter-chip ${activeSet.has(v) ? 'active' : ''}" data-val="${v}">${cap(v)}</button>`
    ).join('');
    cont.querySelectorAll('.filter-chip').forEach(btn =>
      btn.addEventListener('click', () => {
        const v = btn.dataset.val;
        activeSet.has(v) ? activeSet.delete(v) : activeSet.add(v);
        onToggle();
      }));
  };

  renderChips('filter-fish-chips', 'filter-fish-wrap', fishSet, filterFish,
    () => renderGroupedLures(_allLures, sb));
  renderChips('filter-type-chips', 'filter-type-wrap', typeSet, filterType,
    () => renderGroupedLures(_allLures, sb));
}

// ── Kort-mall ─────────────────────────────────────────────────────
function lureCard(item, isLure) {
  const imgContent = item.image_url
    ? `<img src="${item.image_url}" alt="${item.name}">`
    : `<span style="font-size:36px">${isLure ? '🪝' : '🎣'}</span>`;
  const chips = isLure
    ? [item.color, item.size, item.type].filter(Boolean)
        .map(v => `<span class="lure-chip">${v}</span>`).join('')
    : '';
  return `
    <div class="lure-card card-interactive">
      <div class="lure-img-wrap">
        ${imgContent}
        ${chips ? `<div class="lure-overlay">${chips}</div>` : ''}
      </div>
      <div class="lure-body">
        <div class="lure-name">${item.name}</div>
        ${item.description ? `<div class="lure-reason">${item.description}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn btn-ghost btn-sm" data-edit="${item.id}" style="flex:1">Redigera</button>
          <button class="btn btn-sm" data-del="${item.id}" style="flex:1;background:var(--error-dim);color:var(--error);border-radius:var(--radius-sm)">Ta bort</button>
        </div>
      </div>
    </div>`;
}

// ── Koppla redigera/ta bort ───────────────────────────────────────
function attachActions(container, items, sb) {
  container.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(items.find(i => i.id === btn.dataset.edit));
    }));
  container.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const card = btn.closest('.lure-card');
      if (card) { card.style.opacity = '0'; card.style.transition = 'opacity .2s'; }
      await sb.from(currentTab).delete().eq('id', btn.dataset.del);
      setTimeout(() => loadItems(sb), 220);
    }));
}

function openModal(item) {
  editingId = item?.id ?? null;
  tags      = [...(item?.tags ?? [])];
  imageUrl  = item?.image_url ?? null;

  document.getElementById('modal-title').textContent =
    item ? `Redigera ${currentTab === 'rods' ? 'spö' : 'bete'}`
         : `Nytt ${currentTab === 'rods' ? 'spö' : 'bete'}`;

  // Återställ AI-styling på fält
  ['item-name','item-desc','item-type','item-color','item-size'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; }
  });

  document.getElementById('img-preview-wrap').style.display = 'none';
  document.getElementById('img-buttons').style.display      = 'grid';
  document.getElementById('ai-suggestion-banner').style.display = 'none';
  document.getElementById('ai-analyzing').style.display     = 'none';
  document.getElementById('file-camera').value  = '';
  document.getElementById('file-gallery').value = '';

  document.getElementById('item-name').value = item?.name ?? '';
  document.getElementById('item-desc').value = item?.description ?? '';

  const lureFields = document.getElementById('lure-fields');
  if (currentTab === 'lures') {
    lureFields.style.display = 'grid';
    document.getElementById('item-type').value  = item?.type  ?? '';
    document.getElementById('item-color').value = item?.color ?? '';
    document.getElementById('item-size').value  = item?.size  ?? '';
  } else {
    lureFields.style.display = 'none';
  }

  renderTags();
  renderImagePreview();
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function addTag() {
  const input = document.getElementById('tag-input');
  const t = input.value.trim().toLowerCase();
  if (t && !tags.includes(t)) { tags.push(t); renderTags(); }
  input.value = '';
}

function renderTags() {
  document.getElementById('tag-list').innerHTML = tags.map(t =>
    `<span class="tag" style="cursor:pointer" onclick="(()=>{window.__removeTag('${t}');this.remove()})()">${t} ×</span>`
  ).join('');
  window.__removeTag = tag => { tags = tags.filter(x => x !== tag); };
}

function renderImagePreview() {
  if (imageUrl) {
    document.getElementById('img-preview').src            = imageUrl;
    document.getElementById('img-preview-wrap').style.display = 'block';
    document.getElementById('img-buttons').style.display      = 'none';
  } else {
    document.getElementById('img-preview-wrap').style.display = 'none';
    document.getElementById('img-buttons').style.display      = 'grid';
  }
}

function showImagePreview(src) {
  document.getElementById('img-preview').src  = src;
  document.getElementById('img-preview-wrap').style.display = 'block';
  document.getElementById('img-buttons').style.display      = 'none';
}

// analyzeImageBlob – tar en Blob (från cropper eller FileReader) och kör Claude Vision
async function analyzeImageBlob(blob) {
  const analyzing = document.getElementById('ai-analyzing');
  const banner    = document.getElementById('ai-suggestion-banner');

  analyzing.style.display = 'flex';
  banner.style.display    = 'none';

  try {
    // Blob → base64 (ingen extra komprimering behövs – cropper ger redan rätt storlek)
    const base64 = await blobToBase64(blob);

    const res = await fetch('/api/analyze-image', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ imageBase64: base64, mediaType: 'image/jpeg' }),
    });

    const suggestion = await res.json();
    if (!res.ok || suggestion.error) throw new Error(suggestion.error || `HTTP ${res.status}`);

    applyAISuggestion(suggestion);
    banner.style.display = 'flex';
    document.getElementById('item-name')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (err) {
    const msg = (err.message ?? '').toLowerCase();
    const hintText = msg.includes('missing') || msg.includes('api key') || msg.includes('401')
      ? 'API-nyckel saknas i Vercel – lägg till ANTHROPIC_API_KEY'
      : `HTTP-fel: ${err.message}`;
    analyzing.innerHTML = `
      <p style="font-size:.78rem;color:var(--error);display:flex;align-items:center;gap:6px">
        <i data-lucide="alert-circle" style="width:14px;height:14px;stroke:currentColor;flex-shrink:0"></i>
        AI-analys misslyckades – ${hintText}
      </p>`;
    if (window.lucide) lucide.createIcons();
    setTimeout(() => { analyzing.style.display = 'none'; }, 4000);
    return;
  }

  analyzing.style.display = 'none';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}



function applyAISuggestion(s) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val) {
      el.value = val;
      el.style.borderColor = 'var(--accent)';
      el.style.boxShadow   = '0 0 0 2px var(--accent-dim)';
    }
  };

  set('item-name',  s.name);
  set('item-desc',  s.description);
  set('item-type',  s.type);
  set('item-color', s.color);
  set('item-size',  s.size);

  // Lägg till fisk-taggar (filtrera bort tomma och platshållare som "...")
  if (Array.isArray(s.fish_tags)) {
    s.fish_tags.forEach(t => {
      const tag = t.toLowerCase().trim();
      if (tag && tag !== '...' && tag.length > 1 && !tags.includes(tag)) tags.push(tag);
    });
    renderTags();
  }

  // Visa alltid lure-fält om betetyp identifieras
  if (s.type) {
    document.getElementById('lure-fields').style.display = 'grid';
  }

  // Visa lure-fält om typ identifieras som bete
  const lureTypes = ['wobler','jig','spinnare','fluga','jigg','dropshot','softbait','bete'];
  if (s.type && lureTypes.some(lt => s.type.toLowerCase().includes(lt))) {
    document.getElementById('lure-fields').style.display = 'grid';
  }
}

async function saveItem(sb) {
  const name = document.getElementById('item-name').value.trim();
  if (!name) return;
  const { data: { user } } = await sb.auth.getUser();
  const btn = document.getElementById('btn-save');
  btn.textContent = 'Sparar…'; btn.disabled = true;

  const payload = {
    name, user_id: user.id,
    description: document.getElementById('item-desc').value || null,
    tags, image_url: imageUrl,
    ...(currentTab === 'lures' ? {
      type:  document.getElementById('item-type').value  || null,
      color: document.getElementById('item-color').value || null,
      size:  document.getElementById('item-size').value  || null,
    } : {}),
  };

  if (editingId) await getSupabase().from(currentTab).update(payload).eq('id', editingId);
  else           await getSupabase().from(currentTab).insert(payload);

  btn.textContent = 'Spara'; btn.disabled = false;
  closeModal();
  loadItems(sb);
}
