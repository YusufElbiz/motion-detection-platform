# Topik: GitHub ses araştırması ve hareket davranışları

## Güncel karakter: sincap

Kaplumbağa, `src/squirrel.ts` içindeki özgün, katmanlı sincap çizimiyle
değiştirildi. Göz bebekleri ve baş eğimi en yeni nesnenin oyun koordinatlarına
göre güncellenir; imleç veya kullanıcının kamerası izlenmez. Sincap normalde
arka orta noktada (640,455) bekler. Yardım için doğru kutuya gider, kutlama
veya yardım bittikten sonra merkeze geri döner. Kuyruk, nefes, göz kırpma,
el sallama, konuşma ve sevinç hareketleri ayrı katmanlardadır.

GitHub'da `animated squirrel svg` ve `svg mascot animation bear` arandı.
[VS Code Pets](https://github.com/tonybaloney/vscode-pets) gibi hazır
karakter projeleri de incelendi. İncelenen hazır çözümler, bu oyunun nesneye
bakış, kutuya rehberlik ve merkezde bekleme davranışlarını bir arada sağlamadığı
için üçüncü taraf karakter kodu veya görseli kopyalanmadı; ek çalışma zamanı
kütüphanesi kurulmadı. Sonraki hareket açıklamalarında dolaşma yerine bu
merkezde bekleme davranışı geçerlidir.

Kullanıcı, yaklaşık 4 GB hazırlık kurulumunu açıkça onayladı. VoxCPM2 modeli,
CUDA çalışma DLL'leri ve hazır motor yalnız `.tools/` altında kuruldu; sistem
kurulumu veya kalıcı PATH değişikliği yapılmadı. Dağıtılan oyuna model değil,
küçük üretilmiş ses dosyaları eklenir. Dinleme sayfası: `/voice-auditions.html`.

25 Ekim 2026. Kullanıcı mevcut EmelNeural sesini beğenmedi; yeni bir karakter
sesi için GitHub araştırıldı. Mevcut sesin perdesini yeniden değiştirmek,
istenen farklı karakter sesini elde etmek olarak değerlendirilmedi.

İncelenen birincil kaynaklar:

| Proje | Bulgular ve bu oyun açısından anlamı |
| --- | --- |
| [VoxCPM2 Türkçe ses tasarımı](https://github.com/alexturkey/voxcpm2-turkce-ses-tasarimi) | İngilizce tariften sentetik bir ses tasarlayıp aynı referans ve tohumla Türkçe metin okuyabiliyor. Hazır Windows motoru ve 4 GB GPU için düzenlenmiş bir akış sunuyor. Yeni çizgi film karakteri sesi için denenmeye uygun aday. |
| [FreyaTTS](https://github.com/freyavoiceai/FreyaTTS) | Türkçe odaklı model. README, ses seçiminin tohuma bağlı olduğunu ve metin dışında doğrudan ses tasarımı koşullaması bulunmadığını açıklıyor. Kullanıcının tarif ettiği karaktere doğrudan ulaşmak daha belirsiz. |
| [Chatterbox](https://github.com/resemble-ai/chatterbox) | Çok dilli üretim ve ifade kontrolü sunuyor. Hazır bir Türkçe çocuk karakter sesi bulunduğu doğrulanmadı. |
| [Kikiri](https://github.com/semidark/kikiri-tts) | Yeni dil için Kokoro eğitim tarifi. Hazır bir çocuk karakter sesi yerine eğitim altyapısı; bu kısa oyun revizyonu için doğrudan çözüm değil. |

Ses motoru denemesinin durumu:

- RTX 3060 Laptop GPU, 6 GB VRAM ve sürücü 617.14 görüldü.
- VoxCPM2 kaynak kodu `.tools/vox/` içine alındı; AGENTS.md, ses tasarımı
  becerisi ve kurulum betiği okundu. Kalite 16 adım / cfg 2.0 kalacak.
- Kaynak betikteki geçici klasör silmelerinden önce proje içi yol ve reparse
  point denetimi eklendi. Kurulumdaki yedi başarı işareti doğrulandı.
- Model ve hazır motorun SHA-256 denetimleri geçti. Motor RTX 3060'ı gördü;
  paket içindeki 14 hazır ses listelendi ve ilk Türkçe deneme üretildi.
- Kaynak projenin 9 çevrimdışı testi geçti. 16 adım / cfg 2.0 korundu; GPU
  işleri birer birer yürütüldü.
- Windows motorunun Türkçe klasör adı sorunu, model dosyasını taşımadan
  geçici ASCII isimli sabit bağlantılarla giderildi. Bu bağlantılar üretim
  sonunda kaldırılır; gerçek model dosyası `.tools/` içinde kalır.
- Üç yeni varyant ayrı tohumlarla tasarlandı. Her biri kendi sentetik referansı
  ve tohumu ile aynı beş gerçek oyun cümlesini okur. Sesin beğenilmesi kullanıcı
  dinlemesine bağlıdır; otomatik testler öznel doğallığı kanıtlamaz.
- Kullanıcı üçüncü varyantı seçti. Referans ve tohum 3637895427 korunarak on
  oyun mesajı yeniden üretildi. Oyun `public/audio/topik/voice-3/` paketini çalar.
  Örneklerdeki -18 LUFS yerine -21 LUFS hedeflendi; hafif alt/üst frekans
  süzme ve konuşma netliği ayarı eklendi. Perde ve hız değiştirilmedi.

Ses tasarımı:

> A cheerful and gentle Turkish cartoon creature with a youthful, light,
> soft voice, a playful smile in the voice, clear native Turkish pronunciation,
> warm encouraging delivery for preschool children, lively but unhurried pace,
> clean studio recording with no background noise.

Üç sentetik varyant, gerçek bir kişiyi taklit etmeden hazırlanır. Gerçek üretim
istemi ve tohumlar `public/audio/topik/auditions/manifest.json` içindedir.
Kullanıcının dinleyerek seçtiği varyant daha sonra sabitlenir.

Tamamlanan oyun davranışları:

- Topik nesnelerin ve kutuların arkasında ortada bekler; tıklamayı engellemez.
- Doğru eşleştirme üç küçük zıplama ve yıldızlarla kutlanır.
- Yanlış kutuda Topik doğru malzemenin kutusuna gider; o kutu parlar.
- Plastik, kâğıt, cam ve metal için dört ayrı kısa rehberlik cümlesi vardır.
  Bu yeni rehberlik dosyaları şimdilik mevcut ses motoruyla üretilmiştir.
- Dolaşma ve rehberlik zamanı yalnız aktif oyun sırasında ilerler. Menüye
  dönüşte hedef işareti temizlenir. Azaltılmış hareket tercihinde konum geçişi
  anlık olur; zıplama ve parıltı animasyonları kapatılır.

Doğrulama: `npm.cmd test`, `npm.cmd run build`,
`node scripts/mascot-browser-test.mjs`. Son test gerçek yerel MP3'leri çözer,
oynatır, durdurur; öznel ses kalitesini ölçmez.
