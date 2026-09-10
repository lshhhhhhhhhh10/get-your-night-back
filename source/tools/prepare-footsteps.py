"""裁剪已核实 CC0 录音。输入下载到临时目录；不在运行时下载。
python3 source/tools/prepare-footsteps.py /tmp/night-back-audio-v12
原网页、输入格式与链接见 assets/audio/README.md。
"""
import array
import json
import subprocess
import sys
import wave
from pathlib import Path

base = Path(sys.argv[1])
output = Path(__file__).resolve().parents[2] / 'assets/audio'
clips = {'wood': ('wood.wav', [.55, 1.1, 2.125, 2.65]),
         'carpet': ('carpet.mp3', [.63, 1.255, 2.155, 4.205]),
         'tile': ('tile.mp3', [2.43, 3.205, 6.78, 7.73])}
report = []
for surface, (original, offsets) in clips.items():
    for number, offset in enumerate(offsets, 1):
        temp = base / 'cut.wav'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                        '-i', str(base / original), '-ss', str(offset), '-t', '0.46',
                        '-af', 'highpass=f=65,lowpass=f=8500', '-ac', '1', '-ar', '32000', str(temp)], check=True)
        with wave.open(str(temp)) as audio:
            samples = array.array('h', audio.readframes(audio.getnframes()))
        scale = min(14, .72 * 32767 / max(1, max(map(abs, samples))))
        for i, value in enumerate(samples):
            envelope = min(1, i / 160, (len(samples) - i - 1) / 960)
            samples[i] = round(value * scale * envelope)
        filename = f'step-{surface}-{number}.wav'
        with wave.open(str(output / filename), 'w') as audio:
            audio.setparams((1, 2, 32000, 0, 'NONE', 'not compressed'))
            audio.writeframes(samples.tobytes())
        report.append({'file': filename, 'input': original, 'offset': offset, 'duration': .46, 'gain': round(scale, 5)})
print(json.dumps(report, indent=2))
