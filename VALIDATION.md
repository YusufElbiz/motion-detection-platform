# Kontrol Noktası A doğrulaması — 2026-10-24

**Güncel içerik:** [16 atık görseli ve karışık düşme düzeni](docs/WASTE_VARIETY.md). **97/97 birim testi PASS**, TypeScript/üretim derlemesi PASS. El kontrolü bu içerik görevinde değiştirilmedi.

**Güncel hız çalışması:** [CPU/GPU seçimi, zaman bazlı hareket ve kimlik eşleme, gecikme ölçümleri](docs/LATENCY_OPTIMIZATION.md). **93/93 birim testi PASS**, TypeScript/üretim derlemesi PASS. Gerçek kameradaki hızlı hareket kabulü kullanıcı denemesi bekliyor. Önceki kayıtlar kendi teslimlerinin tarihsel sonuçlarıdır.

**Oyun denemesi:** Kullanıcının “şu an daha iyi, oyunda deneyelim” talebi üzerine [aynı hibrit sınıflandırıcı mevcut oyuna bağlandı](docs/GAME_HYBRID_TRIAL.md). Güncel birim testi **85/85 PASS**, üretim derlemesi/TypeScript PASS. Önceki A kapsamındaki durma sınırı bu oyun denemesi talebiyle yalnız gerekli entegrasyon için genişletildi; fiziksel oyun kabulü yapılmış sayılmaz.

**Son düzeltme:** Kullanıcının açık el/dik tutma hatası geri bildirimi üzerine [3B parmak geometrisi ve açı bağımsız sınıflandırma](docs/GESTURE_LAB_ANGLE_FIX.md) eklendi. Güncel birim testi: **83/83 PASS**, TypeScript/üretim derlemesi PASS. Önceki 71 testlik kayıt ilk teslimin tarihsel sonucudur; fiziksel kamera kabulü hâlâ bekliyor.

Bu düzeltmenin tarayıcı kontrolleri: gerçek yerel model/sahte kamera CPU-GPU testi PASS; sentetik döndürülmüş iki elin None→geometri OPEN/CLOSED/OPEN ve arayüz bağlantısı PASS; fare oyununda tam tur PASS. Geometri/worker testlerinde 300 3B dönüş pozu ve 96 görüntü oranı/ölçek/dönüş örneği kontrol edildi. Fiziksel gerçek kamera sonucu olarak raporlanmaz.

Güncel bağımsız laboratuvar: [docs/GESTURE_LAB_A.md](docs/GESTURE_LAB_A.md). 71/71 birim testi, TypeScript kontrolü, üretim derlemesi ve varlık hash kontrolleri geçti. Yeni laboratuvar tarayıcı testi ile mevcut fare, tracking, motion ve fist tarayıcı testleri geçti. Gerçek yerel model CPU/GPU üzerinde sahte kamerayla çalıştırıldı; [ölçümler](docs/gesture-lab-browser-results.json). Önceki 30 kaynak dosyası kurtarma kopyasıyla aynı. Fiziksel kamera kabulü bekleniyor; B/C uygulanmadı. Ayrıntılı bulgular, araştırılan kaynak dosyaları, lisans sınırları, performans ve PASS/FAIL alanlı A1–A15 Türkçe formu güncel belgededir.

# Phase 3 rework verification — 2026-10-23

The current implementation and exact 22-step Turkish physical-camera checklist are in [docs/PHASE3_REWORK.md](docs/PHASE3_REWORK.md). The older Phase 3 record below is historical; its dwell default, asset count and bundle size have been superseded.

## Rework checks executed

