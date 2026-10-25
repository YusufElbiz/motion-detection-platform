# Phase 3 — hand-controlled recycling

Historical first implementation. The user requested and received a Phase 3 correction; see [PHASE3_REWORK.md](PHASE3_REWORK.md) for the current default fist/palm interaction, artwork, measurements and manual acceptance list. The dwell/pinch implementation described here remains as the selectable fallback.

Phase 2 was manually accepted by the user before this implementation. This phase integrates the same local MediaPipe backend with the existing game; it adds no framework, model, dependency, level, cloud service, recording or data persistence. Phase 4 has not started.

## Run and test

Windows PowerShell, from the project directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173/. Choose **Fare ile Oyna** or **Ellerimle Oyna**, then the start button. Mouse mode does not request a camera. Hand mode explicitly requests camera permission, introduces one hand and both hands, and uses the Phase 2 `CalibrationManager` to learn a comfortable reach area. The setup video has no debug landmarks. Normal play shows just hand cursors, progress rings and supportive hints.

```powershell
npm.cmd test
npm.cmd run build
node scripts/browser-test.mjs
npm.cmd run test:tracking-browser
npm.cmd run test:motion-browser
```

The browser suites start their own production preview servers on 4173, 4174 and 4175 respectively. Close other servers using those ports first. Installed Google Chrome is required by the test scripts. The Phase 2 suite takes roughly 90 seconds; the motion suite typically takes 60–100 seconds. All automated camera tests use Chrome's fake camera and never open a physical webcam.

For normal production play use `npm.cmd run preview` and http://127.0.0.1:4173/. Dependencies must be installed first; model/JS/WASM assets are already local and are verified as part of the build. Serve on localhost/HTTPS, not `file://` or insecure LAN HTTP. Retain the CSP headers in `vite.config.mjs` if changing the server. Runtime and offline/privacy restrictions from Phase 2 remain in force.

## Shared game and input architecture

- `src/main.ts` retains the existing HTML/SVG scene, with mode buttons, a setup overlay and a menu control. Scene behavior was extracted to `src/scene.ts` to keep input, state and UI composition separate.
- `src/input.ts` defines pointer position, grab start, held movement, release, pointer lost and input disabled events. Both adapters emit this interface. Input is gated by the selected mode; mouse movements cannot interfere with a hand carry.
- `src/interaction.ts` is the single ownership/collision/carry/release controller used by mouse and hands. It calls the original `sort()` function in `src/game.ts`; no material classification or star rules were copied into the gesture system.
- `src/game.ts` still owns spawning, falling and scoring. Its held-object argument now also accepts a set, allowing two carried objects to stop falling independently while preserving old test/caller compatibility.
- `src/motion/input.ts` converts tracked frames to game events. `pinch.ts` and `dwell.ts` contain independent temporal gesture logic. `config.ts` holds gesture, loss and collision defaults; `style.css` provides cursors and gentle feedback.
- `src/tracking/session.ts` orchestrates gameplay capture with the already tested Phase 2 camera, service, processor, frame gate and metrics. It introduces no additional requestAnimationFrame loop: the existing scene loop calls `tick()`; video frames use `requestVideoFrameCallback` or the existing unique-frame fallback. One inference can be in flight. The diagnostic screen remains independent and is stopped/exclusive with gameplay capture.
- `TrackingProcessor.lossTimeoutMs` is configurable per consumer. The diagnostic retains its original 350 ms default; gameplay uses an 800 ms association history, slightly longer than the 650 ms carry grace period. Handedness is still not used as identity.

Each object has at most one owner, and each pointer can own at most one object. Ownership is removed before classification. A second release without ownership is ignored, and scored objects are removed by the unchanged state logic. Pointer loss never calls `sort()`.

## Gesture state and tuning

The interaction states are `IDLE`, `HOVERING`, `GRAB_PENDING`, `CARRYING`, `RELEASE_PENDING`, `RELEASED`, `TRACKING_LOST`. Settings changes, pause, restart, overlap, navigation and prolonged loss perform explicit cleanup. Evidence timers advance only on fresh inference results; the render loop cannot complete a grab/release by itself.

