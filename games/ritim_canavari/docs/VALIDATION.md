# Doğrulama kaydı · 25 Ekim 2026

Kaynak taban: `Ritim-Canavari-Webcam-1-2-3-Kisilik-v1.1-guncel.zip`. Bu sürüm yalnızca karakter sunumu, PNG varlıkları ve test/rehber katmanını günceller.

## Otomatik

- `npm test`: **19 test geçti**. Orijinal altı test korunur.
- PNG'ler Node zlib ile açılır; kesik PNG, eksik tarama satırı ve yanlış format reddedilir. Bütün ayrı kareler 1024×1024 RGBA'dır; baş, eller ve ayakkabılar çevresinde şeffaf pay bulunur.
- 13 ayrı hedef PNG'nin içerik özetleri farklıdır. Her hareketin geçiş ve hedef kaynağı vardır. Diz/omuz/karışık kol görevleri aynı görselle karşılanmaz.
- Atlas dikdörtgenleri gerçek kaynak sınırları içindedir. Kaynak ve hedef oranı eşittir. Çalışma önbelleğinde 8 ayrı PNG kaynağı kullanılır.
- Üç yüklenmiş orijinal PNG'nin SHA-256 değerleri aynı kalır.
- `moves.ts`, `engine.ts`, `audio.ts`, `vision/` dosyaları ve model/WASM/JS vendor dosyaları taban sürümle bayt düzeyinde aynıdır. Özetler `baseline-sha256.json` içindedir.
- 13 pozun el–hedef sözleşmeleri değişmemiş `matchMove` tarafından kabul edilir. Sağ/sol eşleri ters hareket olarak kabul edilmez. Bunlar sentetik landmark testleridir.
- Hafıza aşamasında karakterin cevabı göstermediği; ipucunun yalnızca mevcut adıma bağlandığı; demo başlangıcının ve son beklemesinin nötr olduğu; tüm 10 bölüm slotunun doğru hareketi seçtiği denetlenir.
- Son bölümün 630 ms slotunda hedef poz 210 ms'den uzun gösterilir. Bu görsel süre kontrolüdür; çocuk okunabilirlik ölçümü değildir.
- 1/2/3 oyuncu için küçük ve büyük Canvas ölçülerinde kare kadrajı korunur, en–boy oranı bozulmaz.
- TypeScript tür kontrolü ve Vite üretim derlemesi geçer. ZIP paketlenirken CRC ve dosya içeriği eşleşmesi ayrıca denetlenir.

## Tarayıcı

Chrome önizlemesinde:

- 13 hareket sırayla seçildi; her birinde `Hedef pozu tut` düğmesi ilgili `*-target` karesini gösterdi.
- Omuz pozları sağ/sol yan yana görüldü. Ayna ve orijinal çizim yönü değiştirildi.
- Test ekranının üç oyuncu ölçeği incelendi; üç ayrı kare ve aynı doğru hareket vardı.
- Ana oyun kamerasız test modunda 1/2/3 oyuncuyla başlatıldı. İlgili sayıda karakter, kamera alanı, puan ve aşama paneli oluştu.
- Tek oyuncuda hafızadan uygulama sırasında nötr duruş; ipucunda ilgili animasyon; sonraki adımda tekrar nötr duruş görüldü. Ritmi tekrar izleme düğmesi kullanıldı.
- Üç oyuncuda yalnızca birinci oyuncunun test adımı ilerletildi. Onun puanı ve adımı değişirken diğer ikisi 0 puan/ilk adımda kaldı. Birinci oyuncunun ipucu diğer iki karakteri açmadı.
- Gerçek arayüz ekran görüntüleri `docs/previews/` içindedir. Ekrandaki kameralar test modunda yer tutucudur; gerçek video veya insan ölçümü değildir.

Makine tarafından okunabilir tarayıcı kaydı: `browser-checks.json`.

## Test edilmeyenler

- Fiziksel webcam ile kamera izni/başlatma, yeni PNG'leri taklit eden gerçek çocukların hareket tanıma doğruluğu ve üç gerçek kişinin örtüşmeli takibi.
- Hedef Mac'in FPS'i, CPU/GPU tüketimi, çıkarım p95 veya fiziksel hareket–ekran gecikmesi.
- 2–3 metre uzaktan ve 5–12 yaş grubunda açıklamasız anlama oranı.
- Gerçek mobil cihaz ve çok farklı ekranların tamamı. Küçük boyutların kadraj matematiği ve üçlü masaüstü görünümü kontrol edildi; bu gerçek cihaz testi yerine geçmez.
- Kamerayla oynayıp tarayıcıyı kapatarak yeniden açılan fiziksel kayıt oturumu. Mevcut kayıt anahtarı ve kaydetme/yükleme kodu korunur.

Bu alanlar otomatik/sentetik test sonuçlarına dayanılarak başarılı sayılmaz. Saha adımları `SAHA_TESTI.md` içindedir.
