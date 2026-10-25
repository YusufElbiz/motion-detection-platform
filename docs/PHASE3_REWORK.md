# Phase 3 correction — natural fist control and cartoon arms

This is a Phase 3 rework, not Phase 4. Mouse gameplay, recycling rules and the Phase 2 diagnostic screen remain in place.

## Run

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173/, select **Ellerimle Oyna**, then start. An adult must grant browser camera permission and finish initial reach setup. After that, grabbing and releasing require no mouse clicks: move an open palm over an object, close the fist, carry it closed, and open the palm to release. The default is **fist**, not dwell. The parent control panel still offers dwell and pinch as independent alternatives.

```powershell
npm.cmd test
npm.cmd run build
node scripts/browser-test.mjs
npm.cmd run test:tracking-browser
npm.cmd run test:motion-browser
npm.cmd run test:fist-browser
```

Run camera/browser suites sequentially on this PC to avoid competing inference workloads. They start their own localhost preview servers on 4173, 4174, 4175 and 4178. `npm.cmd run preview` serves normal production play on 4173. Installed Chrome is used by the automated browser suites; they use **fake cameras**, never a physical webcam.

## Root causes and corrections

1. **900 ms dwell was the default.** It demanded an extended hover over a falling target, with more time for tracking noise or object movement to reset progress. Fist control now uses two or more fresh observations and an initial 70 ms confirmation candidate, adjustable to 50/70/100 ms. Actual confirmation takes discrete inference frames and can be longer.
2. **The index fingertip was both the cursor and calibration anchor.** A fingertip moves substantially while fingers curl. Fist mode now uses the mean of wrist and four MCP joints (0, 5, 9, 13, 17), for both calibration and interaction. Old fallback modes retain their index anchor to preserve their behavior; switching between palm and index modes requires fresh calibration.
3. **Fixed 65 ms smoothing added lag to fast movement.** Gameplay now adapts its EMA time constant from 55 ms for near-stationary motion toward 8 ms for faster palm movement. Both values and an off switch are available in the adult diagnostic controls. The original Phase 2 screen keeps its original fixed smoothing behavior for regression/comparison.
4. **Frame capture time and result-arrival time were mixed in loss handling.** Diagnostic events exposed a fresh-but-delayed result being treated as a missing hand, canceling a carry during an intended release. Gameplay now uses arrival time for gesture continuity/loss and preserves camera timestamps separately for frame identity and pipeline-age measurements. A regression test covers the distinction.
5. **Repeated event-time renders and a corner-offset emoji obscured/visually detached the hand from its object.** Hand events are coalesced into the existing render loop. Original SVG hands and curved arms now share the object's exact palm position; only mouse input keeps immediate event-time drawing. Raw/mapped coordinates and ownership are inspectable in the developer panel.

The transferred frame is no longer unnecessarily resized when the camera is already at inference width. A single ImageBitmap transfer remains necessary for this worker pipeline. No zero-copy or guaranteed latency claim is made. Gameplay targets up to 30 unique camera frames per second; measured camera delivery can be lower. Existing inference backpressure, worker separation and model reuse across active-round restarts are retained.

## Approach evaluation and choice

**Default: official MediaPipe Gesture Recognizer**, using the installed SDK and a locally bundled, hash-pinned `gesture_recognizer/gesture_recognizer/float16/1` model. It provides `Open_Palm`, `Closed_Fist`, gesture scores and the same hand landmarks from a single task. It **replaces**, rather than runs alongside, Hand Landmarker in fist mode. No second heavy tracking model runs concurrently. This provides a purpose-built classifier and explicit gesture scores without inventing an overall tracking confidence.

**Alternative: landmark geometry** in the developer selector. It reuses Hand Landmarker, measures PIP/DIP joint angles and wrist/fingertip reach for four fingers in aspect-corrected 3D coordinates, and returns OPEN/CLOSED/UNKNOWN. It requires at least three agreeing fingers and no contradictory extended/curled fingers. Thumb position alone is not the decision. Scores are labeled **heuristic agreement**, not probabilities or model confidences. Other gestures such as a thumb-up with four curled fingers can confuse this simpler method; the official classifier is the provisional default. Synthetic 3D rotation/scale tests establish mathematical properties, not biological robustness.