| Setting | Initial value | Meaning |
| --- | --- | --- |
| Default method | Dwell | More accessible option that does not require precise finger contact |
| Dwell grab | 900 ms | Same object remains within the forgiving hover region; options 600/900/1300 ms |
| Dwell release | 650 ms | Carried object stays inside the same bin target; options 450/650/1000 ms |
| Release cooldown | 450 ms | Prevents immediate repeated dwell actions |
| Pinch closed/open thresholds | 0.35 / 0.60 | Distinct normalized thresholds for hysteresis |
| Pinch close/release stability | 140 / 180 ms | Intentional continuous evidence before either edge |
| Pinch open arming | 100 ms | Must first show open fingers; entering already pinched does not grab |
| Initial hand readiness | 120 ms | New track gets a short settling period |
| Maximum evidence gap | 170 ms | Longer gaps break dwell/gesture continuity and mark the track lost |
| Carry loss grace | 650 ms | Freeze briefly, then cancel without recycling |
| Recovery stability/distance | 120 ms / 150 logical pixels | Recover only nearby with consecutive fresh evidence |
| Large discontinuity | 320 logical pixels per result | Cancel and rearm instead of teleporting a carried object |
| Hand grab radius | 82 logical pixels | Larger than the approximately 102-pixel-wide object art |
| Bin target padding | 14 logical pixels | Forgiving target boundaries; closest bin resolves the boundary |
| Sensitivity | 1.0 | Menu choices 0.8/1/1.25/1.5; mapping is bounded to 0.7–1.6 |

These are engineering starting values, not validated preschool thresholds. Tune `src/motion/config.ts` and the adult control panel using real observations. Lower dwell times are faster but more prone to unintentional activation. Larger sensitivity expands smaller physical movements and can amplify jitter. The inherited landmark EMA (65 ms default) steadies cursor movement; it also adds lag. No accuracy or child usability percentage is reported.

**Pinch:** compute thumb-tip/index-tip planar distance divided by the larger of wrist-to-middle-MCP distance and index-MCP-to-pinky-MCP distance. Correct for camera aspect ratio before distances are calculated. Very small or invalid reference geometry is rejected. The ratio uses raw finite landmarks; the cursor uses smoothed index-tip coordinates. State order is `OPEN → CLOSING → GRABBED → RELEASING → OPEN`; noisy intermediate ratios do not repeatedly toggle. A pinch begun away from an object will not suddenly grab when moved over it; open and pinch again deliberately.

**Dwell:** keep the cursor over the same available object as its ring fills. Ownership is checked again when the timer completes. Carry it toward a bin; a second ring fills only while inside that bin's target. Leaving/changing the bin resets release evidence. There is no separate hard-to-perform release gesture. Wrong bins still release and provide the existing educational correction; they do not reduce stars. To abandon a dwell carry, pause, use the menu, or hide the hand long enough for safe recovery.

## Coordinates, feedback and recovery

Game coordinates remain 1280×720 independent of CSS size and fullscreen. Calibration samples mirrored index-tip reach using the existing one-hand/two-hand/reach workflow; a smaller comfortable region maps to the whole game field. Sensitivity scales this normalized mapping around its center, then clamps it. The same index-tip position is used for calibration and cursor control. No anatomical handedness claim is needed to map an on-screen pointer.

Hand cursors have distinct teal/amber rings, visible dwell progress, a held confirmation badge, hover glow and inactive styling. During carry the small cursor badge moves to the object's corner so the waste illustration remains recognizable. Bin highlights use the carried object's controlled center. Correct sorting gently animates the bin; no harsh failure animation was added. Technical metrics appear only in the collapsed adult control settings, never over normal play. All point/skeleton debugging remains available in El Takip Testi.

Brief loss freezes the carried object and marks the cursor inactive. Nearby recovery within the grace period requires stable new observations; release evidence restarts. A pinch carry additionally requires fingers to remain closed when returning. Open fingers on reappearance cancel rather than score. Long loss, a large position discontinuity, a new track in the same color slot, or ambiguous overlapping palms cancel the carry. No ownership is transferred to a newly detected hand. An abandoned object is placed inside the playfield and at/before the waiting floor (y ≤ 476), where it remains recoverable. Wrong-bin releases return to y=430. A deliberate pinch release outside a bin likewise returns to a recoverable falling/waiting position without points.

A momentary misassociation when hands cross between samples remains possible: geometry-based tracks are not biological identities. Ambiguous close overlap reported by the processor cancels safely, but not every real-world crossing will be identifiable. Low frame rate, long inference delay, tiny hands, occlusion and difficult lighting can also interrupt interaction. This must be evaluated with actual children and camera placement.

## Camera lifecycle and performance

Ordinary pause cancels all carries and suspends new inference while preserving the capture/model for quick resume. The adult settings indicate that the camera remains open; choose the menu to close it. Restarting an active hand round reuses the loaded model. Completion, menu/mode exit, opening diagnostics, page exit and hidden tabs stop capture and dispose resources. Returning from a hidden tab/diagnostics requires explicit resume and may reload the model. Losing visibility during setup closes the camera and offers a menu return; it cannot start an inactive round. Opening diagnostics during setup returns safely to the menu state.

