# Ritim Canavarı · PNG Karakter Entegrasyonu · v1.2.0

Mevcut Ritim Canavarı oyununun karakter katmanı güncellendi. Kamera, MediaPipe worker, 13 hareketin eşleştiricisi, 10 bölüm, puan, ritim, kazanan kuralları ve 1/2/3 oyunculu oyun motoru korunur. Eski geometrik çocuk çizimi kaldırıldı; karakterler doğrudan PNG piksellerinden çizilir.

## Çalıştırma

Önce eski geliştirme sunucusunu **Control+C** ile kapat. ZIP'i yeni bir klasöre çıkar. Terminali ZIP içindeki `ritim-canavari` klasöründe aç. Node.js **20.19+ veya 22.12+** kullan:

```bash
npm install
npm run dev
```

Terminalde çıkan **Local / localhost** adresini Chrome'da aç. Kamera için `localhost` veya HTTPS gerekir; HTML dosyasını çift tıklayarak açma. Python veya ayrı bir sunucu kurulumu gerekmez. Python betikleri yalnızca sprite hazırlama ve örnek GIF üretimi için geliştirme araçlarıdır; hazırlanmış bütün PNG'ler ZIP içindedir.

```bash
npm test
npm run build
```

`npm run build` TypeScript kontrolü ve Vite üretim derlemesini çalıştırır. Kilitli bağımlılıklar `package-lock.json` içindedir. Mevcut Lite/Full modelleri ve WASM dosyaları yerel olarak pakete dahildir; oyun sırasında başka bir karakter/model CDN'i kullanılmaz.

## Oyuna başlama

1. 1, 2 veya 3 oyuncuyu ve kazanma kuralını seç.
2. **Kamerayı aç**. Her oyuncunun başı, elleri ve dizleri kadraja girsin.
3. **Oyunu başlat**. Karakterin hareket dizisini izle, sonra aynı sırayla yap.
4. Yanlış hareket adımı ilerletmez. Aynı doğru hareketi kısa süre tutmak gerekir. Tekrarlanan aynı pozda elleri geri çekip yeniden hareket ettirmek gerekir.
5. **İpucu göster** yalnızca o adımın hareketini tekrar gösterir. Sonraki adıma geçince görsel ipucu kapanır. **Ritmi tekrar izle** mevcut bölümün dizisini yeniden oynatır.

Hafızadan uygulama aşamasında karakter **nötr durur**; doğru cevap kendiliğinden gösterilmez. **Yeni ritim kuralı:** Oyuncu her hareketi 5 saniye içinde doğru başlatmalıdır. Süre dolarsa bulunduğu bölüm değişmez; o bölümün mevcut ritim dizisi birinci hareketten tekrar gösterilir ve oyuncu diziyi baştan yapar. Kamera kişiyi algılamadığında süre duraklatılır. Kamera üzerindeki puan/aşama bilgileri ve oyuncuların ayrı ilerlemesi korunur. Kayıt anahtarı aynı kaldığı için aynı localhost adresi/tarayıcıdaki kayıtlar okunmaya devam eder. Farklı port veya farklı tarayıcı ayrı yerel depolama alanıdır.

**Kamerasız arayüz denemesi** gerçek hareket tanıma yapmaz. Her oyuncunun `TEST: ADIMI GEÇ` düğmesi yalnızca arayüz ve bölüm akışını denemek içindir; ekranda açıkça test modu yazar.

## 13 hareketin test ekranı

Ana menüde **13 hareketi incele ↗** düğmesine bas. Aynı ekran `http://localhost:…/?sprites=1` ile de açılır.

- Hareket seçimi: bütün 13 hareket ayrı ayrı.
- Oynat/duraklat, kare kaydırıcısı, başlangıç/geçiş/hedef/dönüş düğmeleri.
- Yavaş/normal/hızlı oynatma.
- 1/2/3 oyuncu alanında boyut kontrolü.
- Sağ–sol hareketlerini yan yana karşılaştırma.
- Ayna veya çizimin orijinal yönü; temas vurgularını açma/kapatma.
- Alt bölümde bütün hedef pozların küçük önizlemeleri.

## Sağ–sol ve kamera aynası

MediaPipe landmark'ları aynalanmaz. `15` oyuncunun sol bileği, `16` sağ bileğidir; eski eşleştirici değişmedi. Ham PNG önden görülen çocuktur: onun anatomik sağı, resmin solundadır.

Varsayılan **Ayna · kameramla aynı**, PNG'nin tamamını yatay yansıtır. Böylece oyuncunun aynalanmış kamera görüntüsü ile gösterimdeki el aynı ekran yönünde hareket eder. Bu yalnızca sunum dönüşümüdür; hareket kimliği ve kabul koşulları değişmez. Her sağ/sol hareketin kendi ayrı doğru PNG'si vardır; tek bir diz veya omuz görseli iki farklı görev için yeniden etiketlenmez.

**Karşıdan · çizimin aslı**, PNG'yi yansıtmadan gösterir. Tercih test ekranından değiştirilir ve cihazda hatırlanır. `docs/HAREKET_ESLESTIRME.md` her iki elin görevini listeler.

## PNG'ler ve oynatma