`npm.cmd run benchmark:gestures` compares actual SDK execution sequentially on identical blank 640×480 frames and times the geometry calculation on procedural hands. `node scripts/tracking-benchmark.mjs after` samples the gameplay pipeline. The original before snapshot is retained as `docs/motion-rework-baseline.json`; the after snapshot is `docs/motion-rework-after.json`. Full data, conditions and limitations are recorded in `gesture-backend-benchmark.json`, `fist-browser-results.json` and VALIDATION.md.

**Important measurement limit:** blank frames have no detected hands, so the pretrained gesture-classifier head may not execute. This comparison cannot establish recognition accuracy or the extra cost of a two-hand classifier workload. A model winning a blank-frame timing is not evidence that it is better for children. Physical open/fist accuracy, CPU/GPU utilization, hand-present latency and total camera-to-visible-action responsiveness remain unmeasured here. The default choice is an engineering starting point pending your real webcam A/B tests, not a proven population-level result.

Primary references checked for this rework:

- Official task and bundled model: https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer
- Timestamped web API and synchronous inference/worker guidance: https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer/web_js
- Model source/version/hash and license obligations: `../THIRD_PARTY_NOTICES.md` and `../public/tracking/asset-manifest.json`.

## Gesture state, safety and mapping

Physical recognition has its own `UNKNOWN → OPENING → OPEN → CLOSING → CLOSED` state machine, separate from gameplay `HOVERING/CARRYING/RELEASE_PENDING/TRACKING_LOST`. Only a verified OPEN→CLOSED edge can grab; remaining closed never repeats grabs. A newly visible closed hand is unarmed until a verified open pose. Only verified CLOSED→OPEN while actually owning an object releases. One noisy frame or UNKNOWN cannot release.

Initial model entry threshold is 0.70; maintaining an already recognized pose can use 0.55. Confirmation defaults to 70 ms with at least two observations. Geometry defaults: PIP ≥150° and DIP ≥140° plus sufficient reach for extension, PIP ≤110° and reduced reach for curling. Live threshold controls perform safe interaction cleanup. Values require empirical tuning, especially for small hands and rotation. No accuracy or sub-100-ms response guarantee is claimed.

UNKNOWN is visible only in adult diagnostics and dimmed artwork; it does not fabricate a release. Persistent ambiguity becomes tracking loss. Short disappearance freezes the carried object; nearby closed-hand recovery requires new stable observations. Open-hand reappearance cancels without sorting. Longer loss, unclear overlap/association, restart, pause and mode/settings changes cancel safely. Two tracks have independent states and ownership. Near-equal spatial assignment costs now mark identity ambiguous, rather than silently transferring ownership. Handedness labels are not identity. Discrete crossings that the tracker cannot distinguish remain a real-world limitation.

The canvas mapping stays in 1280×720 logical coordinates with one mirror transformation. Fist calibration and gameplay use the same palm center. Sensitivity expands smaller reachable regions. Fist cursors and objects share visible-center bounds x=50..1230, y=130..675, avoiding the old edge mismatch where the hand moved beyond an object's clamped center. The setup preview uses the camera's actual aspect ratio; it is not cropped. Resize/fullscreen scaling does not enter collision math. No physical arm length, shoulder position or child height is estimated.

## Artwork and developer panel

`src/motion/arms.ts` contains original procedural SVG human hands, four fingers and thumb, closed-fist knuckles, cuffs and curved skin/sleeve paths. Edge anchors, arm width and animation timing are configurable. Arms connect to a rotated wrist at the tracked palm; they use logical coordinates at every resolution. Opening/closing blends the original open and fist drawings. Grip fingers are drawn above an object **only when gameplay confirms ownership**; the arm/palm layer stays behind objects so the waste remains recognizable. No emoji is stretched or used as the cursor, and no third-party character image is included. Wrist rotation is an illustrated approximation, not pose-tracked shoulder/elbow anatomy.

