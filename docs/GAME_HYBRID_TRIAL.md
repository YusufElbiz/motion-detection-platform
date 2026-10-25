# İyileştirilmiş el sınıflandırmasıyla oyun denemesi

Kullanıcı, laboratuvarda daha iyi sonuç aldığını bildirip oyunda denemeyi istedi. Bu istek doğrultusunda yalnız laboratuvarda iyileştirilen **hareket sınıflandırması** mevcut oyun etkileşimine bağlandı. Yeni bir oyun veya ayrı yakalama laboratuvarı oluşturulmadı. Fiziksel oyunun kabul edildiği varsayılmıyor.

## Değişiklik

- `src/motion/input.ts`, laboratuvarın aynı `classifyPose` fonksiyonunu çağırıyor. Gerçek modelin worldLandmarks bilgisi mevcut worker ve TrackingProcessor üzerinden korunuyor. Model None/düşük puan verdiğinde dört parmak geometrisi OPEN/CLOSED kararı verebiliyor.
- Poz hesabı ham eklemlerden, gerçek kamera en-boy oranıyla yapılıyor. Konumun yumuşatılması parmak kıvrım kararını geciktirmiyor.
- Varsayılan model eşiği 0,60, onay süresi 60 ms; laboratuvarla aynı başlangıç ayarları. Oyun sahnesindeki ayarlar da bu değerlere güncellendi. Hibrit kararı etkilemeyen eski açı kaydırıcıları kaldırıldı.
- Oyun içindeki mevcut açık elle hazırlanma, nesnenin üzerinde kapanarak yakalama, kapalı taşırken sahiplik ve açılarak tek sefer bırakma korunuyor. Kayıp/belirsizlik puan üretmiyor. Kollar aynı poz kararını gösteriyor. Fare, puan, kutu sınıflandırması ve resimler değiştirilmedi.
- Teknik tanıda geometri/model karar kaynağı, gerçek model etiketi ve parmak kanıtı ayrı tutuluyor. Geometrik uyum model olasılığı olarak sunulmuyor.

Bu adım laboratuvarın kimlik eşleştiricisini/One Euro filtresini oyuna taşımıyor. Oyunun önceki takip ve konum filtresi korunuyor; bu denemenin hedefi açıya bağlı OPEN/UNKNOWN sorununun oyun içindeki etkisini doğrulamak.

Geri dönüş kopyası: `recovery/before-game-hybrid-*` altında değişiklik öncesi src ve fist tarayıcı testi saklandı.

## Doğrulama

- `npm.cmd test`: **85/85 PASS**. Yeni testler model None iken yana eğilmiş/yatay elle gerçek oyun state'i üzerinden yaklaş→kapat→taşı→aç→tek puan ve belirsizlikte sahiplik iptalini doğruluyor.
- `npm.cmd run build`: **PASS**, TypeScript ve 11 yerel varlık hash kontrolü dahil.
- `npm.cmd run test:fist-browser`: **PASS**. Senaryo artık gerçek model çıkarımından sonra döndürülmüş/yan eğilmiş sentetik 3B eklemler ve resmi model None çıktısı kullanıyor. Gerçek kamera doğruluğu olarak yorumlanamaz. Bir/iki elle yakalama, bağımsız bırakma, yanlış/doğru kutu, kayıp, yeniden başlatma ve geometri alternatifi geçti.
- `node scripts/browser-test.mjs`: **PASS**, mevcut fare kontrolü ve tam tur kontrolü.

## Gerçek kamerayla deneyin

1. http://127.0.0.1:5173/ adresini açıp **Ctrl+F5** ile yenileyin.
2. **Ellerimle Oyna → Ellerimle Başla** seçin ve kamera iznini verin.
3. Önce bir, sonra iki elinizi gösterin; açık avuçlarla rahat erişim alanını tanıtın ve **Hazırım, Oynayalım!** düğmesine basın.
4. El açıkken atığa yaklaşın. Nesnenin üzerinde yumruk yapın, kapalı taşıyın, doğru kutunun üzerinde elinizi açın.
5. Aynı işlemi eli yatay/çapraz tutarak ve iki el bağımsız olacak şekilde deneyin. Kamera görüntüsündeki gerçek eller görünür kalmalı.

Kamera ışığının kapanması için ana menüye dönün. Fare ile Oyna kamera gerektirmez. Fiziksel denemede konum takibi veya sahiplik sorunu varsa sınıflandırma sorunundan ayrı değerlendirilmelidir.
