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

// 只讓自己的網站呼叫會花錢的 AI 路由（擋掉外部 curl 直接燒伺服器金鑰；使用者自帶金鑰則不限制）
export function sameOrigin(req){
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
  const src = String(req.headers.origin || req.headers.referer || '');
  if (!host || !src) return false;
  try { return new URL(src).host.toLowerCase() === host; } catch (e) { return false; }
}