Normal gameplay contains no skeletons, confidence numbers or raw coordinates. Under **Yetişkin / Öğretmen · Kontrol ayarları → Geliştirici · Hareket tanısı ve ince ayarlar**, explicitly enable the technical panel to see:

- OPEN/CLOSED/UNKNOWN and transition states; actual model score vs heuristic agreement; four per-finger angles/reach/curl indicators.
- Raw palm, smoothed palm, raw mapped point, game point, temporary pointer identity and active object ownership.
- Camera/inference FPS, model time, bitmap preparation time, worker round trip and capture-callback-to-result age.
- Observed confirmation interval and bounded grab/release/lost/cancel event log.
- Model/geometry choice, gesture thresholds, confirmation duration and adaptive smoothing controls.

Only the currently selected model is active. Close capture through the menu before changing the backend. No technical data is saved by the application. Automated result files contain test-generated coordinates only. Local worker transport restrictions and CSP remain enabled; no camera images, gesture metrics or landmarks are sent externally.

## Türkçe gerçek kamera kabul listesi

Hazırlığı bir yetişkin başlatsın. “Ellerimle Oyna” → kamera izni → tek el → iki el → açık avuçlarla rahat erişim → “Hazırım, Oynayalım!”. Ana yöntem “Elini kapat, tut · elini aç, bırak” olmalı. Testler sırasında çocuk görüntüsü kaydetmeniz/göndermeniz gerekmiyor.

