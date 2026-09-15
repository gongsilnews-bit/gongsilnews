export function readMapMemory(key: string): any {
  try { return JSON.parse(localStorage.getItem(`map-memory:v1:${key}`) || 'null'); } catch { return null; }
}
export function writeMapMemory(key: string, value: unknown) {
  try { localStorage.setItem(`map-memory:v1:${key}`, JSON.stringify(value)); } catch { /* Private mode or storage full: keep map usable. */ }
}
export function mapStart(key: string, fallback: { lat: number; lng: number; level: number }) {
  const valid = (v: any) => v && Number.isFinite(v.lat) && Math.abs(v.lat) <= 90 && Number.isFinite(v.lng) && Math.abs(v.lng) <= 180 && Number.isInteger(v.level) && v.level >= 1 && v.level <= 14;
  const params = new URLSearchParams(window.location.search);
  const linked = { lat: Number(params.get('lat')), lng: Number(params.get('lng')), level: Number(params.get('level') || fallback.level) };
  if (params.has('lat') && params.has('lng') && valid(linked)) return linked;
  if (params.has('id') || params.has('mng')) return fallback;
  const saved = readMapMemory(key);
  return valid(saved) ? saved : fallback;
}
export function rememberMap(key: string, map: any) {
  const center = map.getCenter();
  writeMapMemory(key, { lat: center.getLat(), lng: center.getLng(), level: map.getLevel() });
}
