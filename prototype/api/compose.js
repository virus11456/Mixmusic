// AI 幫我編曲：文字描述 → Mixmusic 專案規格（JSON）。用 Claude 結構化輸出，前端再轉成軌道。
import Anthropic from '@anthropic-ai/sdk';
import { readJson, userKey, clamp, sameOrigin } from './_shared.js';

export const config = { maxDuration: 60 };

const DRUMS = ['kick', 'snare', 'hat', 'clap', 'tom', 'shaker'];
const SHAPES = ['sine', 'square', 'sawtooth', 'triangle'];
const TEXTURES = [
  'r:rain', 'r:rainthunder', 'r:waves', 'r:river', 'r:fire', 'r:wind', 'r:birds', 'r:morning', 'r:crickets', 'r:nightforest',
  'r:park', 'r:traffic', 'r:citynight', 'r:crowd', 'r:cafe', 'r:subway',
  '雨聲', '雷聲', '風聲', '海浪', '溪流', '鳥叫', '蟲鳴', '營火', '心跳', '白噪音',
];
const STEPS = { type: 'array', items: { type: 'integer', enum: [0, 1] } };
const NUM = { type: 'number' };
const drumProps = Object.fromEntries(DRUMS.map(d => [d, STEPS]));
export const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    bpm: { type: 'integer' },
    drum: {
      type: 'object',
      properties: { enabled: { type: 'boolean' }, ...drumProps, tune: { type: 'integer' }, decay: NUM, volume: NUM, reverb: NUM },
      required: ['enabled', ...DRUMS, 'tune', 'decay', 'volume', 'reverb'], additionalProperties: false,
    },
    synths: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, shape: { type: 'string', enum: SHAPES }, pitch: { type: 'integer' },
          brightness: NUM, attack: NUM, release: NUM, vibrato: NUM,
          notes: { type: 'array', items: { type: 'object', properties: { pitch: { type: 'integer' }, step: { type: 'integer' } }, required: ['pitch', 'step'], additionalProperties: false } },
          volume: NUM, pan: NUM, reverb: NUM, delay: NUM, distortion: NUM,
        },
        required: ['name', 'shape', 'pitch', 'brightness', 'attack', 'release', 'vibrato', 'notes', 'volume', 'pan', 'reverb', 'delay', 'distortion'], additionalProperties: false,
      },
    },
    textures: {
      type: 'array',
      items: {
        type: 'object',
        properties: { preset: { type: 'string', enum: TEXTURES }, density: NUM, movement: NUM, volume: NUM, reverb: NUM },
        required: ['preset', 'density', 'movement', 'volume', 'reverb'], additionalProperties: false,
      },
    },
  },
  required: ['name', 'bpm', 'drum', 'synths', 'textures'], additionalProperties: false,
};

const SYSTEM = `你是 Mixmusic 的編曲助手。使用者是完全沒學過音樂的人，會用一句話描述想要的感覺，你要把它變成一個可以直接播放的小作品。

規格說明：
- 一個作品是 1 小節、16 格（16 分音符）循環；格子陣列長度 16，1 = 響、0 = 不響。第 0、4、8、12 格是四拍的正拍。
- 鼓：kick 大鼓、snare 小鼓、hat 腳踏鈸、clap 拍手、tom、shaker 沙鈴。tune 是整體音調（-12～12 半音），decay 是長短（0.5～2，1 為正常）。不需要鼓就 enabled=false 並把所有格子填 0。
- 合成器最多 2 軌（例如一軌貝斯、一軌旋律）。shape：sine 圓潤、square 明亮復古、sawtooth 粗糙厚實、triangle 柔和。pitch 是整體移調（-24～24 半音，貝斯通常 -12 或 -24）。brightness/attack/release/vibrato 0～1。
- notes 是旋律格子：pitch 0～7 對應五聲音階 Do Re Mi Sol La 高Do 高Re 高Mi，step 0～15。每軌 2～16 個音，貝斯通常 4～8 個落在正拍，旋律可以多一點。
- 環境音最多 2 軌。preset 以 r: 開頭的是真實錄音（優先用，比較好聽）：r:rain 雨、r:rainthunder 雷雨、r:waves 海浪、r:river 溪流、r:fire 營火、r:wind 風、r:birds 鳥叫、r:morning 清晨、r:crickets 蟲鳴、r:nightforest 夜晚森林、r:park 公園、r:traffic 街道車流、r:citynight 城市夜晚、r:crowd 人群、r:cafe 咖啡廳、r:subway 地鐵。其餘是程式合成：雨聲、雷聲、風聲、海浪、溪流、鳥叫、蟲鳴、營火、心跳、白噪音。真實錄音的 density 給 1、movement 給 0；合成的 density 0.3～0.8。
- 每軌 volume 0～1（鼓 0.7～0.9、貝斯 0.6～0.8、旋律 0.4～0.7、環境音 0.2～0.5）、pan -1～1、reverb/delay/distortion 0～1（通常 0～0.4）。
- bpm 60～180。name 給一個 2～8 個字的中文作品名。

風格提示：lo-fi／放鬆 → 70～90 bpm、triangle 或 sine、reverb 多、hat 稀疏；電子舞曲 → 120～130 bpm、kick 四個正拍、hat 反拍、sawtooth；嘻哈 → 85～95 bpm、kick 切分、snare 在第 4、12 格；復古電玩 → square、短 release、hat 密集；神秘／電影感 → 慢、sine 高音加 vibrato、reverb 大、環境音用雷雨或風。
只輸出符合 schema 的 JSON。`;

