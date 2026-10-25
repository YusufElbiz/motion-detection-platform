# Phase 2 — local camera and hand diagnostics

## Scope and operation

The existing DOM/SVG recycling game, independent state and pointer adapter were inspected and preserved. `src/main.ts` only adds the adult diagnostic entry and pauses active gameplay when it is opened. The camera screen is separate from gameplay; it does not grab, carry or release recycling objects. No pinch gesture recognition is implemented. There is no pose/arm model in this phase.

Windows PowerShell, inside the project:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173/, choose **Yetişkin / Öğretmen · El Takip Testi**, then **Kamerayı Başlat**. All child/adult diagnostic UI labels are Turkish. No camera permission is requested until the explicit start button is pressed. The browser itself controls permission prompts.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Production preview: http://127.0.0.1:4173/. With locally installed Google Chrome, run `node scripts/browser-test.mjs` (game regression, port 4173) and `npm.cmd run test:tracking-browser` (camera integration, port 4174), after stopping any other preview server occupying the corresponding port. The tracking suite runs for roughly 90 seconds. It never opens a physical webcam.

Initial npm installation and the original asset acquisition require internet. Local builds, inference and play require none afterward. Model weights, loaders and WASM are already in `public/tracking` and copied to `dist/tracking`; the build verifies each runtime/model/license asset against a SHA-256 manifest. It fails if the frozen model changes. No startup downloader or CDN fallback exists. Missing/broken model files produce a Turkish error and camera cleanup. Serve via localhost/HTTPS; `file://` and insecure LAN HTTP are unsuitable for camera APIs. Chrome/Edge desktop is the initial tested browser family; other browsers need validation.

## Modules and settings

| File | Responsibility |
| --- | --- |
| `src/tracking/types.ts` | Replaceable `TrackingBackend`, timestamped `TrackingFrame`, normalized points and ephemeral hand tracks |
| `camera.ts` | Permission, device selection, capture settings, disconnect, stop and late-permission cancellation |
| `service.ts` | Worker lifecycle, initialization/frame deadlines, one in-flight inference and resource disposal |
| `public/tracking/inference-worker.js` | Real MediaPipe Tasks VIDEO inference, two hands, ImageBitmap disposal, CPU/GPU selection and network boundary |
| `coordinates.ts` | Normalization, mirroring, palm center and optional calibrated 1280×720 mapping |
| `smoothing.ts`, `processor.ts` | Time-based EMA, geometry association independent of handedness and stale detection handling |
| `frameGate.ts`, `metrics.ts` | Unique source-frame gating, target cadence, separate camera/inference rates and processing latency |
| `calibration.ts` | Stable one/two-hand introduction, measured reach bounds and reset |
| `diagnostics.ts`, `diagnostics.css` | Camera preview, visible skeleton/21 landmarks, controls, coordinates and calibration UI |
| `config.ts` | Camera defaults, inference/smoothing settings, thresholds and timeouts |

Default camera request: 640×480 at 30 FPS (ideal, actual negotiated dimensions are displayed). Default inference: up to 640 pixels wide, preserving aspect ratio, at an average target of 24 FPS. The UI permits 320/480/640 inference width, 15/24/30 FPS and 640/960/1280 camera width. These are bounded options, not performance guarantees. Device, camera size and delegate changes require stop/start; inference rate/width and smoothing can change live.

Model inference runs synchronously inside a dedicated classic Worker, not on the UI thread. An ImageBitmap is transferred at most once for each new video source frame. `requestVideoFrameCallback` measures delivered/presented camera frames; a `currentTime`-checked rAF path is available when that callback is absent. There is no queue of stale inference jobs. Busy frames are dropped. The frame gate preserves approximately 24 inferences from a 30 FPS stream when processing capacity permits, rather than always dropping every second frame. Bitmap resize/transfer has a cost and device-specific impact; it is not included in the reported model processing latency.

CPU is the default. GPU is an experimental selectable alternative: initialization failure attempts CPU. The actual selected delegate appears in the screen. A GPU error during inference stops safely and recommends CPU restart. No automatic claim is made that GPU is faster. OffscreenCanvas/WebGL preprocessing support is needed even with CPU inference; browsers lacking the required worker/image facilities get a Turkish compatibility message. There is no synchronous main-thread fallback that silently freezes the game UI.

## Coordinates, identity and smoothing

