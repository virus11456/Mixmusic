# 內建真實音效：來源與授權

全部 16 個音效都是免費授權、可商用、不需標示作者。每個檔案都經過剪輯：取 20 秒（蟲鳴 9 秒）、頭尾交叉淡化做成無縫循環、響度統一到 -20 LUFS、轉成 96 kbps MP3。

## CC0（公有領域貢獻，完全無限制）— 來自 OpenGameArt.org

| 檔案 | App 裡的名稱 | 原作品 | 作者 | 來源頁 |
|---|---|---|---|---|
| rain.mp3 | 雨 | AMB Rain Loop 1 | Kresiek The Furry | https://opengameart.org/content/amb-rain-loop-1 |
| rainthunder.mp3 | 雷雨 | Rain + Long Thunder | WuxiaScrub | https://opengameart.org/content/rain-long-thunder |
| river.mp3 | 溪流 | Park ambiences（park_ambience_river） | Thimras | https://opengameart.org/content/park-ambiences |
| fire.mp3 | 營火 | Fireplace Sound loop | PagDev | https://opengameart.org/content/fireplace-sound-loop |
| wind.mp3 | 風 | Mild Wind Background Noise | Bashar3A | https://opengameart.org/content/mild-wind-background-noise |
| birds.mp3 | 鳥叫 | Ambient Bird Sounds | isaiah658 | https://opengameart.org/content/ambient-bird-sounds |
| morning.mp3 | 清晨 | AMB Morning Sounds (Perfect Loop) | Kresiek The Furry | https://opengameart.org/content/amb-morning-sounds-perfect-loop |
| crickets.mp3 | 蟲鳴 | Crickets Ambient Noise - loopable | Wolfgang_ | https://opengameart.org/content/crickets-ambient-noise-loopable |
| park.mp3 | 公園 | Park ambiences（park_ambience_birds） | Thimras | https://opengameart.org/content/park-ambiences |
| traffic.mp3 | 街道車流 | High traffic road sounds | IgnasD | https://opengameart.org/content/high-traffic-road-sounds |
| crowd.mp3 | 人群 | Crowd Shouting/Speaking Ambience | StarNinjas | https://opengameart.org/content/crowd-shoutingspeaking-ambience |

## Mixkit Sound Effects Free License — 來自 mixkit.co

可免費用於商業與非商業專案、不需標示作者；不可單獨轉售或當成音效庫再散布。條款全文：https://mixkit.co/license/#sfxFree

| 檔案 | App 裡的名稱 | 原作品 | 來源頁 |
|---|---|---|---|
| waves.mp3 | 海浪 | Sea waves loop (#1196) | https://mixkit.co/free-sound-effects/sea/ |
| cafe.mp3 | 咖啡廳 | Restaurant crowd talking ambience (#444) | https://mixkit.co/free-sound-effects/restaurant/ |
| subway.mp3 | 地鐵 | Subway interior ambience (#2680) | https://mixkit.co/free-sound-effects/tram/ |
| nightforest.mp3 | 夜晚森林 | Night forest with insects (#2414) | https://mixkit.co/free-sound-effects/forest/ |
| citynight.mp3 | 城市夜晚 | Urban city ambience at night (#2678) | https://mixkit.co/free-sound-effects/city/ |

## 沒有採用的來源

- freesound.org：CC0 音效最多，但下載需要申請 API 金鑰，之後要擴充可以申請。
- Pixabay：下載需要登入帳號。
- BBC Sound Effects：授權只准非商業使用。
- Wikimedia Commons：有公有領域音效，但這台機器對它的 API 被限流，暫未使用。

處理用的指令在 repo 外的 `process.py`（ffmpeg：atrim → 交叉淡化 amix → loudnorm → libmp3lame 96k）。

## AI 生成

| 檔案 | App 裡的名稱 | 說明 |
|---|---|---|
| aidemo.mp3 | 🤖 AI 示範曲 | 2026-10-03 用 vidIQ 的 AI 音樂生成做的 72 秒純音樂（提示：江湖算命先生、二胡、木吉他、神秘民謠）。vidIQ 標示為 royalty-free。 |