- `npm.cmd test`: **50 passed, 0 failed**. Previous 38 tests retained. Twelve new tests cover open/fist geometry across scale/rotation/3D tilt, UNKNOWN and invalid landmarks, model-score hysteresis, confirmed edges/no duplicate events, closed-hand arming, noise, palm carry/release, restart/loss, independent hands, adaptive filtering, ambiguous temporal association, edge alignment and delayed-capture versus fresh-result arrival.
- `npm.cmd run build`: **passed**, including TypeScript and hash verification of **11** local runtime/model/license assets. Main output: approximately 0.72 kB HTML, 20.15 kB CSS, 72.27 kB JS (24.79 kB gzipped JS). The additional pinned official Gesture Recognizer model is local.
- Mouse browser suite: **passed again against the final production build**, including resized dragging, correct/wrong bins, pause/restart, completion/replay and zero browser errors. Development URL http://127.0.0.1:5173/ also returned HTTP 200.
- Phase 2 tracking browser suite (including its 66-second session) and legacy motion browser suite: **passed during this rework**. The fallback suite explicitly selects dwell now that fist is default. Existing assertions remain. These two runs preceded the final palm-edge/arrival-clock fixes, which affect fist mapping and hand continuity; the final unit and fist integration runs cover those fixes.
- Final `node scripts/fist-browser-test.mjs`: **passed** against the production build. Covers actual local Gesture Recognizer initialization, palm calibration, original SVG artwork, closed-hand non-arming, grab/carry/release, exact palm/object alignment, two independent carries/releases, wrong bins, rotated artwork, resizing, loss, developer diagnostics, geometry-only backend, camera/worker disposal, zero external/non-GET requests and zero browser errors. Categories and landmarks are substituted AFTER real model inference on fake-camera frames. This is integration evidence, not physical recognition evidence. Raw results and screenshots: `docs/fist-browser-results.json`, `docs/screenshots/fist-*-synthetic.png`.
- Visually inspected the synthetic carry and two-hand screenshots. The illustrated hands, wrists, cuffs and arms replace emoji; an owned object receives foreground grip fingers. No physical hand/camera screenshots were collected.
- Initial browser attempts failed safe cancellation assertions. Diagnostic events revealed mixed capture/arrival clocks, fixed in gameplay with a regression test. Subsequent screenshot/inference scheduling gaps also triggered intentional loss recovery: the test now permits recovery after screenshots and holds the closed hand at its destination before opening. The observed release times below therefore exclude that preparatory wait. A prior legacy pinch run failed under simultaneous browser workloads; its isolated rerun passed. These failures are not evidence of physical recognition accuracy or a solved real-world tracking-loss rate.

## Rework performance measured in isolation

`docs/motion-rework-baseline.json` preserves the original pipeline; `docs/motion-rework-after.json` contains the final pipeline. Both use Chrome fake-camera frames, actual local CPU inference, and 12 one-second samples with no hands present:

| Pipeline | Camera FPS | Inference FPS | Recent mean model time (includes startup window) |
| --- | --- | --- | --- |
| Before, Hand Landmarker | 19.8–20.1 | 18.5–20.1 | 25.2–50.3 ms |
| After, Gesture Recognizer | 19.9–20.1 | 19.5–20.1 | 27.2–42.9 ms |

These samples show camera-limited throughput around 20 FPS, **not a demonstrated physical responsiveness/FPS improvement**. Gameplay requests up to 30 inference FPS and uses backpressure. Fake camera delivery does not demonstrate a physical camera's 24–30 FPS target.

Final `npm.cmd run benchmark:gestures` equivalent command ran each actual model sequentially on identical blank 640×480 canvas frames: 100 frames with 20 warmup frames excluded. Hand Landmarker: mean **25.89 ms**, p50 **25.70 ms**, p95 **29.40 ms**. Gesture Recognizer: mean **29.49 ms**, p50 **28.60 ms**, p95 **34.50 ms**. Neither detected hands, so gesture-head/two-hand costs and recognition reliability cannot be compared. Geometry overhead on generated hands in Node: **0.00356 ms/hand**; this excludes the required landmark model. The recognizer's purpose-built open/fist classifier and actual gesture scores motivate the provisional default, not a claim that it is faster. No concurrent second tracker is used.