The model receives the **unmirrored** camera frame. Only the preview and screen-coordinate mapping are mirrored. The UI reports the model's exact handedness label translated to Sol/Sağ and its handedness classification score; the label is not swapped when toggling the display. The normalized coordinate table is in original camera coordinates; the screen row shows the current mirrored/calibrated 1280×720 coordinates. This distinction is deliberate. A display mirror toggle is tested with controlled results; whether the model label matches a user's anatomical hand must be checked with the physical camera and hand orientation. Do not infer anatomical identity from screen side.

The API result exposes landmarks and handedness classification, not separate per-hand presence/tracking confidence values. Those internal scores cannot be shown as measured overall confidence. The detection, presence and tracking **thresholds** are configurable defaults of 0.5; worker values are bounded to 0.2–0.9. Raising thresholds can reject more hands and trigger more detector work; changing them requires empirical testing. Finite 21-point results are accepted; handedness score is not used to pretend to filter tracking confidence. Out-of-range x/y predictions are clipped for screen mapping; signed normalized depth z is retained. No physical depth measurement is claimed.

Palm center is the mean of landmark indices 0, 5, 9, 13 and 17 (wrist and four finger MCP joints). Thumb tip is 4, index tip 8, wrist 0. All 21 points and their skeletal connections are drawn, with distinct teal/orange temporary track colors; wrist, thumb and palm center have extra symbols. Hollow white fingertip shows the raw prediction; filled yellow fingertip shows the filtered prediction. The hollow ring and filled dot coincide when smoothing is disabled.

EMA was chosen over One Euro filtering for this first diagnostic because it has one clear time constant and predictable time-based behavior. Default is 65 ms, configurable from 20–160 ms in the UI. Higher values reduce jitter while increasing lag. A One Euro filter can respond better to fast intentional motion but requires more tuning and real child-motion data. Confidence-aware smoothing is not used because the exposed handedness score is not tracking confidence.

Temporary track IDs are based on spatial proximity (0.24 normalized distance) and a 350 ms grace interval, **never** on left/right labels or array order. Missing detections disappear immediately from active output; history for short reassociation exists only in memory. After 350 ms loss the old filter is discarded. Overlapping palm centers within 0.10 normalized distance reset associations and show an ambiguity message. Crossings, high-speed motion, reversed detection order and occlusion can still swap or reset tracks; these IDs are not a promise of persistent biological identity. No predicted “ghost” hand is rendered. Stale UI landmarks are cleared when no fresh result arrives.

## Calibration

“Alanı Tanı” introduces a single hand, then both hands, each stable for 700 ms. The reach step collects index-tip positions while the player comfortably explores left/right/up/down. “Alanı Kullan” uses the 3rd/97th percentiles to reject isolated extreme points. It requires at least 20 samples and a normalized width and height of at least 0.20. A dashed rectangle marks the accepted area. This area affects only the diagnostic screen-coordinate row; it does not control gameplay.

No fixed arm length, child height or camera distance is assumed. Reposition the camera/player and repeat to adapt the area. This is an initial reach check, not physical measurement or verified calibration for all preschool users. All samples/bounds are memory-only and are erased on reset, mirror changes, camera stop and navigation. Only a bounded sample set is kept.

## Privacy and lifecycle

No MediaRecorder, personal-data collection, localStorage, landmark export or recording path is present. Images stay in the local video/worker pipeline. Stop, leaving the screen, hiding the tab, page navigation and camera disconnection stop capture and dispose the model. Late-arriving permission grants are canceled and their streams are stopped. Stream tracks stop immediately; the worker is asked to close the model and is forcibly terminated after 200 ms if needed. A 30 s initialization deadline, 10 s inference deadline and 5 s missing-frame watchdog prevent silent indefinite active sessions.

The upstream 1.1.1 SDK includes usage/performance reporting code. This app prevents it from sending: the worker allows fetch/XHR only to same-origin GET/HEAD resources, before loading the unmodified SDK. Vite dev/preview supply a Content Security Policy to both HTML and worker responses; production allows only same-origin connections. Development additionally permits local Vite websocket connections. No frame upload or metric submission is allowed. Copy the CSP headers from `vite.config.mjs` if using a different static server; retain the worker transport boundary. Tests observe network requests with external destinations blocked, including a session beyond the SDK's 60 s metrics timer. Network tests are not a substitute for physically unplugging the network.

## Metrics and interpretation

Camera FPS counts unique delivered video frames. Inference FPS counts completed inference jobs. Each rate uses a rolling two-second window. Processing latency is the mean time spent inside `detectForVideo`, measured within the worker over those recent jobs; it excludes camera exposure, decoding, bitmap transfer, smoothing and display latency. It is not an end-to-end motion delay. No accuracy percentage is calculated. See `tracking-browser-results.json` and `../VALIDATION.md` for actual test measurements and their synthetic-camera limitations. Multi-hour stability, physical webcam throughput, child-hand accuracy, difficult lighting, true anatomical handedness and GPU benefits require manual/device testing.

