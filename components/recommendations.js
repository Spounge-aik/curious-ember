export function renderRecommendations(rec) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('rec-content').style.display   = 'block';

  // Tip
  if (rec.general_tip) {
    document.getElementById('tip-text').textContent = rec.general_tip;
    document.getElementById('tip-box').style.display = 'block';
  }

  const rodsSection  = document.getElementById('rods-section');
  const luresSection = document.getElementById('lures-section');
  const emptyRec     = document.getElementById('empty-rec');

  if (rec.rods?.length) {
    document.getElementById('rods-list').innerHTML = rec.rods.map(r => recCard(r, '🎣')).join('');
    rodsSection.style.display = 'block';
  }
  if (rec.lures?.length) {
    document.getElementById('lures-list').innerHTML = rec.lures.map(l => recCard(l, '🪝')).join('');
    luresSection.style.display = 'block';
  }
  if (!rec.rods?.length && !rec.lures?.length) {
    emptyRec.style.display = 'block';
  }
}

function recCard(item, defaultEmoji) {
  const img = item.image_url
    ? `<img src="${item.image_url}" alt="${item.name}" style="width:100%;height:100%;object-fit:contain">`
    : defaultEmoji;
  return `
    <div class="card rec-card">
      <div class="rec-thumb">${img}</div>
      <div>
        <div class="rec-rank">#${item.rank}</div>
        <div class="rec-name">${item.name}</div>
        <div class="rec-reason">${item.reason}</div>
      </div>
    </div>`;
}
