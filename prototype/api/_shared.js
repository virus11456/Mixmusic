// 兩個 AI 路由共用的小工具
export function readJson(req){
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}
export function userKey(req, header){
  const v = req.headers[header];
  return (Array.isArray(v) ? v[0] : v || '').toString().trim();
}
export const clamp = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
