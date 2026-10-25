# Açık elin açıya bağlı tanınması — düzeltme

Kapsam: yalnız Kontrol Noktası A. Kullanıcı fiziksel testinde açık elin dik tutulmadığında BİLİNMİYOR kaldığını bildirdi. Bu, ilk laboratuvarın kabul edilmediği anlamına gelir; önceki sentetik testlerin gerçek poz çeşitliliğini doğruladığı varsayılmadı.

## Tespit edilen eksiklik

Önceki laboratuvar `Open_Palm`/`Closed_Fist` resmi etiketini ve güven eşiğini tek karar kaynağı olarak kullanıyordu. Eklemler açık eli gösterse bile model `None`, farklı kategori veya düşük puan verdiğinde UNKNOWN oluyordu. Worker, aynı modelin zaten ürettiği `worldLandmarks` verisini aktarmıyordu. Bu iki kod eksikliği doğrulandı. Kullanıcının belirli kamera/pozunda hangi model puanının geldiği kaydedilmedi; modelin bu pozu neden kaçırdığı konusunda kesin neden iddiası yok.

## Yapılan değişiklik

- `public/tracking/inference-worker.js` ve `src/tracking/types.ts`: resmi modelin 21 adet 3B dünya eklemi de taşınıyor. İkinci model veya Python yok. Kamera verisi kaydedilmiyor.
- `src/gesture-lab/geometry.ts`: işaret, orta, yüzük ve serçe parmak için PIP/DIP iç açıları, zincir uzunluğuna göre düzleşme oranı ve bilek→parmak kökü eksenine göre dışa uzanım hesaplanıyor. Ekranın yukarısı/aşağısı veya elin dik olması kontrol edilmiyor. Mesafe, açı ve yerel eksen üzerindeki izdüşüm global 3B dönüşten bağımsızdır.
- Dünya eklemleri varsa metre cinsinden aynı koordinat uzayı kullanılıyor. Yoksa normalize görüntüde x/z gerçek video en-boy oranıyla düzeltiliyor; sabit 4:3 varsayılmıyor. Çok küçük/bozuk eklem zincirleri geometri kararı üretmiyor. Dünya eklemleri de model tahminidir; gerçek fiziksel ölçüm değildir.
- En az üç uzanmış parmak ve hiç bükülü parmak yoksa OPEN; en az üç bükülü ve hiç uzanmış parmak yoksa CLOSED kanıtı üretiliyor. Başparmağın avuca yakın olması tek başına açık eli reddetmiyor. Tek parmak, barış işareti veya karışık bükülme açık el sayılmıyor.
- Resmi kategori güvenilir ve geometriyle uyumluysa kaynak “Model + parmak geometrisi”. Resmi kategori tanımsız/zayıfken açık geometri varsa “Parmak geometrisi”. Modelle geometri ters düşerse dört parmağın aynı yönlü geometrik desteği gerekiyor; üç parmaklık çelişki UNKNOWN kalıyor. Geometri kararsızsa ve karışık uzanmış/bükülü parmak kanıtı yoksa resmi model kullanılabiliyor.
- `gesture.ts`: kanıt seçimi ile zamana bağlı geçiş ayrıldı. Geometri sonucu sahte model güven puanına çevrilmiyor. Aynı el başına onay/histerezis/kayıp mantığı sürüyor.
- `tracks.ts`, `session.ts`: gerçek görüntü oranı ve iz başına hibrit kanıt bağlandı. Kimlik ve filtre mekanizması değiştirilmedi.
- `page.ts`: karar kaynağı, uzanmış/bükülü parmak sayıları, ham model etiketi/puanı ve her parmağın ölçümleri ayrı gösteriliyor. Ham model puanı geometrinin güveni gibi sunulmuyor. Parmağın ayrıntı paneli periyodik DOM yenilemesinde açık kalıyor.

