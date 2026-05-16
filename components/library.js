import { getSupabase } from '../script.js';

let currentTab = 'rods';
let editingId  = null;
let tags       = [];
let imageUrl   = null;

export function initLibrary() {
  const sb = getSupabase();
  loadItems(sb);

  // Tab-switchar
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      loadItems(sb);
    });
  });

  // Öppna modal
  document.getElementById('btn-add').addEventListener('click', () => openModal(null));
  document.getElementById('btn-add-empty')?.addEventListener('click', () => openModal(null));
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', () => saveItem(sb));

  // Bild
  document.getElementById('file-input').addEventListener('change', e => uploadImage(sb, e.target.files[0]));

  // Taggar
  document.getElementById('btn-add-tag').addEventListener('click', addTag);
  document.getElementById('tag-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTag(); });

  // Stäng modal vid klick utanför
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
}

async function loadItems(sb) {
  const grid    = document.getElementById('item-grid');
  const spinner = document.getElementById('list-spinner');
  const empty   = document.getElementById('empty-lib');

  grid.style.display    = 'none';
  empty.style.display   = 'none';
  spinner.style.display = 'block';

  const { data: { user } } = await sb.auth.getUser();
  if (!user) { location.href = 'auth.html'; return; }

  const { data } = await sb.from(currentTab).select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const items = data ?? [];

  document.getElementById('rod-count').textContent  = currentTab === 'rods'  ? items.length : document.getElementById('rod-count').textContent;
  document.getElementById('lure-count').textContent = currentTab === 'lures' ? items.length : document.getElementById('lure-count').textContent;

  spinner.style.display = 'none';

  if (!items.length) {
    empty.style.display = 'block';
    document.getElementById('empty-icon').textContent = currentTab === 'rods' ? '🎣' : '🪝';
    document.getElementById('empty-text').textContent = currentTab === 'rods' ? 'Inga spön ännu' : 'Inga beten ännu';
    return;
  }

  grid.style.display = 'grid';
  grid.innerHTML = items.map(item => itemCard(item)).join('');

  // Koppla knappar
  grid.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openModal(items.find(i => i.id === btn.dataset.edit))));
  grid.querySelectorAll('[data-del]').forEach(btn =>
    btn.addEventListener('click', async () => {
      await sb.from(currentTab).delete().eq('id', btn.dataset.del);
      loadItems(sb);
    }));
}

function itemCard(item) {
  const img = item.image_url
    ? `<img src="${item.image_url}" alt="${item.name}" style="width:100%;height:120px;object-fit:contain;background:#f0f9ff;border-radius:14px 14px 0 0;padding:8px">`
    : `<div style="height:120px;background:#e0f2fe;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:center;font-size:40px">${currentTab === 'rods' ? '🎣' : '🪝'}</div>`;
  return `
    <div class="card">
      ${img}
      <div class="card-body">
        <p style="font-weight:600;font-size:14px;margin-bottom:4px">${item.name}</p>
        ${item.description ? `<p style="font-size:12px;color:#6b7280">${item.description}</p>` : ''}
        ${(item.tags||[]).map(t => `<span class="tag" style="margin-top:4px;font-size:11px">${t}</span>`).join(' ')}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-outline" data-edit="${item.id}" style="flex:1;padding:8px;font-size:13px">Redigera</button>
          <button class="btn" data-del="${item.id}" style="flex:1;padding:8px;font-size:13px;background:#fef2f2;color:#dc2626;border-radius:12px">Ta bort</button>
        </div>
      </div>
    </div>`;
}

function openModal(item) {
  editingId = item?.id ?? null;
  tags      = [...(item?.tags ?? [])];
  imageUrl  = item?.image_url ?? null;

  document.getElementById('modal-title').textContent = item
    ? `Redigera ${currentTab === 'rods' ? 'spö' : 'bete'}`
    : `Nytt ${currentTab === 'rods' ? 'spö' : 'bete'}`;

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
    `<span class="tag" style="cursor:pointer" onclick="this.remove();window.__removeTag('${t}')">${t} ×</span>`
  ).join('');
  window.__removeTag = tag => { tags = tags.filter(x => x !== tag); };
}

function renderImagePreview() {
  const preview     = document.getElementById('img-preview');
  const placeholder = document.getElementById('img-placeholder');
  if (imageUrl) {
    preview.src = imageUrl;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

async function uploadImage(sb, file) {
  if (!file) return;
  const { data: { user } } = await sb.auth.getUser();
  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error } = await sb.storage.from('equipment-images').upload(path, file);
  if (!error) {
    const { data } = sb.storage.from('equipment-images').getPublicUrl(path);
    imageUrl = data.publicUrl;
    renderImagePreview();
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

  if (editingId) {
    await getSupabase().from(currentTab).update(payload).eq('id', editingId);
  } else {
    await getSupabase().from(currentTab).insert(payload);
  }

  btn.textContent = 'Spara'; btn.disabled = false;
  closeModal();
  loadItems(sb);
}
