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
   kutusu çıkar. Boyayı **başparmak ve işaret parmağıyla tut** (yumruk da
   olur), boyamak istediğin parçanın üstüne götür: o parça sarı kenarla
   parlar. Parmaklarını açınca **parçanın tamamı** o renge boyanır. Taşırken
   hiçbir şey boyanmaz, böylece yanlış yer boyanmaz. Hedef parçanın adı
   ("Kafa", "Tekerler"…) üstünde yazar. Boyanmamış parçalar noktalı desenle
   belli olur. Eserler tanınır çizimlerdir ve 5–6 anlamlı parçadan oluşur.
   Topik seçilen rengi söyler ("Kırmızı seçtin!"); her elin kendi rengi olabilir.
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

Topik atölyede de 1. bölümdeki **aynı sesle** konuşur: 29 cümle aynı ses kartı
ve okuma tohumuyla (VoxCPM2, varyant 3, tohum 3637895427) üretilip
`public/audio/topik/voice-3/ws-*.mp3` olarak eklendi. Uzun mesajlar (ör.
karşılama + ilk talimat) kayıtlı cümlelerin art arda çalınmasıyla söylenir.
Tarayıcının sistem sesi artık hiç kullanılmaz; kaydı olmayan bir cümle
yalnızca konuşma balonunda görünür.

Cümle değişirse `src/workshop/speech.ts` / `src/workshop/recipes.ts` düzenlenir ve
yeniden üretilir (yerel motor `.tools/vox` gerekir, git'e girmez):

```powershell
.tools\vox\.venv\Scripts\python.exe scripts\generate-selected-topik.py --workshop
```

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

## Sağ/sol: başparmak yönü (3. tur)

- Her el için bir taraf puanı biriktirilir. Başparmak yönü 2 puan sayılır:
  avuç kameraya dönükken, aynalanmamış kamera görüntüsünde sağ elin başparmağı
  +x yönündedir (`thumbAnatomy`).
- Modelin sol/sağ etiketi 1 puan sayılır, ama ancak oturum içinde başparmakla
  karşılaştırılıp etiket kuralı öğrenildikten sonra (`labelConvention`).
  Böylece modelin aynalı ya da aynasız etiket kuralı fark etmez.
- Kolun hangi kenardan geleceği bu puanla belirlenir. Sağ el atölyedeki
  sol taraftaki malzemelere uzansa da sağ kol kalır. Puan henüz yetersizse
  ekran konumu kullanılır.
- Sınır: tek kamerada sağ avuç içi ile sol el sırtı aynı görünür; ölçüm
  avucun kameraya dönük olduğunu varsayar (oyunun kullanım biçimi budur).
  El sırtı uzun süre kameraya dönük kalırsa puan yavaşça yanlış tarafa kayabilir.
- Üst üste binmede taşıyan el artık etiketle değil konumla bulunur. Model iki
  ele aynı etiketi verse de, eller oraya kesintisiz geldiyse kimlik korunur.

## Hareket ve iki el iyileştirmesi (2. tur)

- İmleç/kol konumu One Euro filtresiyle yumuşatılır: el dururken titremez,
  bilinçli harekette gecikme azdır (`smoothCutoff`, `smoothBeta`).
- İki avuç üst üste binince **atık taşıyan el** görünür kalır; diğeri geçici
  olarak gizlenir. Taşıyan el kısa süre kaybolursa taşıma hemen iptal olmaz.
- Taşıyan el bir kutunun üstündeyken kaybolursa (ör. diğer elin arkasında
  kaldıysa) 0,25 sn sonra atık o kutuya bırakılır; kutu dışında kaybolursa
  önceki gibi güvenle iptal edilir.
- Kolun hangi kenardan geleceği artık modelin sol/sağ etiketine değil elin
  ekrandaki konumuna bağlıdır: ekranın solundaki el her zaman sol koldur.

## El kimliği iyileştirmesi (1. tur)

Yumruk yaparken başparmak gizlenince model sağ/sol etiketini ters
çevirebiliyordu; artık iki el önce konum sürekliliğiyle eşleştirilir, etiket
ancak sonra kullanılır (görünür başparmak kanıtı yine önceliklidir). Modelin
etiket kuralı ayrık iki elden oturum başına bir kez öğrenilir; kollar doğru
kenardan gelir. Yakalama yarıçapı, kutu payı ve hızlı hareket toleransı
küçük eller için biraz genişletildi.
