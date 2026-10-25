# ECO HEROES — Phases 1–3

**Atık içerikleri güncellendi:** [16 farklı atık ve rastgele düşme düzeni](docs/WASTE_VARIETY.md). Her malzemede dört özgün SVG görseli var; malzeme sırası, görsel ve düşme konumu karışık seçilir. Doğru kutuya göre sabit bir düşme sütunu yoktur.

**Yeni inceleme: [Kontrol Noktası A — bağımsız iki el hareket laboratuvarı](docs/GESTURE_LAB_A.md).** `npm.cmd run dev` ardından http://127.0.0.1:5173/gesture-lab adresini açın. Gerçek yerel Gesture Recognizer, bağımsız izler, One Euro avuç filtresi ve Türkçe ölçümler içerir. Fiziksel kamera kabulü bekleniyor. B/C uygulanmadı; önceki oyun ve fare kontrolleri korunuyor. Yeni tarayıcı testi: `npm.cmd run test:gesture-lab-browser`.

**Current review: [Phase 3 rework — natural fist control, responsive palm tracking and original animated arms](docs/PHASE3_REWORK.md).** Default hand control is now open palm → close fist to grab → open palm to release. It uses the local official Gesture Recognizer as a single replacement tracker; a four-finger geometry alternative is available in developer settings. Dwell and pinch remain optional fallbacks. No Phase 4 work has begun. Older Phase 3 descriptions below are superseded where they describe the former dwell default/index anchor.

Local Turkish recycling game for ages 4–6, with selectable mouse or two-hand camera control and an independent **El Takip Testi** diagnostic screen for adults/teachers. Phase 3 connects local MediaPipe tracking to the same recycling logic using natural fist control, with dwell/pinch alternatives. No backend, recordings or persistent landmark data are used.

**Previous integration reference: [Phase 3 architecture and historical 20-step checklist](docs/PHASE3.md).** Choose **Fare ile Oyna** or **Ellerimle Oyna** in the menu, then start. Hand mode guides you through comfortable reach calibration. The adult panel selects fist/dwell/pinch, durations and sensitivity. Mouse mode remains camera-free. No Phase 4 progression/audio-content work is implemented.

For the reworked primary method and its **22-step Turkish physical-camera checklist**, use the rework document linked above. After a build, `npm.cmd run test:fist-browser` verifies fist/palm/arm integration with test-substituted gestures, and `npm.cmd run benchmark:gestures` compares actual local model execution with its limitations recorded. These tests do not prove real fist accuracy.

**Phase 2 setup, architecture, limitations, sources and the 18-step Turkish acceptance checklist: [docs/PHASE2.md](docs/PHASE2.md).** Open the game, choose “Yetişkin / Öğretmen · El Takip Testi” below it, then explicitly press “Kamerayı Başlat”. The camera is not opened merely by loading the game or entering the diagnostic screen.

## Windows setup

Use Node.js 22.13 or newer (tested host: 22.13.1). In PowerShell, inside this directory:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. The `.cmd` suffix avoids PowerShell script execution policy restrictions. Initial dependency installation requires internet; installed development and built runtime do not. Model/WASM assets are committed locally in `public/tracking`; the build copies and verifies them. No runtime CDN, remote font, model or asset requests are used. `npm.cmd run build` requires no network after installation. Keep the bundled runtime files when copying the project. Camera access requires localhost or HTTPS; opening `file://` or plain HTTP on a LAN address is unsupported. Recommended for this phase: current desktop Chrome or Edge with Web Workers, OffscreenCanvas and WebAssembly.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

For the automated production browser smoke test, install Google Chrome locally, run the production build, then run `node scripts/browser-test.mjs`. It launches Chrome headlessly and its own preview server on port 4173. `node scripts/licenses.mjs` refreshes the installed dependency license inventory and full notices.

Run `npm.cmd run test:tracking-browser` for the Phase 2 production browser suite (port 4174). It uses a fake camera with the real local model, then an explicitly mocked tracking backend to test the landmark/calibration interface. No physical webcam is accessed by this suite. It records only synthetic screenshots and aggregate performance measurements. The Vite config uses native loading to avoid unnecessary parent-directory scanning by the config bundler in restricted Windows environments.

Run `npm.cmd run test:motion-browser` for the Phase 3 hand-game integration suite (port 4175). It runs the actual local worker/model on fake-camera frames and substitutes controlled landmarks after inference to exercise gestures, ownership and sorting. It cannot establish real hand recognition or child usability. Performance samples still measure actual blank-frame model processing. See VALIDATION.md for exact executed results.

Production preview: http://127.0.0.1:4173. Keep the local server running; opening `dist/index.html` directly with `file://` is unsupported. For an offline transfer, prepare the installation on a matching Windows machine or serve the built `dist` directory with an already installed static server. There is no service worker installation workflow.

## Play

Choose a control mode and speed, then start. With the mouse, drag an object into a bin. In default hand mode, calibrate with open palms, approach an object, close the fist, carry it closed and open to release. No long dwell or index-tip hover is required. Dwell/pinch alternatives are in adult settings; switching anchor types requests recalibration. Match eight objects to finish. Wrong bins give encouraging hints with no deduction. Objects wait on the ground. Menu, restart, sound, fullscreen and pause remain. Pause cancels carries; hidden tabs close capture. Ordinary pause suspends inference but retains capture/model until menu exit. Sound uses local synthesized tones.

## Configuration and architecture

