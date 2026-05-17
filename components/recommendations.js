export function renderRecommendations(rec) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('rec-content').style.display   = 'block';

  if (rec.general_tip) {
    document.getElementById('tip-text').textContent   = rec.general_tip;
    document.getElementById('tip-box').style.display  = 'block';
  }

  const rodsSection  = document.getElementById('rods-section');
  const luresSection = document.getElementById('lures-section');
  const emptyRec     = document.getElementById('empty-rec');

  if (rec.rods?.length) {
    document.getElementById('rods-list').innerHTML =
      rec.rods.map(r => recCard(r, '🎣')).join('');
    rodsSection.style.display = 'block';
  }

  if (rec.lures?.length) {
    document.getElementById('lures-list').innerHTML =
      rec.lures.map((l, i) => lureCard(l, i === 0)).join('');
    luresSection.style.display = 'block';
  }

  if (!rec.rods?.length && !rec.lures?.length) {
    emptyRec.style.display = 'block';
  }
}

function recCard(item, defaultEmoji) {
  const img = item.image_url
    ? `<img src="${item.image_url}" alt="" style="width:100%;height:100%;object-fit:cover">`
    : defaultEmoji;
  return `
    <div class="card rec-card card-interactive">
      <div class="rec-thumb">${img}</div>
      <div style="flex:1;min-width:0">
        <div class="rec-rank">#${item.rank}</div>
        <div class="rec-name">${item.name}</div>
        <div class="rec-reason">${item.reason}</div>
      </div>
    </div>`;
}

function lureCard(item, isBest) {
  const img = item.image_url
    ? `<img src="${item.image_url}" alt="${item.name}">`
    : `<span style="font-size:36px">🪝</span>`;

  const chips = [item.color, item.size ? item.size + 'g' : null, item.type]
    .filter(Boolean)
    .map(v => `<span class="lure-chip">${v}</span>`).join('');

  return `
    <div class="lure-card card-interactive">
      <div class="lure-img-wrap">
        ${img}
        ${isBest ? `<div class="best-badge">Bäst val</div>` : ''}
        ${chips ? `<div class="lure-overlay">${chips}</div>` : ''}
      </div>
      <div class="lure-body">
        <div class="lure-name">#${item.rank} ${item.name}</div>
        <div class="lure-reason">${item.reason}</div>
      </div>
    </div>`;
}