Varsayılan model güven eşiği düşürülmedi. Yatay elin sınıflanması yalnız daha düşük bir model puanını kabul etmeye bağlanmadı. Mevcut fare oyununun etkileşim/puan/kollar kodu değiştirilmedi. Ortak worker çıktısı yalnız ek bir isteğe bağlı veri alanı içeriyor.

## Testler

`npm.cmd test`: **83/83 PASS**. Yeni geometri/worker testleri:

- 300 açık/yumruk örneğinde pitch/yaw/roll kombinasyonları, yatay ve 90° yandan pozlar.
- 96 görüntü koordinatı örneğinde 4 en-boy oranı, 3 ölçek, farklı dönüşler; perspektif ve model doğruluğu kanıtı değildir.
- Gevşek açık parmak, içeri yakın başparmak, karışık parmak/barış/işaret pozları.
- Bozuk/küçük/NaN ve gerçek dışı eklem zincirleri.
- Resmi `None` ve düşük puan altında açık geometri; model/geometri uyuşmazlığı.
- Yatay OPEN→CLOSED→OPEN, iki bağımsız el ve milisaniye bazlı onay.
- Worker protokolü üzerinden dünya eklemlerinin ve gerçek kategori etiketinin kaybolmadan taşınması (model nesnesi taklit edilen sınır testi).

`npm.cmd run build`: **PASS**, TypeScript ve 11 yerel varlığın hash kontrolü dahil.

Tarayıcı komutları:

```powershell
npm.cmd run test:gesture-lab-browser
npm.cmd run test:gesture-lab-orientation-browser
node scripts/browser-test.mjs
```

Üç tarayıcı testi de **PASS**. Birinci test gerçek yerel CPU/GPU modeli + sahte kamera kullanır. İkinci test gerçek çıkarımdan SONRA açıkça sentetik, döndürülmüş eklemlerle TypeScript→durum→Türkçe arayüz yolunu sınar; gerçek el doğruluğu testi değildir. Yatay OPEN→CLOSED→OPEN, iki elin ters bağımsız durumları, model/geometri çelişki mesajı, panel tıklamaları ve kamera temizliği geçti. Üçüncü test önceki fare oyununun turunu tamamladı. Tarayıcı koşuları aynı anda çalıştığından bu turun JSON süreleri performans karşılaştırması olarak kullanılmamalıdır. Önceki teslimin süre tablosu tarihsel ölçümdür.

Arayüzde iz kartları artık her 120 ms'de komple sökülüp oluşturulmuyor: mevcut düğümler korunarak ölçümler güncelleniyor. Böylece parmak ayrıntıları açılırken basma/bırakma arasına gelen yenilemenin tıklamayı yutması da giderildi ve tarayıcıda doğrulandı. İlk test bu hatayı yakaladı; düzeltme sonrası yeniden geçti.

## Yeniden fiziksel test

http://127.0.0.1:5173/gesture-lab sayfasını **Ctrl+F5** ile yenileyin ve kamerayı yeniden başlatın. Açık elinizi dik, yatay ve çapraz tutun, başparmağınızı gevşetin; sonra yumruk yapıp tekrar açın. İki elle bağımsız tekrarlayın. OPEN için parmakların kamerada gerçekten algılanabiliyor olması gerekir; tam örtüşme veya kameranın göremediği bir yüzey için tanıma garantisi yoktur.

Ham model hareketi “Tanımlanmadı” iken açık parmaklar yeterince algılanıyorsa ana durum “AÇIK”, kaynak “Parmak geometrisi” olmalıdır. Ana durum hâlâ BİLİNMİYOR ise parmak sayıları ve ölçümleri hangi kanıtın eksik olduğunu gösterir. Bu sürüm için fiziksel kabul henüz yapılmadı. B/C'ye geçilmedi.

API referansı: [Resmi Gesture Recognizer Web rehberi](https://developers.google.com/edge/mediapipe/solutions/vision/gesture_recognizer/web_js). Eklem türleri aynı resmi modelin mevcut çıktılarıdır. Yeni kopyalanmış üçüncü taraf kod, model veya bağımlılık yok; geometri bu proje için yazıldı.