Synthetic filter step response to 95% at 50 ms sample intervals: old fixed-65-ms EMA **200 ms**, adaptive **50 ms**. This is a deterministic filter calculation, not a physical latency measurement. Final test-substituted pose-change to attached DOM: **204.9–219.5 ms**; to released DOM: **92.6–408.2 ms**. Scheduling and discrete confirmation observations contribute. These figures are not camera-to-action latency and do not guarantee sub-100-ms behavior. Raw data are retained in the JSON reports.

Physical open/fist accuracy, rotating/small-hand robustness, crossings, lighting, extended webcam use, CPU/GPU utilization, hand-present backend A/B results and camera-to-visible-action latency remain **unmeasured**. The exact Turkish manual checklist explicitly covers these limits. No Phase 4 work was started.

## Local model and attribution

Official `gesture_recognizer/gesture_recognizer/float16/1` model downloaded from Google's model storage, SHA-256 `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`. Build verifies it alongside the preserved Hand Landmarker and installed SDK assets. Model source/version and attribution are recorded in `THIRD_PARTY_NOTICES.md` and the runtime manifest. Existing artifact-specific third-party/WASM provenance limitations remain documented; no commercial clearance claim is made. Cartoon SVG artwork is first-party code.

---

# Historical Phase 3 verification — 2026-10-23

## Executed automated checks

- Inspected the accepted mouse game, input and classification modules, Phase 2 tracking/calibration/lifecycle, README and prior validation before integration. User explicitly approved Phase 3 after manual Phase 2 testing.
- `npm.cmd test`: **38 passed, 0 failed**. All previous 21 tests are preserved, plus 17 Phase 3 tests for collision boundaries, object ownership, independent two-hand carry/falling, duplicate release/scoring prevention, incorrect/outside recovery, pause and restart cleanup, size-normalized pinch, hysteresis/arming/debounce, dwell evidence/timers, calibrated mirroring/sensitivity, end-to-end pure gesture/state integration, short/long tracking loss, safe reappearance, overlap and discontinuities. Node 22.13's experimental type-stripping warning remains informational.
- `npm.cmd run build`: **passed**, including source TypeScript compilation, local asset preparation and SHA-256 verification of **10** runtime/model/license files. Final main output: approximately 0.72 kB HTML, 18.92 kB CSS, 57.44 kB JS (20.12 kB gzipped JS), plus the unchanged approximately 34.8 MB local inference assets.
- `node scripts/browser-test.mjs`: **passed** against the final production build. Mouse menu/start/falling/dragging, correct and wrong bins, score, reset, sound state, pause/resume, resizing, eight-star completion, replay and localhost-only operation remain covered. Zero console/page errors.
- `npm.cmd run test:tracking-browser`: **passed** during Phase 3, preserving the existing real-local-model/fake-camera and separate mocked diagnostic UI tests. The test includes a 66-second sampled session, stop/resource disposal, navigation, camera-error simulations, calibration/overlay/loss and mirror tests. No nonlocal request or error-level browser console/page error was observed. Raw current diagnostic measurements remain in `docs/tracking-browser-results.json`.
- `npm.cmd run test:motion-browser`: **passed** against the final build. Runs the real local CPU model on Chrome's fake camera, then replaces result landmarks with deterministic test coordinates **after inference**, preserving actual model latency. It verifies hand-mode selection; real model startup; one-hand/two-hand/reach calibration; dwell grab/carry/release; correct and incorrect bins; score once; pinch grab/carry/release; pause/restart during carry; active-round model reuse; loss cancellation without score; two cursors and overlapping hands; resized sorting; eight-star completion; cleanup on completion; switching to camera-free mouse; opening diagnostics during preparation; and simulated hidden-tab cleanup during preparation. Results are in `docs/motion-browser-results.json`.
- Browser motion checks saw **zero external requests, zero non-GET requests, zero page exceptions and zero error-level console messages**. No physical camera or child images were used. Controlled landmarks are not evidence of real child-hand recognition or anatomical handedness accuracy.
- Development smoke check: HTTP 200 and CSP header at http://127.0.0.1:5173/, hand-mode setup with actual local inference on fake-camera frames, explicit setup cancellation, camera cleanup and zero browser errors. Server remains available on that address.
- Visually inspected `motion-setup-synthetic.png` and `motion-carry-synthetic.png`. Initial carry cursor covered too much of the waste illustration; moved its small confirmation badge to the corner and rechecked the screenshot. Skeleton/landmark overlays remain confined to diagnostics.

