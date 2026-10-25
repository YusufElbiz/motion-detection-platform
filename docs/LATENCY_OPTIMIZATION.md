# Hareket hızı ve gecikme optimizasyonu

Kullanıcı, hibrit el algısının daha iyi olduğunu ancak oyunda yavaş hareket etmesi gerektiğini bildirdi. Bu sürüm çıkarım gecikmesi, kamera uzayında kimlik eşleme ve oyun uzayında hareket sürekliliğini ayrı ele alıyor.

## Doğrulanan kod kısıtları

1. Oyun `TrackingSession.start()` içinde işlemciyi daima CPU seçiyordu. Worker GPU ve CPU fallback desteklediği halde oyun bunu kullanamıyordu.
2. Takipçi her algılamayı yalnız son avuç konumuna açgözlü eşliyordu; hareket yönünü veya örnekler arasındaki süreyi kullanmıyordu. Mesafe kapısı sabit 0,24 normalize birimdi.
3. Oyunun 320 mantıksal piksel sıçrama sınırı her karede aynıydı. Aynı hızdaki hareket, örnek aralığı 50 ms yerine 100 ms olduğunda gereksiz yere taşımayı iptal edebiliyordu.
4. Yumruk modunda kullanılmayan pinch oranı ve eski geometri ölçümleri, zaten hibrit sınıflandırma yapılırken tekrar hesaplanıyordu.

Bu kısıtların varlığı koddan doğrulandı; kullanıcının fiziksel kamerasındaki toplam gecikmeye katkıları ayrı ayrı henüz ölçülmedi. Oyun konum filtresi hâlâ hıza uyarlanan EMA'dır; laboratuvarın One Euro filtresiyle üst üste uygulanmadı. Model kuyruğu zaten yoktu ve yine yok.

## Yapılanlar

### Çıkarım

`src/tracking/session.ts`: GPU öncelikli başlatma. Mevcut worker GPU kurulamazsa CPU'ya döner; gerçek kullanılan işlemci gösterilir. Kamera kapalıyken yetişkin kontrol panelinden CPU veya GPU seçilebilir. Kamera çalışırken bu seçim kilitlenir. GPU'nun çalışma sırasında hata vermesi hâlinde kullanıcı CPU'yu seçerek yeniden deneyebilir; otomatik CPU fallback modelin başlangıcı içindir.

Kamera görüntüsü korunarak işleme genişliği 640 veya 480 seçilebilir. 480 seçimi gerçekten worker'a giden bitmap'i küçültür; tarayıcı testinde doğrulanır. Bu profilin daha hızlı veya aynı doğrulukta olduğu iddia edilmiyor. Daha küçük eller/uzaklıkta ayrıntı kaybı yaratabilir; isteğe bağlı karşılaştırma içindir, varsayılan 640'tır.

### Kimlik eşleme

`src/tracking/association.ts`: en fazla iki el için tüm geçerli atamalar değerlendirilir. Hareket hızı/yönü yalnız kimlik eşlemede kullanılır. Kısa sabit hız öngörüsünün yanına ani dönüşü mümkün kılan son-konum hipotezi eklenir. Mesafe kapısı geçen süreyle artar ve 0,4 normalize birimde sınırlanır. Örtüşme ve birbirine yakın maliyetler belirsiz sayılır; eşleme uydurulmaz. El konumu veya poz tahminiyle yapay görünür eller oluşturulmaz.

`TrackingProcessor.predictive` yalnız oyun oturumunda açılır. Önceki tanı ekranının davranışı korunur. Ham eklemler jest ölçümü için korunur; var olan konum filtresi tek kez uygulanır. En fazla 100 ms kimlik öngörüsü, 180 ms sonrası hız sıfırlaması, hız büyüklüğü için üst sınır vardır. Tam örtüşmede fiziksel kimlik garantisi verilmez.

### Oyun hareket sürekliliği

`src/motion/continuity.ts`: yumruk modunda sıçrama kapısı, yaklaşık 20 örnek/sn için ayarlanmış 320 piksellik sınırı örnekler arası süreye uyarlar. En fazla iki katına çıkar; sınırsız sıçrama kabul edilmez. 100 ms arayla 400 piksel taşımada nesne korunur; 900 piksellik teleport iptal edilir. Kayıp delil süresi, açılıp/kapanma onayı ve belirsizlikte puan üretmeme kuralları korunur. Pinch/dwell sıçrama davranışı değiştirilmez.

Yumruk modunda gereksiz pinch/ikinci eski geometri hesabı kaldırıldı. Bu küçük CPU işi azaltımı için ölçülmüş bir FPS kazancı iddia edilmiyor; ağır iş hâlâ model çıkarımıdır.

### Ölçümler