Hand-only tracking is appropriate for this diagnostic's 21-point requirement. It cannot reliably establish arm/shoulder position or infer a fully occluded hand. Combined pose plus hand tracking may aid future coarse arm movement and reacquisition, with extra CPU/GPU cost, model licensing and privacy review. There is no measured evidence here that the combination is more reliable for ages 4–6. A future approval should precede implementation and child-specific evaluation.

## Türkçe manuel kabul testleri — sizin yapmanız gerekenler

İlk denemeyi bir yetişkin yapmalı; ardından uygun ortamda çocukların erişimini gözlemleyin. Beklenen sonuçlar ve sınırlamalar:

1. **Kamera izni ve başlangıç:** “El Takip Testi”ni açın. Kamera kapalı kalmalı. “Kamerayı Başlat”a basıp izin verin; canlı görüntü, gerçek çözünürlük ve FPS değerleri belirmeli. İzni reddettiğinizde Türkçe açıklama görünmeli ve yeniden denemek mümkün olmalı.
2. **Tek el:** Bir elinizi açıkça gösterin. Sayaç 1 olmalı; 21 nokta ve bağlantılar görünmeli. Sağ/sol model etiketi ile yalnızca etiketin skoru görünmeli.
3. **İki el:** Ellerinizi birbirinden ayrı gösterin. Sayaç en fazla 2 olmalı; eller farklı renklerde görünmeli. İkisini birden göremiyorsa ışık, konum ve mesafeyi değiştirip gözlemi not edin.
4. **Sol/sağ hareket ve ayna:** Elinizi sola/sağa hareket ettirin. Ayna açıkken görüntü ayna gibi davranmalı; noktalar görüntüyle örtüşmeli. Aynayı kapatınca ekran x yönü değişmeli. Fiziksel sağ ve sol elinizi ayrı ayrı gösterip model etiketlerini not edin; görüntü ayarı etiketi yazılımsal olarak değiştirmemeli. Yanlış model etiketlerini de raporlayın.
5. **Yukarı/aşağı:** Ellerinizi rahatça yukarı/aşağı taşıyın. Noktalar hizalı kalmalı; y koordinatları değişmeli. Kenarlara yaklaşınca iz kaybı olabilir; görünür olduğunda tekrar bulunmalı.
6. **Bilek:** Bileğinizi hareket ettirin. Kare işaret ve bilek koordinatları onu takip etmeli; avuç ortasındaki elmas işaret ayrı görünmeli.
7. **Parmaklar:** Parmaklarınızı açıp kapatın, işaret ve başparmağınızı oynatın. Sarı işaret ucu ve pembe başparmak halkası hareketi izlemeli. Bu testte parmak kıstırarak nesne tutulması beklenmez.
8. **Kaybolma ve geri gelme:** Eli görüntüden çıkarın, en az bir saniye bekleyin, geri getirin. Eski noktalar kaybolmalı ve el yeniden bulunmalı. Aynı iz numarasını koruması beklenmez.
9. **Çapraz geçiş / örtüşme:** Ellerinizi çapraz geçirip kısa süre üst üste tutun, sonra ayırın. Yakın örtüşmede destek mesajı görünmeli; iz numaraları değişebilir. Noktalar donup sahnede kalmamalı. Kimlik karışmalarını not edin.
10. **Hızlı hareket:** Ellerinizi hızlı ama rahat hareket ettirin. Takibin kopup kopmadığını ve geri kazanımını not edin. Arayüz düğmeleri yanıt vermeli; yoğun harekette güvenilirlik garanti edilmez.
11. **Yumuşatma:** Aynı yavaş ve hızlı hareketleri açık/kapalı deneyin. Ham halka ile dolu nokta farkını gözleyin; süreyi 20–160 ms arasında değiştirin. Kapalıyken ikisi çakışmalı, yüksek değerde dolu nokta daha geç tepki vermeli. En rahat değeri not edin.
12. **Işık:** Normal ışık, daha loş ortam ve arkadan gelen ışıkla karşılaştırın. El sayısı, kopmalar, FPS ve işlem süresini not edin; düşük ışıkta yüksek doğruluk varsaymayın.
13. **Mesafe / kamera konumu:** Kameraya farklı mesafelerde durun ve yüksekliğini değiştirin. Elin küçük görünmesi veya kadrajdan çıkması durumunda kaybı gözleyin. Fiziksel mesafe ölçümü beklemeyin.
14. **Kalibrasyon / sıfırlama:** “Alanı Tanı” → tek el → iki el → her yöne erişim adımlarını izleyin. “Alanı Kullan”dan sonra kesikli alan görünmeli. Çok dar hareketle kabul etmeyip daha geniş hareket önermeli. “Alanı Sıfırla” alanı silmeli; yeni boy/mesafede tekrarlayın. Aynayı değiştirmek alanı sıfırlamalı.
15. **Durdurma / kamera değiştirme:** “Durdur”a basın; video durmalı, sayaç/izler temizlenmeli ve tarayıcının kamera kullanım göstergesi kapanmalı. Başka kamera varsa seçip yeniden başlatın. Kamerayı kullanan başka uygulama varsa destekleyici hata veya tarayıcının izin verdiği paylaşım davranışı görülebilir. Kamerayı fiziksel olarak çıkarıp yeniden bağlamayı da deneyin.
16. **Çıkış / tekrar giriş:** Takip açıkken “Oyuna Dön”e basın; kamera kapanmalı. Yeniden girince kendiliğinden başlamamalı. Sekmeyi gizleyip dönün: kamera kapalı kalmalı, yeniden başlatma düğmesi kullanılabilmeli. İzin beklerken Durdur'a basıp sonra izin verdiğinizde de kamera açık kalmamalı.
17. **İnternet bağlantısı olmadan:** Kurulum ve üretim derlemesinden sonra interneti kesin. Yerel sunucuyu yeniden başlatın, sayfayı önbelleksiz yenileyin ve kamerayı açın. Model/noktalar çalışmalı. Geliştirici ağ panelinde CDN, Google metriği veya görüntü gönderimi olmamalı. Tam bir internet kesintisini bu ortamda fiziksel olarak gerçekleştirmedik.
18. **1. aşama regresyonu:** Oyuna dönüp fareyle doğru/yanlış eşleştirme, puan, yeniden başlatma, ses ve yeniden boyutlandırmayı deneyin. Kamera kapalıyken de oyun çalışmalı. Eller atıkları henüz hareket ettirmemeli.