## Actual performance observations

Final motion integration run: default 640×480 requested camera, CPU, 640-pixel inference width, target 24 inference FPS. Six sampled rolling-window readings during a scripted hand-game round showed camera **20.0–20.1 FPS**, inference **18.5–20.0 FPS** and recent average model processing latency **28.1–34.6 ms**. The final “Kamera kapalı” sample records intentional completion cleanup and is excluded from numeric ranges. These are actual blank fake-camera model measurements while the gesture/UI uses substituted landmarks, not actual hand-detection benchmarks or end-to-end gesture latency. Host workload affects results. A physical camera's 24–30 FPS target has not been verified here.

Camera and inference rates remain separately measured. Inference latency excludes exposure/decoding, bitmap transfer, smoothing, gesture temporal stability and rendering. Gesture delays (e.g. 900 ms dwell) are configured intentional behavior, not measured inference latency. No accuracy percentage, preschool usability score, extended real-camera soak, GPU benefit or Raspberry Pi claim is made.

## Fixes and review findings

- Pure-test first run caught two test expectation issues: the wrong-bin test tried to re-grab at the previous x rather than the actual released object's x, and an exact floating-point assertion differed by less than a trillionth of a pixel. Corrected the test setup/tolerance; the full 38-test suite passes.
- Ownership is cleared before classification. Tracking loss, overlap, pause, restart and mode/settings changes cancel safely instead of synthesizing a release into a bin.
- Short loss retains identity only within a bounded grace period. Pinch recovery requires fingers to remain closed and all release evidence restarts; returning with open fingers cannot score.
- Review identified setup navigation/visibility cases that could otherwise strand a stopped camera setup. Added explicit menu recovery/disabled start behavior and browser tests for both paths.
- No dependency/model/library versions changed in this phase. Existing license/provenance limitations remain documented in THIRD_PARTY_NOTICES.md; no new distribution-clearance claim is made.

## Human/manual tests still required

Follow **all 20 Turkish acceptance tests in `docs/PHASE3.md`** with a physical camera: comfortable calibration/reach, one/two cursors, actual pinch/open thresholds and jitter, dwell comfort/release, sorting, rapid motion, short/full loss, crossing, independent two-hand play, pause/restart during carry, full round and return to mouse. Also test different lighting/distances, fullscreen, real tab switching and physical offline use after installation. Controlled browser tests do not establish real-world child usability or physical recognition accuracy. Geometric identity can still be ambiguous when hands cross between frames. Ordinary pause intentionally retains capture/model while suspending inference; menu/hidden tab/completion closes it.

Phase 3 implementation is ready for user review. No Phase 4 content, levels, voice guidance or deployment work has started. Explicit approval is required before Phase 4.

---

# Historical Phase 2 verification — 2026-10-23

## Executed checks

