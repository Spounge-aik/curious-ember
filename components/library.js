import { getSupabase } from '../script.js';

let currentTab = 'rods';
let editingId  = null;
let tags       = [];
let imageUrl   = null;

export function initLibrary() {
  const sb = getSupabase();
  loadItems(sb);

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      loadItems(sb);
    });
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

  // Kamera & galleri
  document.getElementById('btn-camera').addEventListener('click', () =>
    document.getElementById('file-camera').click());
  document.getElementById('btn-gallery').addEventListener('click', () =>
    document.getElementById('file-gallery').click());
  document.getElementById('file-camera').addEventListener('change', e =>
    handleImageFile(sb, e.target.files[0]));
  document.getElementById('file-gallery').addEventListener('change', e =>
    handleImageFile(sb, e.target.files[0]));

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

async function loadItems(sb) {
  const grid    = document.getElementById('item-grid');
  const spinner = document.getElementById('list-spinner');
  const empty   = document.getElementById('empty-lib');

  grid.style.display  = 'none';
  empty.style.display = 'none';
  spinner.style.display = 'block';

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

  grid.style.display = 'grid';
  grid.innerHTML = items.map(item => itemCard(item)).join('');

  grid.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(items.find(i => i.id === btn.dataset.edit));
    }));
  grid.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await sb.from(currentTab).delete().eq('id', btn.dataset.del);
      loadItems(sb);
    }));
}

function itemCard(item) {
  const isLure = currentTab === 'lures';
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
        ${(item.tags||[]).length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${item.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : ''}
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn btn-ghost btn-sm" data-edit="${item.id}" style="flex:1">Redigera</button>
          <button class="btn btn-sm" data-del="${item.id}" style="flex:1;background:var(--error-dim);color:var(--error);border-radius:var(--radius-sm)">Ta bort</button>
        </div>
      </div>
    </div>`;
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

function showImagePreview(src) {
  document.getElementById('img-preview').src  = src;
  document.getElementById('img-preview-wrap').style.display = 'block';
  document.getElementById('img-buttons').style.display      = 'none';
}

async function handleImageFile(sb, file) {
  if (!file) return;

  // Visa preview direkt
  const reader = new FileReader();
  reader.onload = e => showImagePreview(e.target.result);
  reader.readAsDataURL(file);

  // Ladda upp till Supabase
  const { data: { user } } = await sb.auth.getUser();
  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error } = await sb.storage.from('equipment-images').upload(path, file);
  if (!error) {
    const { data } = sb.storage.from('equipment-images').getPublicUrl(path);
    imageUrl = data.publicUrl;
  }

  // Analysera med Claude Vision
  await analyzeImage(file);
}

async function analyzeImage(file) {
  const analyzing = document.getElementById('ai-analyzing');
  const banner    = document.getElementById('ai-suggestion-banner');
  analyzing.style.display = 'block';
  banner.style.display    = 'none';

  try {
    // Konvertera till base64
    const base64 = await fileToBase64(file);
    const mediaType = file.type || 'image/jpeg';

    const res  = await fetch('/api/analyze-image', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ imageBase64: base64, mediaType }),
    });

    if (!res.ok) throw new Error('API-fel');
    const suggestion = await res.json();
    applyAISuggestion(suggestion);
    banner.style.display = 'flex';
  } catch {
    // Tyst fel — låt användaren fylla i manuellt
  } finally {
    analyzing.style.display = 'none';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;

    // Komprimera stora bilder innan base64
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => reader.readAsDataURL(blob), 'image/jpeg', 0.85);
    };
    img.src = URL.createObjectURL(file);
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

  // Lägg till fisk-taggar
  if (Array.isArray(s.fish_tags)) {
    s.fish_tags.forEach(t => {
      const tag = t.toLowerCase().trim();
      if (tag && !tags.includes(tag)) tags.push(tag);
    });
    renderTags();
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
