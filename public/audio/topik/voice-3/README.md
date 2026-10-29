# Seçilen oyun sesi: üçüncü varyant

Kullanıcının seçtiği üçüncü sentetik sincap sesi. Referans ve okuma tohumu
3637895427 korunmuştur. On oyun mesajı, toplam 22 cümle olarak ayrı ayrı
üretilip ilgili mesajlar için birleştirilmiştir. Model ve motor yalnız
hazırlık sırasında kullanılır; oyun bu yerel MP3 dosyalarını çalar.

Perde/hız değişmedi. Hafif 75 Hz yüksek geçiren ve 11 kHz alçak geçiren
süzgeçler, 2,8 kHz'de +1,5 dB netlik ayarı ve -21 LUFS hedefi uygulandı.
Bu hedef, dinleme örneklerinin -18 LUFS hedefinden 3 dB daha düşüktür.
Oyun oynatıcısının düzeyi de 0,85'ten 0,8'e düşürüldü.

Üretim komutu: `.tools/vox/.venv/Scripts/python.exe scripts/generate-selected-topik.py`.
VoxCPM2 kalite ayarları: 16 adım, cfg 2.0. Ayrıntılar manifest.json dosyasında.