1. **Kamerayı açın:** Yalnız başlat düğmesinden sonra izin istemeli; yerel görüntü ve hazırlık adımları görünmeli.
2. **Açık eli hareket ettirin:** Çizgi el avuçla birlikte her yöne gitmeli; parmak ucunu sabit tutmanız gerekmemeli. Ulaşamadığınız alan varsa yeniden kalibre edin veya hassasiyeti artırın.
3. **Boş alanda yumruk yapın:** El çizimi kapanmalı ama uzaktaki nesneyi tutmamalı. Kapalı elle nesneye sonradan yaklaşmak da kendiliğinden tutmamalı.
4. **Eli açın:** Çizim açılmalı; taşınan nesne yokken yıldız veya bırakma olayı üretmemeli.
5. **Açık avuçla nesneye yaklaşın, yumruk yapın:** Yakındaki atık vurgulanmalı ve doğrulanmış kapanışla ele bağlanmalı; uzun bekleme halkası olmamalı.
6. **Tutma hızını gözleyin:** Rahat, normal kapanışları birkaç kez tekrarlayın. Gecikmeyi ve kaçırmaları not edin; tanı panelinden 50/70/100 ms adaylarını karşılaştırın. Bu değerler toplam gecikme garantisi değildir.
7. **Kapalı yumrukla taşıyın:** Nesne avuç merkezinden ayrılmamalı; ekran kenarlarında da el ve nesne aynı noktada kalmalı.
8. **Doğru kutuda eli açın:** Nesne yalnız bir kez bırakılmalı, yıldız yalnız bir artmalı. Taşıma sırasında elinizi açmadan kutunun üstünde durmak yumruk modunda otomatik bırakmamalı.
9. **Yanlış kutuda açın:** Destekleyici Türkçe öneri çıkmalı; yıldız artmamalı/azalmamalı; nesne tekrar alınabilir konuma dönmeli.
10. **Ardışık nesneleri hızlı alın/bırakın:** Açık→kapalı ve kapalı→açık geçişleri birer kez çalışmalı; el kapalı kalınca tekrar tekrar tutmamalı.
11. **Eli döndürün:** Bileği ve avucu farklı yönlere çevirin. Çizim bilekle yönlenmeli; tanınmayan poz yanlışlıkla bırakma sayılmamalı. Sorunlu açıyı not edin.
12. **Hızlı hareket edin:** Büyük hareketler çabuk izlenmeli; dururken küçük titreşimler sakinleşmeli. Yumuşatmayı açık/kapalı ve hızlı/durgun değerlerle karşılaştırın.
13. **Sol eli deneyin:** Açık, kapalı, taşıma ve bırakmayı tek sol elle yapın; etiketi kalıcı kimlik olarak yorumlamayın.
14. **Sağ eli deneyin:** Aynı akışı sağ elle tekrarlayın; ulaşım ve algılama farklarını not edin.
15. **İki eli birlikte kullanın:** İki farklı nesne bağımsız taşınabilmeli; bir el en fazla bir nesne tutmalı, tek nesnenin iki sahibi olmamalı.
16. **Elleri çapraz geçirin:** Belirsizlikte taşıma güvenle iptal edebilir; nesne diğer ele aktarılmamalı veya otomatik puan kazandırmamalı. Kaçırılan kimlik karışmalarını bildirin.
17. **Eli gizleyip geri getirin:** Kısa kayıpta nesne beklemeli. Daha uzun kayıpta erişilebilir yere dönmeli. Yeni/kapalı görünen el otomatik tutmamalı; açık elin geri görünmesi otomatik puan üretmemeli.
18. **Farklı ışık deneyin:** Normal/loş/arkadan ışıklı koşullarda kopma ve yanlış açma-kapama sayısını gözleyin; zor ışıkta doğruluk varsaymayın.
19. **Küçük elleri ve farklı mesafeleri deneyin:** Özellikle yaş grubuyla güvenli, kısa denemeler yapın. Model yaklaşımını ve geometri alternatifini ayrı oturumlarda karşılaştırın. Yumruk rahat değilse bekleterek tutma alternatifini seçin; ana yönteme karışmamalı.
20. **Kol ve el çizimlerini kontrol edin:** Açık, kapanan, yumruk, taşıyan ve açılan çizimler tanınan duruma uymalı; kola bağlı kalmalı. Nesne tutulmuyorsa tutuyormuş gibi ön kavrama parmakları görünmemeli.
21. **FPS ve tepkiyi kontrol edin:** Yalnız yetişkin tanı panelinde kamera/çıkarım FPS'ini, model ve doğrulama sürelerini izleyin. Hissedilen gecikme, el kaybı ve 15–30 dakika kullanım kararlılığını not edin. Sayılar fiziksel uçtan uca gecikme ölçümü değildir.
22. **Fare ve önceki özellikleri doğrulayın:** Ana menü→Fare ile Oyna; sürükleme, doğru/yanlış kutu, puan, ses, yeniden başlatma ve duraklatma çalışmalı. El modunda taşırken duraklatma/yeniden başlatma puan üretmeden temizlenmeli. Boyutlandırma, tam ekran, El Takip Testi ve internet kesildikten sonra yerel açılışı da kontrol edin.

## Files created or changed

Created: `src/motion/fist.ts`, `src/motion/arms.ts`, `tests/fist.test.ts`, `scripts/hand-fixtures.mjs`, `scripts/fist-browser-test.mjs`, `scripts/tracking-benchmark.mjs`, `scripts/gesture-backend-benchmark.mjs`, `public/tracking/gesture_recognizer.task`, this document and the corresponding benchmark/test JSON files and `fist-*-synthetic.png` screenshots.

Modified: `src/motion/config.ts`, `input.ts`, `style.css`; `src/scene.ts`; `src/tracking/types.ts`, `service.ts`, `session.ts`, `smoothing.ts`, `processor.ts`; `public/tracking/inference-worker.js`; `scripts/prepare-tracking-assets.mjs`; the legacy motion browser setup now explicitly selects dwell while retaining its regression assertions; `package.json`, `README.md`, `VALIDATION.md`, `THIRD_PARTY_NOTICES.md`. Runtime attribution/manifest and `dist/` are regenerated. The SDK version, mouse classification logic and Phase 2 diagnostic interface were not replaced.

Physical webcam success, child usability, hand-present A/B reliability and true camera-to-screen response remain pending your tests. Phase 4 stays blocked on explicit approval.
