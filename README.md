**Yeni: [2. Bölüm — Geri Dönüşüm Atölyesi](docs/WORKSHOP.md).** Ayrılan atıklarla Topik eşliğinde birleştir ve boya; tamamen elle (yumruk/avuç) oynanır. Tarayıcı testi: `node scripts/workshop-browser-test.mjs` (derlemeden sonra).

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

## At�k say�s� ve Topik

Men�de **At�k say�s�** alan�ndan 1�40 aras�nda tur uzunlu�u se�ilir. Puan hedefi,
�retilen toplam nesne say�s� ve sonu� mesaj� bu se�imi izler; yeniden oyna ayn�
say�yla ba�lar. Varsay�lan 8 at�kt�r.

Kaplumba�a Topik oyun boyunca k�sa te�vik mesajlar�, finalde geri d�n���m�n
faydas�n� anlatan k�sa bir konu�ma sunar. Konu�malar her zaman yaz�l�d�r;
sesli okuma taray�c�n�n Speech Synthesis �zelli�ini ve cihazdaki T�rk�e ses
deste�ini kullan�r. T�rk�e sesin kalitesi/kullan�labilirli�i ve internet
 gereksinimi cihaz�n konu�ma motoruna ba�l�d�r. Ses d��mesi hem m�zik
ipu�lar�n� hem maskot konu�mas�n� kapat�r. Men�ye d�n��, duraklatma ve pencere
oda�� kayb� konu�may� keser. Finalde **Tekrar dinle** d��mesi bulunur.

`node scripts/mascot-browser-test.mjs` geli�tirme sunucusu 5173 portundayken
hedef se�imi, maskot mesajlar�, sonu�, yeniden oynama ve sessize almay� denetler.
Test ses API �a�r�lar�n� taklit eder; fiziksel cihazda T�rk�e sesi do�rulamaz.

### Topik kutuya rehberlik eder

Topik arka planda dola��r; do�ru e�le�tirmede z�play�p y�ld�zlarla sevinir.
Yanl�� kutuya b�rak�lan nesnenin do�ru kutusuna gidip o kutuyu parlat�r.
Cam i�in �Camlar buraya! Ye�il kutuya, birlikte atal�m!� der; di�er ��
malzemenin de kendi renk ve kutu ipucu vard�r. Bu yard�m, eski yanl�� kutu
konu�mas�n� hemen keser; do�ru e�le�tirme de yard�m konu�mas�n� kutlamayla de�i�tirir.

Ses dosyalar� d�rt rehberlik c�mlesiyle birlikte toplam on adettir.
GitHub ara�t�rmas�, �nerilen yeni ses motoru ve kurulumun bekleyen onay�:
[docs/TOPIK_VOICE_RESEARCH.md](docs/TOPIK_VOICE_RESEARCH.md).

### G�ncel karakter: Sincap Topik

Kaplumba�a yerine �zg�n bir sincap �izimi kullan�l�r. Topik arka ortada
bekler; en yeni nesneyi g�zleri ve hafif ba� e�imiyle izler. Yard�m gerekti�inde
ilgili kutuya yakla��r, yard�m veya kutlama sonras�nda merkeze d�ner. Nesne
ve kutular�n arkas�ndad�r; t�klamay� engellemez. Kuyruk, g�z k�rpma, nefes ve
z�plama katmanlar� ayr� animasyonlard�r. �nceki �arka planda dola��r� a��klamas�
bu davran��la de�i�tirilmi�tir.

### Yeni karakter sesi �rnekleri

`http://127.0.0.1:5173/voice-auditions.html` adresinde VoxCPM2 ile tasarlanan
�� ayr� sincap sesi kar��la�t�r�l�r. Her biri ayn� be� oyun c�mlesini s�yler.
Eski sesi dinleme se�ene�i de vard�r; iki kay�t ayn� anda �almaz.
Model ve ara�lar yaln�z haz�rl�k i�in `.tools/` alt�nda tutulur, `dist/` i�ine
al�nmaz. Yeni sesin oyunun b�t�n c�mlelerine uygulanmas� kullan�c� se�imine ba�l�d�r.

