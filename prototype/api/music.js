// AI 生成一段音樂：文字描述 → 音檔（MP3）。走 ElevenLabs Music API，前端拿到後當成一軌。
import { readJson, userKey, clamp, sameOrigin } from './_shared.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'method', message: '只接受 POST' });
  const body = readJson(req);
  const prompt = String(body.prompt || '').trim().slice(0, 800);
  if (!prompt) return res.status(400).json({ error: 'empty', message: '先描述一下你想要的音樂' });
  const own = userKey(req, 'x-user-key');
  if (!own && !sameOrigin(req)) return res.status(403).json({ error: 'forbidden', message: '只能從 Mixmusic 網站使用' });
  const apiKey = own || process.env.ELEVENLABS_API_KEY || '';
  if (!apiKey) return res.status(503).json({ error: 'no_key', message: '還沒設定 AI 音樂的金鑰。請在「AI 設定」貼上你的 ElevenLabs API 金鑰，或由網站管理員在伺服器設定 ELEVENLABS_API_KEY。' });
  const seconds = Math.round(clamp(body.seconds, 10, 90, 30));
  const payload = { prompt, music_length_ms: seconds * 1000, model_id: 'music_v2', output_format: 'mp3_44100_128', force_instrumental: body.instrumental !== false };
  let upstream;
  try {
    upstream = await fetch('https://api.elevenlabs.io/v1/music', { method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(110_000) });
  } catch (e) {
    return res.status(502).json({ error: 'upstream', message: '音樂服務連不上：' + ((e && e.message) || String(e)).slice(0, 200) });
  }
  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => '')).slice(0, 300);
    if (upstream.status === 401 || upstream.status === 403) return res.status(401).json({ error: 'invalid_key', message: '金鑰不對或沒有權限，請檢查 AI 設定裡的 ElevenLabs 金鑰' });
    if (upstream.status === 402 || upstream.status === 429) return res.status(429).json({ error: 'quota', message: '這組金鑰的額度用完或太頻繁：' + detail });
    return res.status(502).json({ error: 'upstream', message: '音樂服務回傳錯誤 ' + upstream.status + '：' + detail });
  }
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(buf);
}