`src/tracking/pipelineMetrics.ts` ve `src/scene.ts`: ekranda gerçek işlemci, kamera FPS, çıkarım FPS, ortalama/P95 model süresi, son verinin yaşı ve meşgulken atlanan kareler gösterilir. Ölçümler yalnız oturum belleğindedir. Son iki saniyenin P95'i, başlangıç dahil oturum atlama sayacından ayrıdır. Veri yaşı kamera callback zamanından hesaplanır; fiziksel hareket→sensör→ekran gecikmesi değildir.

## CPU/GPU karşılaştırması

Değişiklik öncesinde bu Windows PC'de kurulu headless Chrome, sahte kamera ve gerçek yerel Gesture Recognizer ile tekrar ölçüldü. Her işlemcide 80 çıkarım, ilk 20 ısınma örneği çıkarıldı. Algılanan el sayısı **0**. İki elin görünür olduğu model yükü ve gerçek kamera FPS'i ölçülmedi.

| İşlemci | Ortalama model | P95 model |
| --- | --- | --- |
| CPU | 25,82 ms | 28,30 ms |
| GPU | 19,61 ms | 29,20 ms |

Ortalama GPU'da yaklaşık %24 daha düşüktü; P95 azalmadı. Kamera kaynağı yaklaşık 20 FPS olduğu için her iki işlemci de bu testte yaklaşık 20 çıkarım/sn üretti. Bu sonuçtan gerçek oyun akıcılığının %24 arttığı çıkarılamaz. GPU başlangıcında ek ısınma/atlanan kareler görüldü; kalibrasyon dönemi bunları da içerir. Karşılaştırma aynı modelde GPU seçimini erişilebilir kılmayı destekliyor; gerçek kamera kabulünün yerini almıyor.

## Doğrulama

- **93/93 birim testi PASS**: eski oyun/laboratuvar testleri, zaman bazlı hareket sınırı, kamera eşlemesinden nesne sahipliğine kadar 10 FPS hızlı taşıma, ani yön değişikliği, ayrık çaprazlama, belirsizlik, teleport iptali, P95/veri yaşı sayaçları dahil.
- GPU başlatma hatasında CPU fallback ve dünya eklemlerinin taşınması taklit model sınır testinde doğrulandı.
- TypeScript/üretim derlemesi ve 11 yerel varlığın SHA-256 kontrolü PASS.
- Yumruk tarayıcı testi: döndürülmüş sentetik eller, model None, iki ayrı nesne, bırakma, kayıp, CPU/GPU seçimi ve gerçek 480 piksel bitmap iletimini sınar.
- Motion tarayıcı testi: diğer el etkileşimleri ve yaşam döngüsü.
- Fare tarayıcı testi: tam tur, puan, yanlış/doğru kutu, yeniden başlatma ve kamera gerektirmeyen kullanım PASS.

Son sürümde **yumruk ve motion tarayıcı testleri PASS**. İki bağımsız el, taşıma/bırakma, geometri alternatifi, GPU/CPU seçimi, 480 piksel aktarımı, kamera kapatma, dış ağ isteği ve tarayıcı hatası kontrolleri geçti. Tarayıcıdaki el pozları sentetiktir. Fiziksel kamera performansı ölçülmüş sayılmaz.

## Şimdi gerçek kamerada bakılacaklar

http://127.0.0.1:5173/ adresini Ctrl+F5 ile yenileyin. Ellerimle Oyna'yı seçip kalibrasyonu yapın. Önce 640/GPU ile aynı yatay/dikey taşıma hareketlerini 20 saniye deneyin. Kontrol panelindeki gerçek GPU/CPU, çıkarım FPS, P95 ve veri yaşını not edin. Ardından ana menüye dönüp CPU ile aynı koşulları karşılaştırın. İstenirse 480 profili ayrı denenebilir.

- FPS düşüyorsa ilk darboğaz çıkarım/kamera hattıdır.
- FPS yeterliyken veri yaşı yükseliyorsa aktarım/zamanlama incelenir.
- Taze veri gelirken el kimliği değişiyor veya nesne düşüyorsa eşleme/etkileşim kuralları incelenir.
- Konum doğruyken yalnız açma/kapama gecikiyorsa aday pozlar ve onay süreleri incelenir.

Kamera hareketi bulanık yakalıyorsa algoritma tek başına kayıp parmakları geri getiremez. Aydınlatma ve kamera pozlama süresi gerçek testte ayrıca değerlendirilmelidir. Mevcut sürüm için tüm hızlı fiziksel hareketlerin kabul edildiği veya gerçek iki el FPS hedefinin sağlandığı iddia edilmiyor.

Geri dönüş kopyası: `recovery/before-latency-*`.