- Reviewed Phase 1 architecture, README and previous validation before implementation. User explicitly approved Phase 2 after manual Phase 1 review.
- `npm.cmd test`: **21 passed, 0 failed** (5 unchanged Phase 1 tests plus 16 Phase 2 tests). Covers coordinate bounds/mirroring/mapping, palm center, time-based smoothing, result-order/handedness-independent association, immediate missing-hand output removal, short/long loss, ambiguous overlap, finite-landmark validation, calibration/reset, FPS separation and expiry, camera lifecycle/late permissions/disconnect, Turkish errors and unique-frame cadence (approximately 24 inferences from a 30 FPS source).
- `npm.cmd run build`: **passed**, including strict TypeScript check, local asset preparation and production SHA-256 verification of 10 files. App output approximately 0.72 kB HTML, 14.05 kB CSS, 36.09 kB JavaScript before gzip. Separately served inference/model files add approximately 35 MB, loaded when camera diagnostics are started. Model, SDK, worker, WASM variants, license and attribution are included locally.
- `node scripts/browser-test.mjs`: **passed** the unchanged gameplay flows against the Phase 2 production build: menu, start, falling, dragging, correct/wrong bins, scoring, restart, mute state, pause, resizing, eight-star completion and replay; zero console/page errors or external runtime requests.
- `npm.cmd run test:tracking-browser`: **passed** with a real MediaPipe CPU worker on Chrome's synthetic webcam, followed by an explicitly mocked two-hand backend for diagnostic interface tests. Both types of test use fake video, not a physical camera or child images. Model/WASM requests were served from localhost with nonlocal network blocked. Real inference was sampled for 66 seconds, passing the SDK's 60 s metrics interval. Separate camera/inference rates and model processing times were recorded in `docs/tracking-browser-results.json`.
- Real-runtime checks: explicit start, real local model initialization/VIDEO inference, live stream and dimensions, mirror/smoothing controls, stop and restart, stopped worker disposal, navigation cleanup, re-entry closed by default, permission-denied/missing/busy API errors simulated, unexpected camera-ended event simulated, return to mouse game.
- Development server: restarted with the native config; HTTP 200 and CSP header verified. A separate headless Chrome check opened diagnostics, ran actual local model inference on the fake camera, returned to the game, confirmed stream cleanup and observed zero console/page errors. Server left available at http://127.0.0.1:5173/.
- Final startup UI adjustment shows that capture is open while the model initializes, rather than incorrectly saying the camera is closed. Rebuilt and repeated the fake-camera startup/inference/navigation check successfully after that adjustment.
- Mock-backend-only checks: two visible skeletons with coordinate/label cards, one-hand and two-hand calibration steps, reach acceptance and reset, loss/reappearance, overlap hint, labels preserved across display mirror toggles and narrow-screen controls. **These do not demonstrate actual hand detection accuracy.** Mock latency values (1 ms) are excluded from the performance record.
- Screenshots visually inspected: `docs/screenshots/tracking-idle.png`, `tracking-live-synthetic.png`, `tracking-overlay-mock.png`. The latter deliberately contains fabricated test coordinates; it is not evidence of physical hand recognition.
- `node scripts/licenses.mjs`: 18 installed package declarations inventoried; no GPL/AGPL declaration. Runtime package declares Apache-2.0; model is frozen by versioned source/hash. See THIRD_PARTY_NOTICES.md for the upstream artifact-specific third-party notice/provenance gap; this metadata inventory does not clear every embedded WASM dependency for commercial redistribution.

## Actual performance observations

Measurements below are synthetic-camera host observations, not webcam/child-hand benchmarks. Default request 640×480/30 FPS, inference width 640, CPU, target inference 24 FPS. In the final 66-second synthetic run, 33 rolling-window samples showed camera **19.9–20.1 FPS**, inference **17.9–20.2 FPS**, and average model processing latency **25.3–38.2 ms**. The fake camera delivered approximately 20 FPS, so this test cannot demonstrate a physical camera reaching 24–30 FPS. The saved JSON is the authoritative latest run; values varied between runs, consistent with host workload changes.

Latency measures only synchronous `detectForVideo` time inside the worker. No model accuracy percentage, physical/anatomical handedness accuracy, child performance, end-to-end motion latency, GPU advantage, or Raspberry Pi compatibility was measured. No multi-hour soak test was run.

## Issues found and resolved

- TypeScript flagged a feature-detection condition for a DOM method that is always defined in its type declarations. Replaced it with an explicit runtime capability flag.
- The Windows sandbox prevented esbuild's config bundler from scanning parent directories. Switched Vite configuration to an import-free `.mjs` file with native loading in all launch/build/test commands.
- Node's strip-only test mode does not support constructor parameter properties. Replaced that camera constructor syntax with an explicit field.
- Upstream TensorFlow Lite writes an informational CPU delegate startup message through console.error. The first browser run correctly flagged it. The first-party worker now preserves this exact known informational message as console.info; other errors are unchanged. Rerun had zero error-level console messages.
- Scheduling review found that naive minimum-interval gating could halve a 30 FPS stream when targeting 24 FPS. Added a deadline-based unique-frame gate and tested its target cadence without adding an inference queue.

