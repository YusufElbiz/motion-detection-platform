# El kimliği ve örtüşme

## Başparmak doğrulaması ve istemsiz jest koruması

Güncel oyun işlemcisi, başparmak MCP/IP noktalarını (2/3) bilek–orta parmak
kökü eksenine göre ölçer. Bu işaret ekran konumundan bağımsızdır; elin düzlem
içinde dönmesi veya yumruk kapanırken başparmak ucunun avuca katlanması tek
başına taraf değiştirmez. Ölçüm, modelin daha önce etiketlediği izin başparmak
işaretiyle karşılaştırılarak çapraz geçişte ek kimlik kanıtı sağlar.

İşaret tek başına anatomik sağ/sol anlamına gelmez: elin arka yüzü çevrilince
görünüm tersine dönebilir. Kenardan görünen avuçta, dejenere veya belirsiz
başparmak ölçümünde bu oy kullanılmaz. İki iz arasında güçlü bir çelişki varsa
işlemci kimliği uydurmak yerine belirsizlik bildirir. Modelin ilk etiketi ve
kamera koşulları hâlâ önemlidir; bu bir biyometrik kimlik garantisi değildir.

Kullanıcı fiziksel denemede tut/bırakın zorlaştığını bildirdiği için dört
örnek/120 ms ve nesne üzerinde 100 ms bekleme zorunluluğu kaldırıldı.
Güncel varsayılan, en az iki örnek ve 60 ms doğrulamadır; panelden
60/90/120/160 ms seçilebilir. Açık elle yaklaşmak, yumrukla tutmak ve açık
elle bırakmak yeterlidir; nesnenin üzerinde beklemek gerekmez. Önceden
tamamen kapanmış bir elle yaklaşmak yeni tutma olayı üretmez. Kısa
belirsizlikte eldeki nesne aynı sahibinde donar; açık el sayılmaz ve puan
üretilmez. Aynı kimlik/kapalı el kararlı biçimde geri dönerse devam edilir;
kayıp süresi dolarsa taşıma güvenle iptal edilir. Örtüşmede açıkça bastırılan
alt elin taşıması önceki gibi iptal edilir, öndeki ele aktarılmaz.

Doğrulama: başparmak çeviri/dönüş/yumruk testleri, ters model etiketiyle
çapraz el geçişi, çelişkide kimlik aktarmama, kısa yanlış yumruk/açılma ve
kapalı elle yaklaşma testleri. Sentetik tarayıcı testi gerçek yerel modeli
çalıştırır ancak çıktılarını kontrollü ellerle değiştirir; gerçek kamerada
doğruluk ve kullanıcı kabulü ayrıca denenmelidir.

Kaynak: [MediaPipe Hand Landmarker çıktıları ve landmark yapısı](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker/web_js).

Oyun, mevcut yerel MediaPipe Tasks Vision 1.1.1 modelinin anatomik
`handedness` sonucunu kullanır: Left sol kol, Right sağ kol. Görüntü modele
aynalanmadan gönderilir; yalnızca ekran koordinatları aynalanır. Ekranın
sağında/solunda bulunmak el türünü belirlemez. Yakın ve tekil zamansal
eşleşmeler kısa süreli sınıflandırma hatalarını bastırır. Örtüşmeden çıkışta
modelin anatomik etiketi yeniden esas alınır.

Avuçlar birbirine çok yaklaştığında farklı taraf etiketleri mevcutsa yalnızca
bir el etkin kalır. Avuç genişliği ve bilek–orta parmak kökü uzunluğu toplamı
öndeki el için yaklaşık ölçüdür; benzer ölçümlerde önceki seçim korunur.
Bastırılan elin taşıması iptal edilir, nesne başka ele veya kutuya aktarılmaz.
Eller ayrılınca iki taraf yeniden etkinleşir. Kimliği çözülemeyen aynı etiketli
algılamalarda önceki güvenli belirsizlik davranışı devam eder.

Tek kamera mutlak el derinliğini vermez. Landmark z bileğe, world landmark
koordinatları ise her elin kendi merkezine göredir; iki elin derinliğini bu
değerleri karşılaştırarak belirlemek doğru değildir. Avuç ölçeği de poz ve
kişinin el büyüklüğünden etkilenir. Gerçek kamera ile sağ/sol el, çapraz geçiş
ve örtüşme kabul testi gereklidir; otomatik testler fiziksel doğruluğu ölçmez.

Atık çizimlerine malzeme geçişleri, yansımalar ve belirgin kenarlar eklendi;
16 nesnenin adı oyun sırasında görünür. Görseller yerel SVG olarak kalır.

Kaynaklar (25 Ekim 2026):

- https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
- https://github.com/google-ai-edge/mediapipe/issues/6376
- https://github.com/google-ai-edge/mediapipe/commit/ed0c8d8

Mevcut resmî model zaten anatomik sınıflandırma içerdiği için ek bir üçüncü
taraf takip kütüphanesi veya ikinci model eklenmedi.
