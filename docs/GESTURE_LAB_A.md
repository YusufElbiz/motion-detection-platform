# Kontrol Noktası A — İki el hareket laboratuvarı

**Açı bağımlılığı düzeltmesi:** Kullanıcının açık elin ancak dik tutulduğunda tanındığı fiziksel test geri bildirimi üzerine hibrit parmak geometrisi eklendi. [Güncel düzeltme ve test kaydı](GESTURE_LAB_ANGLE_FIX.md). Aşağıdaki ilk teslim kaydı model-etiketi tabanlı önceki sürümü anlatır; geometriyle ilgili karar ve güncel test sayısı yeni belgede açıklanır.

24 Ekim 2026. Kapsam yalnızca A: `/gesture-lab`. B (yakalama/bırakma laboratuvarı) ve C (oyuna/animasyonlu kollara bağlantı) uygulanmadı. Önceki oyunun el modu da korunuyor; yeni laboratuvar henüz onun yerine geçmiyor. Fiziksel kamera kabulü BEKLİYOR.

## Çalıştırma

Proje klasöründe PowerShell:

```powershell
npm.cmd run dev
```

Laboratuvar: http://127.0.0.1:5173/gesture-lab

Fare oyunu: http://127.0.0.1:5173/

Kamerayı başlat düğmesine basın; kamera sayfa açılışında otomatik açılmaz. Güncel masaüstü Chrome/Edge kullanın. Çözünürlük/CPU/GPU değişiminden önce durdurun. Diğer ayarlar canlı değişir. Varsayılan: 640×480 istenen çözünürlük, 30 kare/sn hedef, CPU, hareket eşiği 0,60; açık/kapalı onayı 60 ms. Gerçek çözünürlük ve işlemci ekranda gösterilir. İzin, kamera ve model hatalarında Türkçe yeniden deneme mesajı vardır. Sekme gizlendiğinde de kamera kapanır; geri dönünce elle başlatılır.

Üretim:

```powershell
npm.cmd run build
npm.cmd run preview
```

http://127.0.0.1:4173/gesture-lab adresini açın. Statik başka bir sunucu kullanılırsa `/gesture-lab` isteği `index.html` dosyasına yönlendirilmelidir. `file://` desteklenmez. Tüm model/WASM dosyaları yereldir; kurulum sonrası çalışma/derleme internet istemez.

## Kurtarma noktası

Klasör Git deposu değildi (`git status`: not a git repository). Bu nedenle dal yaratmak yerine değişikliklerden ÖNCE tam kaynak kurtarma kopyası alındı:

`recovery/before-gesture-lab-20261024-134415/`

İçerik: önceki `src`, `tests`, `scripts`, `docs`, `public` ve kök paket/lock/HTML/TypeScript/Vite/README/VALIDATION/lisans dosyaları. `node_modules` ve yeniden üretilebilir `dist` kopyalanmadı. `recovery/` gitignore'a eklendi. Kaynaklara dokunmadan karşılaştırılabilir. Geri dönüş için bu kopyayı ayrı, boş bir çalışma klasörüne kopyalayın, bağımlılıkları kurup önceki komutları çalıştırın. Mevcut klasöre körlemesine geri kopyalama yeni çalışmaları ezebilir.

## Kod denetimi: bulgu ile varsayımın ayrımı

