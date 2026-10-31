export function filterProduce(items, {month, category = 'all', query = '', mode = 'seasonal'}) {
  const q = query.trim().toLocaleLowerCase();
  return items.filter(item => (mode === 'all' || item.months.includes(month)) &&
    (category === 'all' || item.category === category) &&
    (!q || [item.name, item.origins, ...(item.aliases || [])].join(' ').toLocaleLowerCase().includes(q)));
}

export function monthLabel(months) {
  const sorted = [...new Set(months)].sort((a,b) => a-b);
  if (sorted.length === 12) return '全年有产区上市';
  const groups = [];
  for (const month of sorted) {
    const last = groups.at(-1);
    if (last && last.at(-1) + 1 === month) last.push(month);
    else groups.push([month]);
  }
  return groups.map(g => g.length > 1 ? `${g[0]}–${g.at(-1)}月` : `${g[0]}月`).join('、');
}

export function nearestCity(latitude, longitude, cities) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) return null;
  const rad = n => n * Math.PI / 180;
  let best = null;
  for (const city of cities) {
    const a = Math.sin(rad(city.lat-latitude)/2)**2 + Math.cos(rad(latitude))*Math.cos(rad(city.lat))*Math.sin(rad(city.lon-longitude)/2)**2;
    const distance = 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1,a)),Math.sqrt(Math.max(0,1-a)));
    if (!best || distance < best.distance) best = {...city, distance};
  }
  // shortcut: a city-centre match is approximate; use administrative polygons if district-level accuracy becomes necessary.
  return best && best.distance < 120 ? best : null;
}