No new libraries, models or assets were downloaded. All media/model processing stays local; the existing worker transport boundary blocks outgoing metrics and any uploads, and CSP remains enabled. No frame/landmark recordings or calibration persistence are introduced. Calibration bounds are in-memory for the current page and can be redone with “Oyun Alanını Yeniden Tanı”; changing mode clears them. No hand/body data is exported by the product.

`docs/motion-browser-results.json` reports the actual latest automated run. The motion browser test runs the real local CPU model on the fake webcam, then substitutes deterministic hand landmarks *after* inference. Measured latency is still actual blank-camera model time; it is not hand-recognition accuracy or complete gesture response latency. The test exercises the real worker, pipeline, temporal code, ownership and gameplay UI. Synthetic screenshots are explicitly named `motion-*-synthetic.png`. Physical camera FPS, child-sized finger ratios, arm comfort, full-session robustness, different lighting and end-to-end latency require your manual tests. No Raspberry Pi performance or compatibility is claimed.

## Türkçe manuel kabul listesi

İlk denemeyi bir yetişkinle yapın. Kamera izninden sonra oyunun ön hazırlığını tamamlayın: tek elinizi gösterin, iki elinizi gösterin, işaret parmaklarınızla rahatça her yöne uzanın ve “Hazırım, Oynayalım!”a basın. Yeterli alan oluşmazsa hareketi tekrar etmenizi istemeli. Ayarlar oyunun altındaki “Yetişkin / Öğretmen · Kontrol ayarları” bölümündedir.