| Alan | Önceki uygulamada görülen | Etkisi / kanıt sınırı |
| --- | --- | --- |
| Model | `service.ts` + `public/tracking/inference-worker.js`; tek Tasks Vision görevi; yumruk modunda Gesture Recognizer, `numHands:2`, yerel dosyalar | Aynı oturumda çift ağır model bulgusu YOK. |
| Döngü | `TrackingSession`: requestVideoFrameCallback, FrameGate, tek meşgul bayrağı; oyun tick'i çizim ve eski veri denetimi yapıyor | Çıkarım kuyruğu bulgusu YOK; işçi ana iş parçacığını modelden ayırıyor. |
| Kimlik | `processor.ts`: son ham merkeze açgözlü en yakın eşleştirme, hız öngörüsü yok. Yakın/benzer maliyetli ellerde geçmiş tamamen siliniyor | Belirsizlikte kimlikler tekrar tekrar doğabiliyor. Gerçek kameradaki sıklık ölçülmedi. |
| Konum | 21 noktanın hız uyarlamalı EMA'sı; avuç ortalaması 0,5,9,13,17; kalibrasyon, hassasiyet kazancı ve kenar kısıtlaması oyun içinde | Birkaç dönüşüm birden olduğundan ekrandaki el/oyun konumu ilişkisi laboratuvarda ayrıştırılmalı. Yanlış aynalama kesinleşmedi. |
| Hareket | `fist.ts`: resmi kategori için giriş 0,70/tutma 0,55; varsayılan 70 ms onay. Geometri seçeneğinde dört parmak inceleniyor | Tek parmakla yumruk kararı yok; 0,70 eşiği bazı gerçek pozları reddedebilir, kamera kanıtı olmadan kesin denemez. |
| Oyun durumu | `motion/input.ts`: açık el ile silahlanma, el hazır beklemesi, büyük sıçrama sıfırlaması, UNKNOWN 220 ms sonrası kayıp, kayıptan dönüşte kararlılık/mesafe kuralları | Poz doğru olsa bile etkileşim reddedilebilir. Bu laboratuvar bunları kullanmaz; B kapsamında ayrı incelenecek. |
| Çizim | Doğrudan DOM/SVG ve oyunun çizim döngüsü; React yok. Kollar `motion/arms.ts` üzerinden oyun hareket durumuna bağlı | Aşırı React state güncellemesi bulgusu YOK. Animasyon/poz ayrışması olası; fiziksel gecikme ölçümü yok. |
| Yaşam döngüsü | CameraManager nesil sayacıyla geç gelen izin akışını kapatıyor, worker kapanıyor; zaman aşımı mevcut | Bu yararlı modüller aynen yeniden kullanıldı. |

Bu denetim kullanıcı tarafından gözlenen tüm sorunların tek, doğrulanmış kök nedenini kanıtlamaz. Fiziksel kameraya erişilmeden el doğruluğu, çocuk eli performansı veya uçtan uca gecikme hakkında geçer not verilmedi.

## İncelenen açık kaynaklar ve kararlar

Kaynak dosyalar uygulamadan önce açılarak incelendi; araştırma sırasında bazı GitHub raw/REST uçları erişilemediğinde GitHub dosya görünümü kullanıldı.

