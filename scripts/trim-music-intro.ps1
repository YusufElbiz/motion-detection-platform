# Keep the user-supplied original intact; remove only the duplicated spoken name.
$ErrorActionPreference = 'Stop'
& ffmpeg -hide_banner -loglevel error -y -i public/audio/music/dogaya-dost-ol.mp3 -filter_complex '[0:a]asplit=2[a][b];[a]atrim=end=6.88,asetpts=PTS-STARTPTS[before];[b]atrim=start=8.30,asetpts=PTS-STARTPTS[after];[before][after]acrossfade=d=0.14:c1=tri:c2=tri[out]' -map '[out]' -codec:a libmp3lame -b:a 192k public/audio/music/dogaya-dost-ol-no-intro.mp3
if ($LASTEXITCODE -ne 0) { throw 'Music edit failed' }
