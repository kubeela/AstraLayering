$ErrorActionPreference = 'Stop'
$work = Split-Path -Parent $MyInvocation.MyCommand.Path
$v3 = Split-Path -Parent $work
$python = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$reference = Join-Path $v3 'reference.mp4'
$motion = Join-Path $work 'svg-motion.mp4'
$intro = Join-Path $work 'intro.png'
$labels = Join-Path $work 'labels.png'
$output = Join-Path $v3 'milly-v3-35s-comparison.mp4'

node (Join-Path $work 'render-svg.cjs') --samples
if ($LASTEXITCODE -ne 0) { throw 'SVG sample render failed' }
& $python (Join-Path $work 'make-art.py')
if ($LASTEXITCODE -ne 0) { throw 'Title and label render failed' }
node (Join-Path $work 'render-svg.cjs')
if ($LASTEXITCODE -ne 0) { throw 'SVG motion render failed' }

$filter = '[2:v]trim=duration=5,setpts=PTS-STARTPTS,format=yuv420p[title];[0:v]trim=duration=30,setpts=PTS-STARTPTS,crop=960:1080:0:0,format=yuv420p[ref];[1:v]trim=duration=30,setpts=PTS-STARTPTS,format=yuv420p[svg];[ref][svg]hstack=inputs=2[split];[split][3:v]overlay=shortest=1:format=auto,format=yuv420p[compare];[title][compare]concat=n=2:v=1:a=0[v];[0:a]atrim=duration=30,asetpts=PTS-STARTPTS,adelay=5000:all=1[a]'
ffmpeg -y -v warning -i $reference -i $motion -loop 1 -framerate 30 -t 5 -i $intro -loop 1 -framerate 30 -t 30 -i $labels -filter_complex $filter -map '[v]' -map '[a]' -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t 35 $output
if ($LASTEXITCODE -ne 0) { throw 'Final video encode failed' }
& $python (Join-Path $work 'verify.py')
if ($LASTEXITCODE -ne 0) { throw 'Audio verification failed' }
Write-Output $output
