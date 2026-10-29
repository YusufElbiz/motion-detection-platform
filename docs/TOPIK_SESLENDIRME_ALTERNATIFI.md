# Topik için yeni seslendirme yönü

Mevcut VoxCPM2 kayıtları kullanıcı tarafından yeterince doğal bulunmadı.
Sonraki alternatif, aynı sesi tekrar inceltmek yerine farklı bir seslendirme
altyapısında kısa bir oyunculuk denemesi veya bir insanın karakter yorumu.

## Dinlenebilecek alternatif

[ElevenLabs Türkçe demo](https://elevenlabs.io/text-to-speech/turkish):
Türkçe sayfasında Doga ve karakter kategorisinde Mark örnekleri bulunuyor.
İsimler bu araştırma tarihinde listelenmiş seçeneklerdir; Topik'e uygunlukları
dinlenerek değerlendirilmelidir. Yeni bir ses tasarlamak için
[Voice Design](https://elevenlabs.io/docs/overview/capabilities/voices)
özelliği de kullanılabilir. Hesap/servis bağlantısı olmadığı için burada
ElevenLabs ile ses üretildiği iddia edilmez.

## Hazır ses tasarımı tarifi

> Native Turkish, Istanbul accent. A warm young adult performer voicing an
> original friendly little squirrel for a preschool game. Soft, rounded,
> clear mid-high voice, natural breath and conversational phrasing, smiling
> gently. Youthful personality without a forced baby voice. Playful and
> reassuring, with subtle expressive variation and short natural pauses.
> No squeaky chipmunk effect, no shouting, no announcer cadence. Clean dry
> studio recording, no music or effects.

Önce yalnız şu üç kısa cümleyle deneme yapılmalı. Beğenilirse on oyun mesajı
aynı sesle hazırlanmalı; yeni uzun kayıtlar için önce ses seçilmeli.

1. Gülümseyerek, arkadaşa seslenir gibi: **Merhaba! Ben Topik. Birlikte oynayalım mı?**
2. Azarlamadan, davet eder gibi: **Camlar buraya... yeşil kutuya. Haydi, birlikte!**
3. Küçük ama içten bir sevinçle: **İşte bu! Harika yaptın!**

Eleven v4/v3, ifade yönlendirmesi için ses etiketleri destekler:
[resmî açıklama](https://elevenlabs.io/docs/help-center/product/core-capabilities/text-to-speech/how-do-audio-tags-work-with-eleven-v3-and-v4).
Etiketler motorun her seste aynı sonucu vereceği garantisi değildir. Kısa deneme:

```text
[curious] Merhaba! Ben Topik. Birlikte oynayalım mı?
[gently] Camlar buraya... yeşil kutuya. Haydi, birlikte!
[happy] İşte bu! Harika yaptın!
```

İnsan tarafından okunacaksa köşeli etiketler okunmaz; yukarıdaki oyunculuk
yönlendirmeleri kullanılır. Çocuk sesi taklidi yerine sıcak bir yetişkinin
sevimli karakter yorumu denenebilir. Doğal oyunculuk beğenisi kullanıcıya aittir.

Teslim: her cümle ayrı WAV/MP3, müziksiz, yankısız; cümle başı/sonu kesilmesin.
Tek dosya ise aralarda iki saniye boşluk bırakılması ayrıştırmayı kolaylaştırır.
Gelen kayıt oyuna yerel dosya olarak eklenebilir; oyun seslendirme servisine
çalışma sırasında bağlanmaz.