- Üç yüklenmiş orijinal görsel `public/sprites/originals/` altında **baytları değişmeden** saklanır; SHA-256 kayıtları `sprite-source-manifest.json` içindedir.
- Orijinal nötr duruş, yıldız pozu ve alkış hazırlığı gerçek animasyon kareleri olarak kullanılır. Yanlış temas gösteren bir kare, başka bir hareketin yerine atanmadı.
- Eksik geçiş ve hedef pozları aynı karakter tasarımıyla entegre görsel üretim aracı kullanılarak tamamlandı. Kullanılan tam istemler `sprite-generation-prompts.json` içindedir; kaynak atlaslar `public/sprites/generated-atlases/` altında korunur.
- Her hareket başlangıç → geçiş → hedefte bekleme → dönüş → nötr sırasını oynatır. Gösterim süreleri mevcut bölüm motorunun 68–144 BPM slotlarına bağlıdır; bölüm sayıları ve diziler değişmez. Test ekranı daha yavaş 2,4 saniyelik döngü kullanır.
- Kareler aynı ayak hizasına yerleştirilir. Kollar ayrı şekillerle çizilmez, kemik/uzuv esnetilmez, en–boy oranı ve kıyafet renkleri korunur. Karakterlere oyuncu rengi filtresi uygulanmaz; oyuncu alanlarının renkleri ayrıdır.
- Çalışma sırasında **8 PNG görüntüsü bir kez yüklenir ve paylaşılır**. Atlas koordinatları `public/sprites/runtime-frames.json` içindedir. 1/2/3 oyuncu aynı önbelleği kullanır; her oyuncunun animasyon zamanı bağımsızdır. Kare veya boyut değişmediğinde yeniden karakter çizimi yapılmaz.
- Hazır, ayrı 1024×1024 PNG kareleri de pakettedir. Bunlar düzenleme/denetim içindir; oyun hepsini ayrı ayrı indirmez.
- Görsel yüklenemediğinde oyun açıklayıcı mesaj gösterir ve başlatmayı bekletir; geometrik bir çocukla sessizce değiştirmez.

## Önizlemeler

`docs/previews/` içinde:

- `Ritim-Oyun-3-Kisi.jpg`: tarayıcıda çalışan gerçek üç kişilik **kamerasız arayüz testi**. Kamera tanıma testi değildir.
- `Ritim-Sag-Sol-Karsilastirma.jpg`: omuz hareketleri yan yana.
- `Ritim-Uc-Oyuncu-Onizleme.jpg`: sprite test ekranında üçlü ölçek.
- `13-hareket-hedef-pozlar.png`: bütün hedef pozları.
- `Ritim-Animasyon-Onizleme.gif`: oyunda kullanılan PNG karelerinden oluşturulmuş kısa sprite önizlemesi. Tarayıcı video kaydı değildir.

## Doğrulama ve sınırlar

**19 otomatik test geçti.** PNG bütünlüğü/şeffaf kenarlar, ayrı 13 hedef, atlas sınırları, oran koruma, eski kaynakların SHA-256 eşleşmesi, bölüm zamanlaması, gizli cevap, mevcut eşleştiricide 13 doğru poz, çoklu kişi ve bağımsız ilerleme kapsanır.

Tarayıcıda bütün 13 hareket seçilip hedef kareleri denetlendi. 1/2/3 kişilik arayüz, sağ–sol karşılaştırma, ayna seçimi, ipucu, sonraki adımda cevabı gizleme ve oyuncuların bağımsız puan/ilerlemesi kontrol edildi. Ayrıntılı kayıt `docs/VALIDATION.md` ve `docs/browser-checks.json` içindedir.

**Gerçek webcam ile insan hareket doğruluğu, çocuklarla 2–3 metre okunabilirlik testi, hedef Mac'in FPS'i ve fiziksel gecikme ölçülmedi.** Bunlar başarılıymış gibi sunulmaz. Çizimlerin ekrandaki pozları incelendi; bir çocuğun açıklama okumadan doğru hareketi taklit etmesi gerçek kullanıcı kabul testi gerektirir. Kabul listesi `docs/SAHA_TESTI.md` içindedir.

## Lisans ve kaynak

Özgün kod MIT lisanslıdır. Kullanıcının sağladığı PNG'ler ve onlardan üretilmiş poz varyantları harici bir karakter paketi olarak sunulmaz; bunlara yanlış biçimde CC0 etiketi eklenmedi. Görsel kaynak kaydı `public/sprites/ASSET_NOTICES.md` içindedir. MediaPipe 0.10.32, mevcut modeller/WASM ve lisans metinleri korunur. TypeScript **Apache-2.0**, Vite **MIT** lisanslıdır. Ayrıntılar `THIRD_PARTY_NOTICES.md` ve `public/licenses/` altında bulunur.


## v1.3 — 3 farklı çocuk karakter ve hareket doğrulama

- 1 oyuncu: mavi kıyafetli erkek (mevcut karakter).
- 2 oyuncu: mavi erkek + gönderilen turkuaz kıyafetli kız.
- 3 oyuncu: mavi erkek + turkuaz kız + gönderilen yeşil kıyafetli erkek.
- Gönderilen iki özgün şeffaf PNG sheet'i `public/sprites/characters/*/uploaded-original.png` içinde korunur. Nötr, eller belde ve alkış pozları kaynak sheet'ten doğrudan alınmıştır. Diğer 10 hareket pozu, mevcut işlevsel poz çizimlerinin karaktere göre yeniden renklendirilmesi ve gönderilen karakterlerin yüz/saçlarının uygulanmasıyla oluşturulmuştur. Bu kareler çizim kalitesi açısından ayrıca iyileştirilebilir.
- Poz kabul eşikleri azaltıldı; hedef olmayan el de inceleniyor. Sürekli doğru poz onayı 320 ms. Çocukların normal hareketleri için yine ölçülü tolerans var.
- Yarışmada **ilk bitiren** anında kazanır; bitirmeyen diğer oyuncuların kalan aşamaları sonuç ekranında belirtilir.
- Her oyuncunun mevcut ritmi için 5 saniyelik tekrar kuralı ve yerel aşama kaydı korunur.

### Hızlı başlangıç

```sh
npm install
npm run dev
```

**Kontrol:** `npm test` ile hareket mantığı, kazanma kuralı ve PNG bütünlüğü test edilir.
