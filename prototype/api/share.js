// 分享連結：把作品快照（JSON）和它用到的錄音／上傳檔存到 Vercel Blob，回一個短 ID。
// POST  api/share            body: { project }                 → { id, url }
// PUT   api/share?file=名稱   body: 音檔二進位（≤ 4 MB）          → { url }
// GET   api/share?id=XXXX                                      → { project }
import { put, list } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { readJson } from './_shared.js';

export const config = { maxDuration: 60 };
const MAX_FILE = 4 * 1024 * 1024;
const ID_RE = /^[A-Za-z0-9]{6,16}$/;
const ALPHA = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newId(){ const b = randomBytes(8); let s = ''; for (let i = 0; i < 8; i++) s += ALPHA[b[i] % ALPHA.length]; return s; }

async function rawBody(req){
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');
  const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks);
}
const TYPES = ['drum', 'synth', 'texture', 'sample'];
const BLOB_URL = /^https:\/\/[\w-]+\.public\.blob\.vercel-storage\.com\//;
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
function validProject(p){
  if (!isObj(p) || !isObj(p.master) || !Array.isArray(p.tracks) || p.tracks.length > 8) return false;
  return p.tracks.every(t => isObj(t) && TYPES.includes(t.type) && isObj(t.mixer)
    && (t.type !== 'drum' || (Array.isArray(t.grid) && isObj(t.levels)))
    && (t.type !== 'synth' || (Array.isArray(t.grid) && isObj(t.sound)))
    && (t.type !== 'texture' || isObj(t.params))
    && (t.type !== 'sample' || !t.remote || (typeof t.remote === 'string' && BLOB_URL.test(t.remote))));
}
const noStore = () => !(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID));

export default async function handler(req, res){
  if (noStore()) return res.status(503).json({ error: 'no_store', message: '分享功能的儲存空間還沒接上（缺 BLOB_READ_WRITE_TOKEN）' });
  try {
    if (req.method === 'GET') {
      const id = String((req.query || {}).id || ''); if (!ID_RE.test(id)) return res.status(400).json({ error: 'bad_id', message: '連結格式不對' });
      const { blobs } = await list({ prefix: 'shares/' + id + '.json', limit: 1 });
      if (!blobs.length) return res.status(404).json({ error: 'not_found', message: '找不到這個作品，可能連結打錯或已被刪除' });
      const r = await fetch(blobs[0].url, { cache: 'no-store' }); if (!r.ok) return res.status(502).json({ error: 'upstream', message: '讀取失敗' });
      const data = await r.json();
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const name = String((req.query || {}).file || 'audio').replace(/[^\w.\-一-鿿]+/g, '_').slice(0, 80);
      const body = await rawBody(req);
      if (!body.length) return res.status(400).json({ error: 'empty', message: '沒有收到檔案' });
      if (body.length > MAX_FILE) return res.status(413).json({ error: 'too_large', message: '單檔最多 4 MB' });
      const type = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0];
      const blob = await put('files/' + newId() + '-' + name, body, { access: 'public', addRandomSuffix: true, contentType: type });
      return res.status(200).json({ url: blob.url, size: body.length });
    }
    if (req.method === 'POST') {
      const data = readJson(req); const p = data && data.project;
      if (!validProject(p)) return res.status(400).json({ error: 'bad_project', message: '作品資料不完整' });
      const json = JSON.stringify({ project: p, sharedAt: new Date().toISOString(), v: 1 });
      if (json.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'too_large', message: '作品太大' });
      const id = newId();
      await put('shares/' + id + '.json', json, { access: 'public', addRandomSuffix: false, contentType: 'application/json' });
      return res.status(200).json({ id });
    }
    return res.status(405).json({ error: 'method', message: '不支援的方法' });
  } catch (e) {
    return res.status(502).json({ error: 'upstream', message: '儲存服務出錯：' + ((e && e.message) || String(e)).slice(0, 200) });
  }
}
