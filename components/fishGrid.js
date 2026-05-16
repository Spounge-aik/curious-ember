const FISH_EMOJI = {
  gadda:'🐟', abborre:'🐠', gos:'🐡', lake:'🦑', lax:'🐟',
  oring:'🐟', rodding:'🐟', harr:'🐟', karp:'🐡', rudor:'🐠',
  braxen:'🐟', id:'🐟', asp:'🐟', mal:'🦈', sik:'🐟',
  mort:'🐟', sarv:'🐟', bjorkna:'🐟',
};

export function renderFishGrid(fish, onSelect, selectedId) {
  return fish.map(f => `
    <div class="fish-card ${f.id === selectedId ? 'selected' : ''}"
         data-fish-id="${f.id}" onclick="window.__selectFish('${f.id}')">
      <div class="fish-emoji">${FISH_EMOJI[f.id] ?? '🐟'}</div>
      <div class="fish-name">${f.name}</div>
      ${f.description ? `<div class="fish-desc">${f.description}</div>` : ''}
    </div>`).join('');
}

export function setupFishGridCallback(fish, callback) {
  window.__selectFish = (id) => {
    const f = fish.find(x => x.id === id);
    if (f) callback(f);
  };
}
