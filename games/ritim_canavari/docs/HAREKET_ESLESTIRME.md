# Hareket → PNG → kabul edilen poz

Sağ/sol, oyuncunun kendi anatomik yönüdür. Ham çizim önden görünür; ayna sunumunda bütün kare yansıtılır. `src/game/moves.ts` değiştirilmedi.

| Kimlik | Sağ elin görevi | Sol elin görevi | Hedef PNG |
| --- | --- | --- | --- |
| clap | Sol avuçla göğüs önünde birleşir | Sağ avuçla birleşir | clap-target.png |
| cross | Sol omuz | Sağ omuz | cross-target.png |
| rightShoulder | Sol omuz | Aşağıda serbest | rightShoulder-target.png |
| leftShoulder | Aşağıda serbest | Sağ omuz | leftShoulder-target.png |
| leftHead | Sağ bel yanı | Baş | leftHead-target.png |
| rightHead | Baş | Sol bel yanı | rightHead-target.png |
| bothKnees | Sağ diz | Sol diz | bothKnees-target.png |
| rightKnee | Sol diz | Kendi bel yanında, dizlerden uzakta | rightKnee-target.png |
| leftKnee | Kendi bel yanında, dizlerden uzakta | Sağ diz | leftKnee-target.png |
| hips | Sağ bel yanı | Sol bel yanı | hips-target.png |
| star | Yukarı ve yana açık | Yukarı ve yana açık | star-target.png |
| rightHipLeftShoulder | Sağ bel yanı | Sağ omuz | rightHipLeftShoulder-target.png |
| leftHipRightShoulder | Sol omuz | Sol bel yanı | leftHipRightShoulder-target.png |

Karşı diz hareketlerinde serbest elin belde durması eski kabul koşullarına uygundur; iki elle dize dokunma görseli kullanılmaz. Karışık bel–omuz hareketlerinin kendi hedefleri vardır; iki elle çapraz kucak görseli kullanılmaz.

`sampleAnimation` başlangıç ve son nötr kareyi gösterir. Hazırlık için ilgili `*-prepare.png` atlas karesi, hedef için `*-target.png` kullanılır. Alkış hazırlığında ayrıca yüklenen orijinal PNG'den çıkarılmış `clap-source-prepare.png` kullanılır. Kare kaynakları/koordinatları `runtime-frames.json`, hazırlama işlemleri `slicing-report.json` içindedir.

Karelerin elle görsel denetimi yapıldı. Eşleştiriciye verilen sentetik landmark sözleşmeleri test edilir; bu, MediaPipe'ın bu çizimlerden veya gerçek çocuklardan hareket tanımasını ölçmek değildir.