1. [Resmi örnek — gesture-recognizer.ts](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/tasks/gesture-recognizer.ts), [gesture-recognizer.worker.ts](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/gesture-recognizer.worker.ts), [base-worker.ts](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/workers/base-worker.ts), [base-vision-task.ts](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/src/components/base-vision-task.ts). Tasks Vision VIDEO çağrısı, worker bitmap kapatma, iki el seçenekleri, CPU'ya dönüş ve kamera temizliği incelendi. Mevcut yerel adapter korundu; örneğin uzak model indirme/önbellek yapısı alınmadı. [Apache-2.0 lisansı](https://github.com/google-ai-edge/mediapipe-samples-web/blob/main/LICENSE) doğrulandı.
2. [Resmi Web rehberi](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer/web_js): recognizeForVideo senkron çalışır; worker ana iş parçacığı blokajını önler. Resmi Open_Palm/Closed_Fist kategorileri doğrudan kullanılıyor; diğer kategoriler/None/eksik sonuç UNKNOWN.
3. [maniic main.py](https://github.com/maniic/gesture-recognition-system/blob/main/main.py): dört boyutlu sabit hız Kalman durumu, ölçüm güncellemesi ve parmak geometrisi incelendi. Eski `mp.solutions.hands`, sabit birim zaman matrisi ve sağ/sol temelli durum anahtarları bu uygulamaya taşınmadı. [README](https://github.com/maniic/gesture-recognition-system) MIT diyor; ayrı LICENSE metni doğrulanamadı. Hiç kod kopyalanmadı; yeniden dağıtım izni varsayılmadı. Bu referans algoritmik karşılaştırma içindir.
4. [jundolor one_euro_filter.py](https://github.com/jundolor/py-hand-tracker/blob/main/one_euro_filter.py) ve [one_euro_landmark_smoother.py](https://github.com/jundolor/py-hand-tracker/blob/main/one_euro_landmark_smoother.py): zamana bağlı türev, hıza göre kesim frekansı ve el başına filtre yaklaşımı incelendi. Sağ/sol etiketini kimlik olarak kullanma yaklaşımı alınmadı. [MIT lisansı](https://github.com/jundolor/py-hand-tracker/blob/main/LICENSE), 2026 jundolor, doğrulandı. Python çalışma zamanı, model veya kod alınmadı; genel One Euro denklemleri TypeScript'te özgün yazıldı.
5. [Fingerpose FingerPoseEstimator.js](https://github.com/andypotato/fingerpose/blob/master/src/FingerPoseEstimator.js): parmak başına eklem açısı/kıvrılma sınıflaması incelendi. [MIT lisansı](https://github.com/andypotato/fingerpose/blob/master/LICENSE), 2020 Andreas Schallwig, doğrulandı. Resmi modelden bağımsız bir geometri sınıflandırıcısı şu anda ölçülmüş bir ihtiyaç olmadığı için eklenmedi; kod/paket alınmadı.

Yeni üçüncü taraf bağımlılık veya kopyalanmış örnek kod yok. Önceden paketlenen değişmemiş MediaPipe JS/WASM ve Gesture Recognizer float16/1 modeli yeniden kullanılıyor. Model SHA-256: `97952348cf6a6a4915c2ea1496b4b37ebabc50cbbf80571435643c455f2b0482`. Derleme her iki model ve çalışma varlıklarının hash'lerini doğruluyor.

Model lisansı, örnek deposunun lisansından türetilmedi: [resmi model sayfası](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer#models), [upstream lisansı](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE) ve [bakımcının kaynak/modeller için Apache-2.0 açıklaması](https://github.com/google-ai-edge/mediapipe/issues/6355) mevcut kayıtla karşılaştırıldı. Ayrı model şartı bulunmadı. Tam paket içi üçüncü taraf WASM bildirimleri/provenansının eksikliği önceki `THIRD_PARTY_NOTICES.md` belgesinde açıkça kayıtlıdır ve burada giderilmiş sayılmaz. Ticari dağıtımın tüm bileşenler bakımından kesin olarak onaylandığı iddia edilmez. Mevcut lisans/bildirim dosyaları korunur.

## Yeni mimari ve dosyalar

`src/entry.ts` yolu seçer: laboratuvar dinamik yüklenir, oyunun sahnesi/motion modülleri bu yolda başlatılmaz. `index.html` yalnızca giriş dosyasını değiştirir. Mevcut `src/main.ts`, oyun, puan, çizim, fare ve motion kaynaklarına değişiklik yapılmadı.

| Modül | Sorumluluk |
| --- | --- |
| `src/gesture-lab/session.ts` | Tek kamera ve worker sahibi; nesil denetimi, tek uçuşta çıkarım, benzersiz kamera karesi, kuyruksuz atlama, en güncel sonraki kare, CPU/GPU seçimi, ölçümler ve durdurma |
| `tracks.ts` | En fazla iki mantıksal iz; tüm olası atamaları değerlendirme, hız öngörüsü, mesafe kapısı, düşük ağırlıklı yardımcı handedness bilgisi; kayıp/belirsiz durum |
| `gesture.ts` | İz başına UNKNOWN/OPEN/CLOSING/CLOSED/OPENING; giriş/tutma eşiği histerezisi, ayrı açık/kapalı süreleri, milisaniye bazlı onay, UNKNOWN ve zaman sıçramasından toparlanma |
| `filter.ts` | Yalnız avuç merkezine tek One Euro filtresi; el/eksen başına durum, gerçek zaman farkları; hız arttıkça kesim artar; 180 ms boşlukta sıfırlama |
| `mapping.ts` | Saf contain/cover + merkez kırpma/letterbox dönüşümü; x yalnız bir kez aynalanır, CSS pikseli üzerinden hesaplanır |
| `page.ts`, `style.css` | Türkçe önizleme, gerçek 21 noktalı iskelet, ham/filtreli avuç, iz kartları, sınıflandırma güveni, durum geçmişi, ayarlar ve ölçümler |
| `tests/gesture-lab.test.ts` | Kimlik, kayıp, çaprazlama, belirsizlik, bağımsız hareketler, zamanlı geçiş, dönüşüm, filtre ve yaşam döngüsü testleri |
| `scripts/gesture-lab-browser-test.mjs` | Gerçek yerel model + Chrome sahte kamera ile üretim smoke testi, CPU/GPU ölçümü; algılama çıktısı değiştirilmez |

Diğer değişiklikler: `package.json` yeni tarayıcı testi komutu; `.gitignore` kurtarma klasörü; `README.md` ve bu belge/sonuç JSON'u. `dist` yeniden üretildi. Derleme mevcut prepare script'iyle yerel varlık manifestini/bildirim kopyasını yeniden oluşturur.

### Kimlik ve belirsizlik sözleşmesi

Algılama sırası ve handedness kalıcı kimlik değildir. Mantıksal ID oturumlar arasında bile aynı sayfada yeniden kullanılmaz. Kısa kayıpta ID 650 ms saklanır; görünmeyen el için iskelet veya hareket uydurulmaz. 180 ms eski filtre ve poz delili sıfırlanır. Mesafe kapısını aşan yeni algılama eski durumu devralamaz.

Öngörülebilen, birbirinden ayrık çapraz geçişte hız bilgisi kimliği korur. Avuçlar 0,065 normalize mesafeden yakınsa veya alternatif atamalar arasındaki maliyet farkı 0,035'ten küçükse kimlik belirsizdir. Bu durumda pozlar UNKNOWN yapılır, renkli kimlik ataması durur; gerçek ham iskeletler sarı gösterilir. Ayrılma sonrası yeni ID verilir ve ekranda kimlik yenileme sayısı açıklanır. Bu, örtüşmeden sonra fiziksel kimliğin kanıtlandığı anlamına gelmez. Görsel biyometrik yeniden tanımlama yoktur; tamamen örtüşen ellerin fiziksel kimliğini garanti etmek mümkün değildir.

### Zaman ve performans sözleşmesi

requestVideoFrameCallback varsa kamera sunumları sayılır; yoksa video.currentTime değişimleri sayılır (tam sensör FPS'i değildir). Aynı kare tekrar işlenmez; worker meşgulken kareler atılır. Kuyruk oluşmaz. Sonuç yaşı 180 ms'yi aşarsa etkileşim/işaretçi verisi olarak kabul edilmez. Uzun model çalışmasında ekranda tutarlı biçimde kayıp görünmesi, eski pozun güncelmiş gibi kalmasından daha doğrudur.

Ortalama/P95 yalnız worker içindeki model çağrısı süresidir. Bitmap hazırlama ve worker gidiş-gelişi ayrı gösterilir. Veri yaşı kamera karesi callback zamanından itibaren hesaplanır; fiziksel hareketten sensöre/ekrana gerçek uçtan uca gecikme DEĞİLDİR. Açık/kapalı onay zamanı ilk kabul edilen aday ile doğrulayan örnek arasındadır. 60 ms ayarının gerçekleşen süresi kare aralığı nedeniyle örneğin 66 veya 100 ms olabilir. Onay sabit kare sayısına bağlı değildir. Arayüz kartları yaklaşık 8 Hz, canvas çizimi ekran döngüsünde güncellenir; bu ikinci bir inference döngüsü değildir.

CPU varsayılandır. Aynı worker GPU talebini deneyebilir; SDK/OffscreenCanvas/WebGL başarısızsa mevcut adapter CPU'ya döner ve gerçek kullanılan işlemci UI'da görünür. Desteklenmeyen GPU/worker konfigürasyonunun daha hızlı olduğu iddia edilmez. Model senkron çağrıları worker içinde bloklar, UI'da değil. Düşük FPS kamerada fiziksel akıcılık sınırı devam eder.

### Gizlilik

Video/eklem/çocuk verisi kaydı veya yükleme yok. Poz geçmişi yalnız sınırlı oturum belleğinde tutulur. Analitik servisi eklenmedi. SDK'nın olası dış iletişimi mevcut worker fetch/XHR yerel GET/HEAD kısıtı ve CSP ile sınırlıdır. Test JSON'ları yalnız sahte kamera üzerindeki toplu süreler ve sayaçlar içerir; gerçek kullanıcı videosu veya eklemleri içermez. Model/WASM yereldir.

## Otomatik doğrulama

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd run test:gesture-lab-browser
node scripts/browser-test.mjs
npm.cmd run test:tracking-browser
npm.cmd run test:motion-browser
npm.cmd run test:fist-browser
```

İlk test/derleme: 71/71 birim testi geçti (21 yeni laboratuvar testi dahil), TypeScript kontrolü geçti, üretim derlemesi ve 11 model/runtime/lisans varlığının hash kontrolü geçti. Tarayıcı sonuçlarının son durumu bu belgenin altına işlenir. Maket testleri fiziksel kabul değildir.

## Gerçek kamera kabul formu — kullanıcı dolduracak

Yetişkin test eden: __________ Tarih: __________ Kamera/PC/tarayıcı: __________

Gerçek çözünürlük: __________ İşlemci: __________ Ortam/ışık/mesafe: __________

Önce varsayılanları kullanın. Her başarısızlıkta iz kimliği, durum, model güveni, çıkarım kare/sn, ortalama/P95 ve veri yaşını not edin. Yüz/çocuk videosu kaydetmeyin. Aşağıdaki alanlar otomatik doldurulmamıştır.

| Test | İşlem ve beklenen sonuç | PASS / FAIL | Not |
| --- | --- | --- | --- |
| A1 | Tek açık eli 10 saniye tutun. AÇIK kararlı olmalı. | ____ | ____ |
| A2 | Aynı eli 10 saniye yumruk yapın. KAPALI kararlı olmalı. | ____ | ____ |
| A3 | On kez açıp kapatın. On gerçek döngü görülmeli, durum takılmamalı. | ____ | ____ |
| A4 | A1–A3'ü diğer elle tekrarlayın. | ____ | ____ |
| A5 | İki açık eli kaldırın. İki bağımsız görünür iz olmalı. | ____ | ____ |
| A6 | Yalnız bir eli kapatın. Biri KAPALI, diğeri AÇIK kalmalı. | ____ | ____ |
| A7 | Kapalı olan eli değiştirin. İki iz birbirinden bağımsız geçmeli. | ____ | ____ |
| A8 | İki eli yatay/dikey oynatın; kendi sağınıza hareket ekranda sağa gitmeli; ham merkez önizlemeyle örtüşmeli. Pencereyi de boyutlandırın. | ____ | ____ |
| A9 | Elleri çaprazlayıp ayırın. Ayrık izler korunmalı; gerçek örtüşmede belirsizlik ve gerekirse yeni kimlik açıkça gösterilmeli. Eski poz sessizce başka ele geçmemeli. | ____ | ____ |
| A10 | Bir eli kısa süre saklayıp geri getirin; diğerini görünür tutun. Kayıp açıkça gösterilmeli ve normal algılamaya dönmeli. 650 ms sonrası yeni ID normaldir. | ____ | ____ |
| A11 | Elleri hızlı oynatın. Gözlenen gecikmeyi ve veri yaşını not edin; geriden gelen bir kare kuyruğu olmamalı. | ____ | ____ |
| A12 | Yumuşatmayı açıp kapatın. Durağan titreşim / hızlı hareket gecikmesini karşılaştırın. | ____ | ____ |
| A13 | Farklı mesafe ve ışıkta tekrarlayın. El görünmüyorsa zorla ikinci iz oluşmamalı. Güven düşüşleri görünür olmalı. | ____ | ____ |
| A14 | Durdurun, yeniden başlatın, başka sekmeye geçin ve Oyuna dön bağlantısıyla ayrılın. Kamera ışığı sönmeli, ses alınmamalı, yeniden başlatma mümkün olmalı. | ____ | ____ |
| A15 | Eski oyunda fareyle yanlış/doğru kutuya sürükleyin; puan, yeniden başlat, duraklat ve tur bitişini kontrol edin. | ____ | ____ |

Ölçüm: Kamera FPS ____ Çıkarım FPS ____ Ortalama ____ ms P95 ____ ms Veri yaşı ____ ms Açık/kapalı onay ____ / ____ ms Atlanan kareler ____

CPU/GPU karşılaştırması için aynı çözünürlük, aynı iki el pozu/ışık ile en az 20 saniye deneyin; başlatma ısınmasını ayrı tutun. Başarılı fiziksel test ve açık kullanıcı onayı gelmeden B/C'ye geçilmez.

## Bilinen sınırlar

- Fiziksel webcam/çocuk eli doğruluğu ve tüm A1–A15 sonuçları ölçülmedi; kullanıcı testi bekliyor.
- Örtüşme sırasında kimlik garantisi yok; açık belirsizlik ve yeni ID güvenli toparlanma sözleşmesidir.
- One Euro ve süre/eşik varsayılanları başlangıç ayarlarıdır; fiziksel ölçümle ayarlanmalıdır.
- Sahte kamera performansı eller görünürken çalışan sınıflandırma yükünü temsil etmez.
- Mevcut oyunun el modu bu yeni mimariye taşınmadı. Bu görev oyun içindeki yakalama/kol sorunlarının giderildiğini iddia etmez.

## Son doğrulama sonuçları — 24 Ekim 2026

| Kontrol | Sonuç |
| --- | --- |
| `npm.cmd test` | PASS: 71/71; 21 yeni laboratuvar testi |
| TypeScript | PASS: `tsc --noEmit`, üretim derlemesinde de tekrar doğrulandı |
| `npm.cmd run build` | PASS: Vite üretim çıktısı; 11 yerel model/runtime/lisans varlığının SHA-256 doğrulaması |
| `npm.cmd run test:gesture-lab-browser` | PASS: doğrudan rota, izinsiz otomatik kamera açılmaması, gerçek CPU/GPU model çağrıları, tek çıkarım, benzersiz zaman damgaları, DPR/boyutlandırma, ayarlar, durdur/başlat, pagehide temizliği, fare oyununa dönüş, sayfa hatası yok, yalnız yerel GET istekleri |
| `node scripts/browser-test.mjs` | PASS: fare sürükleme, yanlış/doğru kutu, puan, ses durumu, yeniden başlat, duraklat/devam, boyutlandırma, sekiz yıldız/tur bitişi, tekrar oynama, dış ağ isteği yok |
| `npm.cmd run test:tracking-browser` | PASS: eski takip tanı ekranı; gerçek model/sahte kamera, yaşam döngüsü, hata kurtarma, dış istek ve tarayıcı hatası yok |
| `npm.cmd run test:motion-browser` | PASS: eski oyun el bağlantısı; gerçek yerel model sonrasında kontrollü sentetik eklemler |
| `npm.cmd run test:fist-browser` | PASS: eski yumruk/avuç/kollar/iki el sahipliği/kayıp/geometri alternatifi |
| Önceki kaynakların kurtarma kopyasıyla SHA-256 karşılaştırması | PASS: önceki 30 `src` dosyasında 0 değişiklik |
| Çalışan geliştirme sunucusu `/gesture-lab` | HTTP 200, http://127.0.0.1:5173/gesture-lab |
| Fiziksel kamera A1–A15 | BEKLİYOR; otomatik testlerden kabul sonucu çıkarılmadı |

Test çalıştırma notu: ilk paralel tarayıcı turunda yeni laboratuvar testi ile eski yumruk testinin ikisi de 4178 portunu istediği için eski test sunucusu başlayamadı. Yeni test kalıcı olarak 4180 portuna taşındı. Eski yumruk testi yeniden tek başına çalıştırıldı ve geçti. Son laboratuvar ölçümü de diğer testler çalışmıyorken yeniden yapıldı; aşağıdaki sonuçlar bu son turdan.

### Ölçülen performans

Kaynak: [ham toplu sonuçlar](gesture-lab-browser-results.json). Kurulu Chrome, headless, sahte kamera renk çubukları, gerçek yerel Gesture Recognizer. Her işlemci için 80 çıkarım; ilk 20 ısınma örneği ortalama/P95 hesabından çıkarıldı. Algılanan el sayısı 0. El görünürken çalışan landmark/gesture başlıklarının yükünü temsil etmez. Fiziksel iki el doğruluğu, gerçek kamera FPS'i ve fiziksel uçtan uca gecikme ÖLÇÜLMEDİ.

| İstenen / gerçekleşen | Ortalama model | P95 model | Son 3 sn çıkarım FPS | Son 3 sn kamera callback FPS | Aynı anda çıkarım |
| --- | --- | --- | --- | --- | --- |
| CPU / CPU | 28,61 ms | 31,00 ms | 20,0 | 20,0 | 1 |
| GPU / GPU | 18,86 ms | 35,90 ms | 19,5 | 20,0 | 1 |

Son üç saniyelik canlı ekran ortalamaları tüm ısınma sonrası örneklerin ortalamasından farklıdır. CPU canlı ortalama veri yaşı 29,4 ms; GPU 19,6 ms (callback → sonuç). Ekran anlık son veri yaşı CPU 39,0 / GPU 44,5 ms idi. Başlangıç dahil oturum sayaçları CPU: meşgul 4, eski sonuç 1, atlanan kamera sunumu 0; GPU: meşgul 40, eski sonuç 1, atlanan kamera sunumu 39. Aynı kare zaman damgası tekrar gönderilmedi ve kuyruk oluşmadı. GPU ortalaması düşük olsa da bu örnekte P95 ve başlangıç atlamaları daha yüksek; bu nedenle CPU varsayılanı korunuyor. Gerçek iki el yüküyle karşılaştırma kullanıcı kabulünün bir parçasıdır.
