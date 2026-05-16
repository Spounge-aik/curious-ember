let mapInstance = null;

export function initMap(center, lakes, onSelect) {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }

  mapInstance = L.map('map').setView(center, 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapInstance);

  // Fix marker icons
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  lakes.forEach(lake => {
    const marker = L.marker([lake.lat, lake.lng]).addTo(mapInstance);
    marker.bindPopup(`
      <div style="text-align:center;min-width:110px">
        <b>${lake.name}</b><br>
        <small style="color:#6b7280">${lake.county}</small>
        ${lake.distance_km != null ? `<br><small>${lake.distance_km} km bort</small>` : ''}
      </div>`);
    marker.on('click', () => onSelect(lake));
  });
}

export function destroyMap() {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
}