- `src/config.ts`: category labels/colors, speed, spawn interval, concurrent object limit, eight-star goal, logical 1280×720 coordinates.
- `src/game.ts`: independent state, classification, spawning, delta-time movement, scoring. Long inactive frames are clamped to prevent jumps.
- `src/input.ts`: shared pointer/grab/held/release/lost/disabled events and mouse adapter.
- `src/main.ts`, `src/scene.ts`: existing scene markup, rendering, feedback, settings and lifecycle.
- `src/interaction.ts`: common ownership/collision/carry/release handling; original classification logic is reused.
- `src/motion/`: pinch/dwell states, calibrated hand adapter and cursor feedback.
- `src/tracking/session.ts`: gameplay orchestration using existing Phase 2 modules without an extra render loop.
- `src/art.ts`: original inline SVG landscape and recognizable waste illustrations. No asset downloads or missing asset dependencies.
- `src/audio.ts`: synthesized gentle tones, silent fallback if unavailable.
- `src/style.css`: responsive 16:9 layout, reduced-motion support and focus indicators.
- `tests/game.test.ts`: classification matrix and state tests.

Vite and TypeScript remain sufficient; Phaser would add an unnecessary runtime dependency. Rendering and state remain separated. `src/tracking/` supplies an independent camera manager, worker-backed inference service, mapper, smoothing/association, calibration and diagnostics. Its `TrackingBackend`/`TrackingFrame` types remain independent of gameplay. The game converts those frames into shared input events. No adult/child tracking accuracy assumptions have been made; pose/arm tracking and Raspberry Pi support are not implemented or claimed.

Accessibility: labels and object illustrations supplement color, Turkish status messages use a live region, large buttons support focus, and sound is optional. Mouse dragging and hand dwell/pinch are available; dwell avoids requiring a precise pinch. Full keyboard-only sorting and spoken guidance are unfinished. The game targets landscape screens; a small portrait phone will show a smaller 16:9 scene. Goal: smooth play on a modern desktop, subject to device testing.

## Türkiye classification scheme

This game teaches material-separated collection: plastic yellow, paper blue, glass green, metal light grey. It does not depict mixed recycling or teach that every location uses four bins. Local collection instructions may vary. All colors and labels can be edited in `src/config.ts`. Sources checked 2026-10-23:

- Ministry: https://erzincan.csb.gov.tr/sifir-atik-yonetmeligi-resmi-gazetede-yayinlandi-haber-240271
- Ministry guidance: https://cygm.csb.gov.tr/atik-getirme-merkezlerinin-kurulmasi-ve-isletilmesi-ile-sifir-atik-uygulamalarina-iliskin-usul-ve-esaslar-yayimlandi-duyuru-421855

## Kullanıcının yapacağı manuel kabul testleri

1. `npm.cmd run dev` ile sunucuyu açın; adresi tarayıcıda açın. Türkçe karşılama ekranı ve Oyuna Başla düğmesi görünmeli.
2. Oyuna Başla'ya basın. Atıklar yukarıdan yavaşça inmeli; dört farklı nesne sırayla gelmeli.
3. Bir nesneyi fareyle tutun, ekran boyunca taşıyın. Nesne imleci takip etmeli ve tutulurken düşmemeli.
4. Plastik şişeyi sarı PLASTİK kutusuna bırakın. Nesne kaybolmalı, yıldız sayısı yalnızca bir artmalı ve olumlu mesaj görünmeli.
5. Kağıdı CAM kutusuna bırakın. Kağıt kutusunu öneren Türkçe mesaj görünmeli; puan düşmemeli; tekrar denemek mümkün olmalı.
6. Camı yeşil CAM, metal kutuyu gri METAL, kağıdı mavi KAĞIT kutularına bırakın. Hepsi doğru kabul edilmeli. Kutuların kenarlarına yakın bırakmayı da deneyin.
7. Bir nesneyi yere kadar bekletin. Kaybolmadan beklemeli. Sonra onu da sürükleyip ayırabilmelisiniz.
8. Sekiz doğru eşleştirme yapın. Kutlama ekranı görünmeli. Yeniden Oyna ile puan sıfırlanmalı. Üstteki ↻ de turu sıfırlamalı.
9. Ses düğmesine basın, doğru/yanlış denemeler yapın. Sessizde ses çıkmamalı; tekrar açınca nazik tonlar duyulmalı.
10. Duraklat, Devam Et ve başka pencereye geçip dönmeyi deneyin. Duraklamada nesneler hareket etmemeli, devamda sıçramamalı.
11. Tarayıcıyı yeniden boyutlandırın; tam ekranı açıp kapatın. Görseller ve fareyle bırakma konumları hizalı kalmalı. Kamera izni hiç istenmemeli.
12. Geliştirici konsolunda hata olmadığını kontrol edin. Ağ bağlantısını kestikten sonra kurulu yerel sunucuyu yeniden açın; oyun, görseller ve ses internet olmadan çalışmalı.
13. `npm.cmd run build` ve `npm.cmd run preview` ile aynı akışı üretim çıktısında tekrarlayın.

These manual checks are a checklist, not a claim of completed human/browser testing. See VALIDATION.md for checks actually executed.

Phases 1 and 2 were manually accepted by the user. Phase 3 is the current review boundary. Phase 4 may not start without explicit approval.

## Phase 1 files (Phase 2 additions are listed in docs/PHASE2.md)

```text
index.html
package.json
package-lock.json
tsconfig.json
.gitignore
src/config.ts
src/game.ts
src/input.ts
src/audio.ts
src/art.ts
src/main.ts
src/style.css
tests/game.test.ts
scripts/browser-test.mjs
scripts/licenses.mjs
README.md
VALIDATION.md
THIRD_PARTY_NOTICES.md
docs/dependency-licenses.json
docs/THIRD_PARTY_LICENSES.txt
docs/screenshots/menu.png
docs/screenshots/gameplay.png
docs/screenshots/completed.png
```

`node_modules/` and `dist/` are generated installation/build outputs and ignored by Git.