export function sanitize(spec){
  const steps = (a) => { const out = Array(16).fill(0); if (Array.isArray(a)) a.slice(0, 16).forEach((v, i) => { out[i] = v ? 1 : 0; }); return out; };
  const d = spec.drum || {};
  const drum = { enabled: d.enabled !== false, tune: Math.round(clamp(d.tune, -12, 12, 0)), decay: clamp(d.decay, 0.5, 2, 1), volume: clamp(d.volume, 0, 1, 0.8), reverb: clamp(d.reverb, 0, 1, 0) };
  DRUMS.forEach(k => { drum[k] = steps(d[k]); });
  const synths = (Array.isArray(spec.synths) ? spec.synths : []).slice(0, 2).map((s, i) => ({
    name: String(s.name || (i === 0 ? '貝斯' : '旋律')).slice(0, 20),
    shape: SHAPES.includes(s.shape) ? s.shape : 'triangle',
    pitch: Math.round(clamp(s.pitch, -24, 24, 0)), brightness: clamp(s.brightness, 0, 1, 0.5), attack: clamp(s.attack, 0, 1, 0.05),
    release: clamp(s.release, 0, 1, 0.3), vibrato: clamp(s.vibrato, 0, 1, 0),
    notes: (Array.isArray(s.notes) ? s.notes : []).slice(0, 48).map(n => ({ pitch: Math.round(clamp(n.pitch, 0, 7, 0)), step: Math.round(clamp(n.step, 0, 15, 0)) })),
    volume: clamp(s.volume, 0, 1, 0.6), pan: clamp(s.pan, -1, 1, 0), reverb: clamp(s.reverb, 0, 1, 0.1), delay: clamp(s.delay, 0, 1, 0), distortion: clamp(s.distortion, 0, 1, 0),
  }));
  const textures = (Array.isArray(spec.textures) ? spec.textures : []).filter(t => TEXTURES.includes(t.preset)).slice(0, 2).map(t => ({
    preset: t.preset, density: clamp(t.density, 0, 1, t.preset.startsWith('r:') ? 1 : 0.6), movement: clamp(t.movement, 0, 1, 0),
    volume: clamp(t.volume, 0, 1, 0.35), reverb: clamp(t.reverb, 0, 1, 0),
  }));
  return { name: String(spec.name || 'AI 作品').slice(0, 30), bpm: Math.round(clamp(spec.bpm, 60, 180, 100)), drum, synths, textures };
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'method', message: '只接受 POST' });
  const body = readJson(req);
  const prompt = String(body.prompt || '').trim().slice(0, 500);
  if (!prompt) return res.status(400).json({ error: 'empty', message: '先描述一下你想要的聲音' });
  const own = userKey(req, 'x-user-key');
  if (!own && !sameOrigin(req)) return res.status(403).json({ error: 'forbidden', message: '只能從 Mixmusic 網站使用' });
  const apiKey = own || process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) return res.status(503).json({ error: 'no_key', message: '還沒設定 AI 編曲的金鑰。請在「AI 設定」貼上你的 Anthropic API 金鑰，或由網站管理員在伺服器設定 ANTHROPIC_API_KEY。' });
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 50_000 });
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });
    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'refused', message: '這個描述 AI 不能處理，換個說法再試一次' });
    const text = (response.content.find(b => b.type === 'text') || {}).text || '';
    let spec; try { spec = JSON.parse(text); } catch (e) { spec = null; }
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return res.status(502).json({ error: 'bad_json', message: 'AI 回了看不懂的東西，再試一次' });
    return res.status(200).json({ spec: sanitize(spec), usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } });
  } catch (e) {
    const status = e && e.status;
    if (status === 401 || status === 403) return res.status(401).json({ error: 'invalid_key', message: '金鑰不對或沒有權限，請檢查 AI 設定裡的金鑰' });
    if (status === 429) return res.status(429).json({ error: 'rate_limited', message: 'AI 現在太忙，等幾秒再試' });
    if (status === 400) return res.status(400).json({ error: 'bad_request', message: 'AI 服務拒絕了這個請求：' + ((e && e.message) || '').slice(0, 200) });
    return res.status(502).json({ error: 'upstream', message: 'AI 服務暫時連不上：' + ((e && e.message) || String(e)).slice(0, 200) });
  }
}
