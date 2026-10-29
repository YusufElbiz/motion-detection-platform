# Topik ses dosyaları

Oyun için önceden sentezlenmiş altı kısa Türkçe konuşma. Oyun yalnızca bu
yerel MP3'leri çalar; çalışma sırasında konuşma servisine bağlanmaz.

Üretim aracı: https://github.com/rany2/edge-tts (7.3.1, yalnız hazırlık aracı).
Ses: Microsoft tr-TR-EmelNeural. Hız +8%, perde +24Hz, üretim sesi -8%.
Üretim tarihi: 25 Ekim 2026. Cümleler manifest.json dosyasındadır.
Karakter sesi sinirsel sentezdir; insan kaydı veya ses klonu değildir.

Yeniden üretim: `python scripts/generate-topik-voice.py`.