## Still requires physical/manual verification

Follow all 18 Turkish steps in `docs/PHASE2.md`, including physical permission UI, single/two-hand detections, mirror alignment and anatomical handedness, wrist/finger movement, crossing/occlusion and reacquisition, fast movement, different light/distances/heights, actual reach calibration, camera switching, physical disconnect, stop/navigation indicator, offline operation after physically disconnecting internet, 15–30 minute operation and mouse-game regression. Browser route blocking proves no external dependency in the tested runtime path; it is not a physical network-disconnection test. GPU fallback and unsupported browsers have not been empirically profiled. No child-hand reliability claim is made.

Phase 2 implementation is ready for user review. Phase 3 gameplay gestures and all later phases remain unimplemented pending explicit approval.

---

# Historical Phase 1 verification — 2026-10-23

## Executed automated checks

- Host: Windows, Node 22.13.1, npm 10.9.2.
- `npm.cmd install`: succeeded; npm reported zero known vulnerabilities at installation time. This is a dated dependency audit result, not a security guarantee.
- `npm.cmd test`: **5 passed, 0 failed**. Covers all 16 category pairings, wrong-bin preservation, single scoring, eight-sort completion, fresh state reset, held-object stability, delta-time falling, floor waiting, spawn cap and completed-state freeze. Node 22.13 emits its experimental type-stripping warning; tests still pass.
- `npm.cmd run build`: **passed**, including strict TypeScript checking. Output: 0.72 kB HTML, 7.01 kB CSS, 11.83 kB JavaScript before gzip.
- `npm.cmd run dev`: started successfully on http://127.0.0.1:5173/; HTTP request returned 200. Human visual checking of the development route remains outstanding.
- `node scripts/browser-test.mjs`: **passed** against the production build using locally installed headless Google Chrome. Verified local preview server startup; Turkish menu; start; falling movement; mouse capture and dragging; incorrect bin and educational hint; correct bin and scoring; mute/unmute state; restart; pause/resume; drag after resizing to 850 px wide; eight-star completion; replay; reload and play while requests outside localhost are blocked; zero console errors and page exceptions.
- The first browser run found missing favicon 404 errors. Added an inline SVG favicon, rebuilt, reran the complete browser script: passed with zero console errors.
- The first production build found an unnecessary data-URL CSS import. Removed it and rebuilt successfully.
- `node scripts/licenses.mjs`: 17 installed dependency declarations inventoried, all permissive; full available root license/notice texts collected. No runtime third-party library or model is used.
- Menu and gameplay screenshots visually inspected. Files: `docs/screenshots/menu.png`, `gameplay.png`, `completed.png`.

## Still requires human/manual testing

Follow the Turkish checklist in README.md. In particular, actual audible output/comfort, fullscreen behavior, edge drops, touch behavior, small portrait screens, other browsers, unplugged-network use, sustained performance and preschool child comprehension have not been manually verified. The automated mute check verifies toggle state, not acoustic output. Browser testing covers production preview; the Vite development entrypoint also needs a user's visual check. The localhost-only test blocks external destinations but does not physically disconnect the network.

## Scope and limitations

Phase 1 is ready for user review, not a claim of commercial release readiness. Pointer input is required for sorting; no full keyboard alternative or spoken educational instructions yet. No camera, landmarks, gesture engine, calibration, progression levels, child usability study, Raspberry Pi validation, packaged installer, or kiosk deployment was implemented. Fullscreen is browser-controlled. Runtime is offline after installation, served locally; initial npm installation needs connectivity. License inventory is based on installed package metadata and collected notices, and must be refreshed for changed distributions.

Implementation stops here pending explicit Phase 2 approval.
