# Sincap Topik: üç yeni ses denemesi

VoxCPM2 ile tariften tasarlanmış üç bağımsız sentetik ses. Gerçek bir kişinin
sesi kopyalanmadı. Her varyant aynı beş oyun cümlesini kendi referansı ve sabit
tohumuyla okur; tek parça uzun üretim yerine cümle cümle üretilip birleştirildi.

- Kalite: 16 adım, cfg 2.0.
- Oyun örnekleri: `voice-1.mp3`, `voice-2.mp3`, `voice-3.mp3`.
- Üretim bilgisi, tohumlar, metinler ve süreler: `manifest.json`.
- Dinleme: `/voice-auditions.html`.
- Kaynak: https://github.com/alexturkey/voxcpm2-turkce-ses-tasarimi
- Hazırlık aracı: `scripts/prepare-topik-auditions.py`; `.tools/vox` ve onaylı
  yerel model kurulumu gerektirir. Oyun bu modeli veya motoru çalıştırmaz.

Ses seviyesi karşılaştırma için -18 LUFS hedefiyle normalize edildi. Perde
değişikliği veya hızlandırma uygulanmadı. Nihai ses kullanıcı seçimine bağlıdır.