`node scripts/voice-auditions-browser-test.mjs` �rnek kay�tlar� ve oynat�c�y�
do�rular. Bu test sesin �znel do�all���n� �l�mez.

### Se�ilen ses ve g�ncel hareketler

Kullan�c� ���nc� sesi se�ti. Oyun art�k `public/audio/topik/voice-3/` i�indeki
on konu�may� �alar; referans ve tohum 3637895427 korunur. Ses biraz k�s�ld�
(-21 LUFS hedefi, oynat�c� 0,8); hafif frekans s�zme ve netlik ayar� eklendi.
Perde ve h�z de�i�medi. `scripts/generate-selected-topik.py` bu paketi haz�rlar.

Sincab�n dinlenme pozunda iki kolu a�a��dad�r. Selam verirken el sallar,
yard�mda kutuyu i�aret edip ba��yla onaylar, y�r�rken ayaklar�n� s�rayla
kald�r�r. Do�ru e�le�tirmede iki kolunu kald�rarak z�plar ve g�zleri g�ler;
g�lgesi yerde kal�p k���l�r. Kulak, kuyruk ve k���k pati hareketleri ayr�
katmanlard�r. Azalt�lm�� hareket tercihi bu hareketleri de kapat�r.

### Ek karakter sesi denemeleri

`/voice-examples.html` sayfas�nda �� farkl� ses tarifiyle haz�rlanan yeni
�rnekler bulunur: 4 yumu�ak masal, 5 ne�eli �izgi film, 6 oyuncu minik dost.
Her biri ayn� be� oyun c�mlesini, kendisi i�in �retilen sentetik referans ve
sabit tohumla okur. Perde ve h�z de�i�ikli�i uygulanmaz; ses d�zeyi kar��la�t�rma
 i�in -21 LUFS hedefiyle normalize edilir. Oyundaki se�ili ���nc� ses korunur.

Kaynaklar ve �retim bilgileri `public/audio/topik/auditions-2/manifest.json`,
WAV ��kt�lar� `output/voice-auditions/round-2/` alt�nda tutulur.
`node scripts/extra-voices-browser-test.mjs` dosyalar�n oynad���n� ve bir
�rnek ba�lat�l�nca di�erinin durdu�unu denetler.

### Arka plan m�zi�i

Kullan�c�n�n g�nderdi�i `Do�aya_Dost_Ol.mp3`, `public/audio/music/dogaya-dost-ol.mp3`
olarak oyuna eklendi. Turla ba�lar, d�ng�de �alar; maskot konu�urken k�s�l�r ve
konu�ma bitince eski d�zeyine d�ner. Duraklatmada kald��� konum korunur; men�,
yeni tur ve tur sonunda s�f�rlan�r. Ses d��mesi t�m sesleri birlikte kontrol eder.
`node scripts/music-browser-test.mjs` bu davran��lar� ger�ek sesle denetler.

Mevcut motor d���ndaki seslendirme alternatifi, haz�r karakter tarifi ve k�sa
oyunculuk denemesi: [docs/TOPIK_SESLENDIRME_ALTERNATIFI.md](docs/TOPIK_SESLENDIRME_ALTERNATIFI.md).
ElevenLabs ile hen�z kay�t �retilmedi; oyunda se�ilmi� ���nc� ses korunur.

### Do�a do�ru e�le�tirmelerle canlan�r

