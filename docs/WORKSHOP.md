# 2. Bölüm — Geri Dönüşüm Atölyesi

1. bölümde atıklar ayrıldıktan sonra Topik bitiş konuşmasını yapar ve oyun
kendiliğinden atölyeye geçer (sonuç ekranındaki **Atölyeye Geç 🎨** ile hemen
de geçilebilir). El modunda kamera açık kalır; yeniden alan ayarı gerekmez.
Menüdeki **🎨 Doğrudan Atölyeye Git** öğretmenin atölyeyi tek başına
açmasını sağlar.

## Akış (her eser için)

1. **Topla** — Solda üç malzeme durur; gereken ikisi parlar. Topik hangilerini
   alacağını söyler. Yumruk yap → tezgaha taşı → elini aç. Yanlış malzeme
   nazikçe tepsiye döner, puan kaybı yoktur.
2. **Birleştir** — İki malzeme tezgaha gelince büyük sihirli düğme çıkar.
   Üzerinde yumruk yapmak yeterlidir; yıldızlarla yeni eser belirir.
3. **Boya (isteğe bağlı)** — "İstersen boyayabiliriz" der; solda altı boya
   kutusu çıkar. Boya kutusunda yumruk yap, yumruğu açmadan resmin üstünde
   gezdir. Kolun ucundaki renkli nokta seçili rengi gösterir; Topik rengin
   adını söyler. Her elin kendi rengi olabilir. Kapalı yumrukla başka bir boya
   kutusunun üstünden geçmek rengi değiştirir.
4. **Bitti ✓** — Topik eseri över, sıradaki esere geçilir.

Üç eserden sonra **sergi** ekranı açılır: boyanan eserler yan yana görünür;
**Yeniden Oyna** veya **Ana Menü** de el ile seçilebilir.

Eserler: Robot (karton kutu + içecek kutusu), Kalemlik (konserve kutusu +
kâğıt), Oyuncak araba (plastik şişe + kavanoz kapağı), Kavanoz fener (cam
kavanoz + kâğıt torba). 1. bölümde toplanan atıklarla yapılabilen eserler önce
seçilir.

Çocuk 15 saniye ilerleme yapmazsa Topik talimatı yeniden söyler. Fare modu ve
"bekleterek tut" yöntemi de çalışır (bekleme modunda boya tek dokunuşla sürülür).

## Ses

Yeni Topik cümleleri için hazır MP3 yoktur; tarayıcıda Türkçe sistem sesi
varsa onunla okunur, yoksa yalnızca konuşma balonu görünür. Kalıcı ses için
`src/workshop/scene.ts` içindeki `workshopSpeech` ve `src/workshop/recipes.ts`
cümleleri mevcut ses üretim betiğiyle `public/audio/topik/voice-3/` altına
üretilip `src/mascot.ts` içindeki `voiceClips` listesine eklenebilir.

## Kod

- `src/workshop/recipes.ts`: tarifler, boyanabilir SVG bölgeleri, renkler.
- `src/workshop/world.ts`: durum makinesi ve isabet alanları (1280×720).
- `src/workshop/scene.ts`: görünüm, Topik konuşmaları, fare bağlantısı.
- `MotionInput.useWorld()`: aynı el girişi önce ayırma oyununu, sonra atölyeyi sürer.

## Doğrulama

- `npm.cmd test`: atölye durum makinesi ve el girişi testleri dahil.
- `npm.cmd run build` ardından `node scripts/workshop-browser-test.mjs`:
  gerçek yerel model sahte kamerada çalışır, el noktaları test tarafından
  değiştirilir; yalnız el ile üç eser + sergi + menü akışı doğrulanır.
  Gerçek kamerada doğruluk ve çocuk kullanılabilirliği ayrıca denenmelidir.

## El kimliği iyileştirmesi (bu aşamada)

Yumruk yaparken başparmak gizlenince model sağ/sol etiketini ters
çevirebiliyordu; artık iki el önce konum sürekliliğiyle eşleştirilir, etiket
ancak sonra kullanılır (görünür başparmak kanıtı yine önceliklidir). Modelin
etiket kuralı ayrık iki elden oturum başına bir kez öğrenilir; kollar doğru
kenardan gelir. Yakalama yarıçapı, kutu payı ve hızlı hareket toleransı
küçük eller için biraz genişletildi.