Ek olarak 15–30 dakikalık bir fiziksel kamera oturumunda FPS/işlem süresi, bağlantı kopması, ısınma ve arayüz yanıtını not edin. Bu süre veya hedef 24–30 kamera FPS'i otomatik testlerle garanti edilmiş değildir. Kamera modeli, bilgisayar, tarayıcı, ışık, yaklaşık konum ve ölçümleri paylaşmanız sonraki değerlendirmeye yardımcı olur; çocuk görüntüsü veya video kaydı göndermeniz gerekmez.

## Files created/changed in Phase 2

Created: all `src/tracking/` files listed above; `src/vite-env.d.ts`; `vite.config.mjs`; `tests/tracking.test.ts`; `scripts/prepare-tracking-assets.mjs`, `verify-tracking-assets.mjs`, `tracking-browser-test.mjs`; this document; `docs/tracking-browser-results.json`; `docs/screenshots/tracking-idle.png`, `tracking-live-synthetic.png`, `tracking-overlay-mock.png`; `public/tracking/inference-worker.js`, `hand_landmarker.task`, `vision_bundle.js`, `LICENSE.mediapipe.txt`, `asset-manifest.json`, `ATTRIBUTION.md`, `sdk-package.json`, and four `wasm/vision_wasm_{internal,nosimd_internal}.{js,wasm}` files.

Changed: `src/main.ts`, `package.json`, `package-lock.json`, `scripts/browser-test.mjs`, `README.md`, `VALIDATION.md`, `THIRD_PARTY_NOTICES.md`, `docs/dependency-licenses.json`, `docs/THIRD_PARTY_LICENSES.txt`; existing game regression screenshots were refreshed. `dist/` is regenerated, not hand-edited. No other game logic or assets were rewritten.

## Primary technical references

- Official web API and threading guidance: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- Exact result fields: https://developers.google.com/edge/api/mediapipe/js/tasks-vision.handlandmarkerresult
- Official model download and model card: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker
- Upstream Hand Tracking model card (limitations, not child-specific validation): https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20(Lite_Full)%20with%20Fairness%20Oct%202021.pdf
- Local SDK types inspected: `node_modules/@mediapipe/tasks-vision/vision.d.ts`.

See `../THIRD_PARTY_NOTICES.md` for licensing, commercial redistribution conditions and upstream provenance limitations. Phase 2 stops here. Phase 3 requires explicit approval.