Tur kirli ve solgun bir bah�ede ba�lar. �lerleme `do�ru e�le�tirme / se�ilen
at�k say�s�` oran�d�r. Her do�ruda dekoratif ��pler azal�r, g�ky�z� ve a�a�lar
canlan�r, �i�ekler belirir. Son b�l�mde ku�lar ve bir kelebek g�r�n�r. Yanl��
kutu do�ay� geriye g�t�rmez ve ilerletmez. Tur tamamland���nda ��pler ve sis
biter; yeniden oynama �evreyi ba�lang�� durumuna d�nd�r�r. Azalt�lm�� hareket
tercihinde renk/opa�l�k ge�i�leri ile ku�/kelebek hareketleri kapat�l�r.

�izim ve ilerleme: `src/environment.ts`. Dekoratif ��pler etkile�im almaz;
oynanabilir PNG at�klar �ndeki ayr� katmanda kal�r. �evre yaln�z skor veya
hedef de�i�ti�inde g�ncellenir.

`node scripts/environment-browser-test.mjs` yanl�� kutu, kademeli de�i�im,
temiz biti�, yeniden oynama, 1/4/40 hedefleri ve azalt�lm�� hareketi denetler.
�nce/yar�/son g�rselleri `docs/screenshots/environment-*.png` alt�ndad�r.

### Daha sakin konu�ma ak���

Sesli te�vik i�in hem son te�vikten sonra en az d�rt yeni do�ru e�le�tirme,
hem de k�rk saniye aktif oyun s�resi gerekir. Yanl�� kutu yard�m�ndan sonra da
bu s�re beklenir. Duraklat�lan zaman say�lmaz; k�sa turlar hi� ara te�vik
olmadan bitebilir. Sincab�n kutlamas� ve g�rsel geri bildirim devam eder.
Giri�, kutu yard�m� ve final konu�malar� korunur.

Arka plandaki m�zi�in yinelenen �Merhaba, ben Topik� c�mlesi ��kar�ld�.
Oyun `dogaya-dost-ol-no-intro.mp3` dosyas�n� �alar; orijinal dosya korunur.

### Ba�parmak kimlik kontrol� ve daha kararl� tutma

Oyun, model ve iz s�reklili�ine ek olarak ba�parma��n avuca g�re y�n�n�
kar��la�t�r�r. Sa�/sol, ekran�n sa��nda/solunda olmaya g�re atanmaz. A��k
avu�tan yumru�a ve yumruktan a��lmaya ge�i� en az d�rt �rnek ve 120 ms ile
do�rulan�r. �nceden a��k elle nesnenin �st�nde 100 ms bulunmadan havada
kapan�p yakla�mak nesneyi tutmaz. Geli�tirici panelinde 120/160/200/260 ms
se�enekleri vard�r. K�sa kimlik belirsizli�i eldeki nesneyi hemen d���rmek
yerine dondurur; uzun kay�pta veya bast�r�lan elde ta��ma puans�z iptal edilir.
Ayr�nt�lar ve fiziksel kamera testinin s�n�rlar�: [docs/HAND_IDENTITY.md](docs/HAND_IDENTITY.md).

### Tut-b�rak kullan�labilirlik d�zeltmesi

Fiziksel denemeden gelen geri bildirim �zerine zorunlu a��k el beklemesi ve
4 �rnek/120 ms alt s�n�r� kald�r�ld�. G�ncel varsay�lan 2 �rnek/60 ms;
panel se�enekleri 60/90/120/160 ms. A��k elle yakla� � yumruk yap � a��p b�rak
ak��� geri getirildi. Sa�/sol ba�parmak do�rulamas� korunur. Yeni regresyon
testi, yaln�z bir a��k-el �rne�iyle nesneye yakla��nca beklemeden tutmay� ve
tek karelik hatal� a��lman�n nesneyi b�rakmamas�n� denetler.

### Automatic start and mascot instructions

After calibration, two distinct visible hands held for 400 ms finish setup.
No gesture is required. Topik explains the selected controls before waste falls.
Bin checks use the visible object centre, with 32 px hand / 12 px mouse tolerance.
Wrong materials still fail. Covered by unit and synthetic-hand browser tests.
