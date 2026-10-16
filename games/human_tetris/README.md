# Human Tetris — SOLO + DUO (2.0)

**Modlar:** Tek kişilik SOLO 16 poz, gönderilen DUO kaynak sürümündeki 8 ikili poz. Bu DUO paketi temas kontrolü gerektiren 18 bölümlük DUO PARTY sürümünden farklıdır.

Tek ZIP içerisinde iki oyun modu. Bu sürüm SOLO v1.4 (hassasiyet/seviye geçişi düzeltmeleri) ile kullanıcının gönderdiği `Human-Tetris-Duo-Kaynak(1).zip` içindeki 8 orijinal iki kişilik bölümü birleştirir.

## Mac ve Windows'ta başlat

Node.js 20.19+ (tercihen 22) yüklü olsun. ZIP'i aç, terminalde `human-tetris` klasörüne gir:

```bash
npm install
npm run dev
```

Terminalde yazan `http://localhost:5173` (veya terminalin verdiği port) adresini Chrome'da aç.

1. Ana ekranda **TEK KİŞİ OYNA** veya **İKİ KİŞİ OYNA** düğmesine bas.
2. **KAMERAYI AÇ** düğmesiyle izin ver; **OYUNU BAŞLAT** düğmesine bas.
3. SOLO modda tek kişi 16 duvar oynar; DUO modda 2 kişi (ekranda soldaki Oyuncu 1, sağdaki Oyuncu 2) 8 duvar oynar.
4. Doğru poz(lar) yaklaşık yarım saniye sabit tutulmalı. Bir oyuncu yanlışsa DUO'da ikisi de geçemez; duvar çarpar ve aynı duvar tekrar gelir.
5. Vücut iskeletinde **yeşil: doğru**, **sarı: yaklaştın**, **kırmızı: yanlış**. Kamera altında her oyuncunun hata mesajı ve puanı ayrı gösterilir. Duvarın hedef çizgileri de renkli geri bildirim gösterir.
6. Mod değiştirirken kamera durdurulur; yeni mod için kamerayı yeniden açman gerekir. Modelin oyuncu sayısı 1 ya da 2 olarak yeniden ayarlanır.

**F** tuşu: Büyük ekran. `MODEL > Lite` yavaş bilgisayarlarda daha akıcı olabilir. Baş, omuz, diz ve ayaklar kamerada görünmeli.

**Kamerasız arayüz denemesi** gerçek algılama testi DEĞİLDİR. SOLO'da `1`; DUO'da `1` ve `2` tuşları yapay başarı simüle eder.

## Test

```bash
npm test
npm run build
```

Dahili kurallar ve TS kaynakları bu ortamda kontrol edilmiştir. Gerçek webcam testi yapılmamıştır. Ortam npm paket sunucusuna erişemediği için burada tam Vite derlemesi doğrulanamadı; internete bağlı kullanıcı bilgisayarında `npm install` gerekir.

Kamera ve MediaPipe modelleri yalnızca kullanıcının cihazında işlenir. Üçüncü taraf lisans bildirimleri için `THIRD_PARTY_NOTICES.md` ve `public/licenses/` klasörüne bakın.
