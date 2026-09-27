import json
import subprocess
from pathlib import Path
import numpy as np

work = Path(__file__).parent
ffmpeg = r'D:\Programs\FFmpeg8\bin\ffmpeg.exe'
source = work.parent / 'reference.mp4'
final = work.parent / 'milly-v3-35s-comparison.mp4'

def pcm(path, start, duration):
    args = [ffmpeg, '-v', 'error', '-ss', str(start), '-t', str(duration), '-i', str(path),
            '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', 'pipe:1']
    return np.frombuffer(subprocess.check_output(args), dtype=np.float32)

first = pcm(final, 0, 4.9)
src = pcm(source, 0, 3)
dst = pcm(final, 5, 3)
n = min(len(src), len(dst))
report = {
    'intro_peak': float(np.max(np.abs(first))),
    'source_rms': float(np.sqrt(np.mean(src[:n] ** 2))),
    'comparison_rms': float(np.sqrt(np.mean(dst[:n] ** 2))),
    'audio_correlation': float(np.corrcoef(src[:n], dst[:n])[0, 1]),
}
print(json.dumps(report, indent=2))
assert report['intro_peak'] < 1e-5
assert report['audio_correlation'] > .98
