"""裁剪已核实 CC0 HQ 试听；输入目录及来源见 assets/audio/README.md。"""
import array
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

base = Path(sys.argv[1])
output = Path(__file__).resolve().parents[2] / 'assets/audio'
report = []
clips = [(f'floor-creak-{i}.wav', f'wood{v}.mp3', 0, None, .72)
         for i, v in enumerate([7, 9, 6], 1)]
clips += [('snore-real.wav', 'snore.mp3', 6.1, 1.7, .78),
          ('washer-spin.wav', 'washer.mp3', 16, 6, .72)]
for filename, original, start, duration, peak in clips:
    cmd = ['ffmpeg', '-v', 'error', '-i', str(base / original), '-ss', str(start)]
    if duration:
        cmd += ['-t', str(duration)]
    cmd += ['-af', 'highpass=f=65,lowpass=f=9000', '-ac', '1', '-ar', '32000', '-f', 's16le', '-']
    samples = array.array('h', subprocess.check_output(cmd))
    trim = 0
    if filename.startswith('floor'):
        threshold = max(map(abs, samples)) * .018
        nonzero = [i for i, s in enumerate(samples) if abs(s) > threshold]
        trim = max(0, nonzero[0] - 160)
        samples = samples[trim:min(len(samples), nonzero[-1] + 1600)]
    scale = peak * 32767 / max(1, max(map(abs, samples)))
    # 录音细节和呼吸起伏保留，仅切边淡入淡出与统一峰值。
    for i, value in enumerate(samples):
        fade = min(1, i / 160, (len(samples) - i - 1) / 960)
        samples[i] = round(value * scale * fade)
    with wave.open(str(output / filename), 'w') as audio:
        audio.setparams((1, 2, 32000, 0, 'NONE', 'not compressed'))
        audio.writeframes(samples.tobytes())
    report.append(dict(file=filename, source=original, start=start+trim/32000,
                       duration=len(samples)/32000, gain=round(scale, 5),
                       rms=round(math.sqrt(sum(s*s for s in samples)/len(samples))/32768, 5)))
print(json.dumps(report, indent=2))
