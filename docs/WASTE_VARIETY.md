# Atık çeşitleri ve karışık düşme düzeni

Bu değişiklik yalnız atık içeriği ve nesne üretim düzeniyle ilgilidir. El takibi/işlemci/filtre/hareket eşikleri bu görevde değiştirilmedi.

## 16 nesne

| Malzeme | Görseller |
| --- | --- |
| Plastik | Şişe, boş deterjan şişesi, boş yoğurt kabı, plastik bardak |
| Kağıt | Kağıt, gazete, karton kutu, kağıt torba |
| Cam | Şişe, kavanoz, kahverengi şişe, sos şişesi |
| Metal | İçecek kutusu, konserve kutusu, kavanoz kapağı, alüminyum kap |

`src/waste.ts` nesne kimliği, malzemesi, Türkçe adı ve özgün SVG çizimlerini tutar. Önceki dört görsel korundu; aynı tarzda on iki ek çizim eklendi. Dış görsel, model, font veya bağımlılık indirilmedi. Görsel önizlemesi: [katalog](waste-catalog.html), [ekran görüntüsü](screenshots/waste-catalog.png).

## Düşme düzeni

Önceki üretici kategoriyi `spawned % 4`, x konumunu sabit artan bir formülle seçiyordu. İkisi de üretim sırasına bağlıydı; görünür desen oluşabiliyordu. Yeni üreticide:

- Her dört nesnede tüm malzemeler birer kez, rastgele sırayla gelir.
- Her malzemenin dört görseli kendi torbasından rastgele ve tekrarsız seçilir; torba bitince yenilenir.
- x konumu kategori/kutu bilgisi kullanılmadan 110–1170 mantıksal piksel arasında seçilir.
- Diğer nesnelerden mümkünse en az 125 piksel yatay boşluk bırakan konum seçilir; 12 denemede bulunamazsa denenen en açık yer kullanılır.
- Düşme hızı, ekrandaki nesne sınırı ve sekiz yıldızlık tur korunur. Nesneler yerde bekler; kendiliğinden kutuya girmez veya puan üretmez. Rastlantısal olarak doğru kutunun hizasına gelen nesne olabilir; sabit kategori→sütun ilişkisi yoktur.

Her atığın Türkçe adı erişilebilir etikete ve yanlış kutu geri bildirimine bağlandı. Böylece karton kutu veya cam kavanoz da kendi adıyla anılır. Kutu üzerindeki tanıtıcı mevcut örnek ikonlar korunur.

Rastgele yeni turda eski DOM kimlikleri yeniden kullanılabildiği için önceki turun görseli/etiketi kalabiliyordu. Render yolu artık kategori veya varyant değişimini denetleyip ikon, ad ve dataset alanlarını birlikte yeniler. Fare tarayıcı testi, bir turu plastikle başlatıp yeniden başlatmada metale geçişi zorlayarak bu regresyonu doğrular.

## Dosyalar

- Yeni: `src/waste.ts`, `scripts/waste-art-preview.mjs`, katalog HTML/PNG ve bu belge.
- Güncel: `src/game.ts`, `src/art.ts`, `src/scene.ts`.
- Testler: `tests/game.test.ts`, `tests/fist.test.ts`, `tests/motion.test.ts`; üç tarayıcı senaryosu.

Rastgele üretim için testlere RNG enjekte edilebilir. Eski etkileşim birim testleri malzeme sırasına değil kendi sabit test verilerine dayanır. Tarayıcı testleri artık ilk nesnenin plastik/ikinci nesnenin kağıt olduğunu varsaymaz; gerçek `data-category` alanından doğru ve yanlış kutuyu seçer. İki elin test yolları rastgele nesne konumlarında birbirini örtmeyecek şekilde düzenlenir; oyunun örtüşme kuralları değiştirilmez.

## Doğrulama

- **97/97 birim testi PASS**: kategori dengesi ve karışması, 16 görselin çeşitliliği, malzeme/variant eşleşmesi, bağımsız x konumu, boş sütun tercihi, her görselin doğru sınıflandırılması ve önceki tüm testler.
- TypeScript, üretim derlemesi ve yerel varlık hash kontrolü **PASS**.
- SVG kataloğu Chrome ile çizildi ve görsel olarak kontrol edildi.
- Fareyle tam tur ve motion tarayıcı kontrolleri **PASS**.
- İki el yumruk tarayıcı kontrolü **PASS**: rastgele malzemelerde bağımsız tutma/bırakma, doğru/yanlış kutu ve alternatif geometri modu doğrulandı.
- Kurtarma kopyasıyla hash karşılaştırması: `src/motion`, `src/tracking`, `src/gesture-lab` altında **0 değişiklik**.

Geri dönüş kopyası: `recovery/before-waste-variety-*`.