1. **El modunu seçme:** Menüde “Ellerimle Oyna”yı seçip başlatın. Kamera ancak bu açık eylemle açılmalı; hazırlık/kalibrasyon tamamlanmadan atıklar düşmemeli. İzni reddederseniz Türkçe açıklama ve menüye dönüş bulunmalı.
2. **Bir el imleci:** Hazırlıktan sonra yalnızca bir elinizi gösterin. Bir el imleci görünmeli; normal oyun üstünde nokta/iskelet çizimi olmamalı.
3. **İki el imleci:** İki elinizi ayrı gösterin. Teal ve sarı tonlu iki ayrı imleç görünmeli. Birini gizleyince yalnız onun imleci pasifleşip kaybolmalı.
4. **Her yöne hareket:** İşaret parmağınızı sola, sağa, yukarı ve aşağı hareket ettirin. İmleç ayna gibi yönlenmeli. Sol/sağ kutulara ve üst/alt alana rahat ulaşın. Zorsa alanı yeniden tanıyın veya hassasiyeti artırın. Pencereyi yeniden boyutlandırınca hizalama bozulmamalı.
5. **Kıstırarak tutma:** Ayarlardan “Parmakları birleştirerek tut”u seçin. Önce başparmak ve işaret parmağınızı açın; atığın üstünde kısa süre birleştirin. Atık elinize bağlanmalı, düştüğü hareket durmalı ve tutma onayı görünmeli. Kapalı parmakla kadraja girince hemen tutmamalı.
6. **Kıstırmayı açarak bırakma:** Taşırken parmakları birleşik tutun; bir kutunun üstünde açıp kısa süre bekleyin. Nesne yalnız bir kez bırakılmalı. Kutunun dışında açarsanız puan almadan tekrar erişilebilir bir konuma dönmeli. Küçük titreşimler peş peşe tutma/bırakma üretmemeli.
7. **Bekleterek tutma:** “Bekleterek tut”u seçin. Elinizi atığın yakınında sabit tutun. Halka dolunca nesne tutulmalı. Halka dolmadan uzaklaşırsanız ilerleme sıfırlanmalı. 0,6/0,9/1,3 saniye seçeneklerini karşılaştırın.
8. **Bekleterek bırakma:** Nesneyi kutuya taşıyıp kutuda bekletin. Halka tamamlanınca bırakılmalı. Kutudan çıkmak veya başka kutuya geçmek süreyi sıfırlamalı. 0,45/0,65/1 saniye seçeneklerini deneyin; nesneyi bırakmak için kıstırma yapmanız gerekmemeli.
9. **Doğru sınıflandırma:** Plastik→sarı PLASTİK, kağıt→mavi KAĞIT, cam→yeşil CAM, metal→gri METAL eşleşmelerini deneyin. Nesne kaybolmalı, yıldız yalnız bir artmalı, kutu nazikçe hareket etmeli.
10. **Yanlış sınıflandırma:** Bir nesneyi farklı malzeme kutusuna bırakın. Doğru kutuyu öneren Türkçe mesaj görünmeli; yıldız azalmamalı/artmamalı; nesne tekrar denenebilir konumda bulunmalı.
11. **Hızlı taşıma:** Nesneyi tutarken eli rahat ama hızlı hareket ettirin. Normal hızlı hareket takip edilmeli. Çok büyük bir konum sıçraması algılanırsa güvenle iptal edebilir; puan kazandırmamalı veya görünmez nesne bırakmamalı. Kopma sıklığını not edin.
12. **Kısa gizleme:** Taşırken eli çok kısa süre gizleyip aynı yerde yeniden gösterin. Nesne önce beklemeli, imleç pasifleşmeli. Yakında ve yeterince kısa sürede geri geldiğinde kısa kararlılık kontrolünden sonra taşıma sürebilir. Bırakma halkası eski süreden devam etmemeli. Kıstırmada el açık dönüyorsa taşıma puansız iptal edilmeli.
13. **Tam takip kaybı:** Eli bir saniyeden uzun gizleyin. Taşıma iptal edilmeli; nesne oyun alanında tekrar erişilebilir hale gelmeli. Hiçbir kutuda otomatik puan kazandırmamalı. El tekrar göründüğünde eski nesne kendiliğinden yeni ele bağlanmamalı.
14. **Elleri çapraz geçirme:** İki eli çapraz geçirip üst üste getirin, sonra ayırın. Belirsiz örtüşmede taşıma iptal edebilir; puan üretmemeli. İmleç numarası/renk sürekliliği biyolojik kimlik garantisi değildir. Yanlış ele bağlanma veya takılma görürseniz koşulları not edin.
15. **İki elle bağımsız oynama:** İki farklı atığı iki elle tutup ayrı kutulara taşıyın. Her el en fazla bir atık tutmalı; aynı atığı iki el birden kontrol edememeli. Bir elin bırakması diğer elin atığını bırakmamalı.
16. **Taşırken duraklatma:** Nesne tutarken Ⅱ düğmesine basın. Nesne puansız ve erişilebilir şekilde bırakılmalı; hareket/etkileşim durmalı. Devam Et sonrası yeni bir tutma eylemi gerekmeli. Normal molada kamera açık kalır; tamamen kapatmak için ana menüyü kullanın.
17. **Taşırken yeniden başlatma:** ↻ düğmesine basın. Yıldız sıfır olmalı, yeni tur başlamalı ve önceki tutma/bırakma durumu temizlenmeli. Aynı oturumda kamera/model gereksiz yeniden açılmamalı. Eski el bırakma hareketi yeni nesneye puan yazmamalı.
18. **El ile turu bitirme:** Sekiz doğru eşleştirmeyi el kontrolüyle tamamlayın. Eski kutlama ekranı görünmeli; kamera kapanmalı. Yeniden Oyna ile sıfırdan başlayabilmelisiniz.
19. **Fareye dönüş:** ⌂ ile ana menüye dönün, “Fare ile Oyna”yı seçip başlayın. Kamera kullanım göstergesi kapanmalı; el imleçleri kaybolmalı. Fareyle sürükleme çalışmalı ve kamera izni istenmemeli.
20. **Önceki özellikler:** Fareyle doğru/yanlış kutu, yıldız, ses, yeniden başlatma, duraklatma, tam ekran ve boyutlandırmayı yeniden deneyin. “El Takip Testi”ne girip nokta/iskelet ekranının çalıştığını kontrol edin; çıkınca kamera kapalı olmalı. Sekmeyi gizleme, kurulumdan sonra interneti kesip yerel sunucudan yeniden açma ve farklı ışık/mesafelerde el modunu da deneyin.

Gerçek kullanımda hangi yöntem, bekleme süreleri ve hassasiyetin daha rahat olduğunu not edin. Mümkünse 15–30 dakika kullanımda kopmalar, FPS/işlem süresi ve rahatsız edici gecikmeyi gözlemleyin. Çocukların el boyutu, ışık ve kamera yerleşimi farklı sonuçlar verebilir; otomatik testler bunları doğrulamaz. Kayıt veya çocuk görüntüsü göndermeniz gerekmez.

## Files in this phase

Created: `src/scene.ts`, `src/interaction.ts`, `src/motion/config.ts`, `pinch.ts`, `dwell.ts`, `input.ts`, `style.css`, `src/tracking/session.ts`, `tests/motion.test.ts`, `scripts/motion-browser-test.mjs`, this document, `docs/motion-browser-results.json`, `docs/screenshots/motion-setup-synthetic.png`, `motion-carry-synthetic.png`.

Modified: `src/main.ts`, `src/input.ts`, `src/game.ts`, `src/tracking/processor.ts`, `package.json`, `README.md`, `VALIDATION.md`. Existing browser results/screenshots were refreshed by regression runs. `dist/` was regenerated; the existing local SDK/model/license bytes and dependency versions did not change. No Phase 4 work was implemented.
